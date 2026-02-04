const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Alarm = require('./src/models/Alarm');

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform';

// CSV文件路径
const CSV_FILE_PATH = path.join(__dirname, '..', '国内2026-1月故障列表.csv');

/**
 * 解析日期时间字符串
 * 支持格式: "1/1/2026 19:45:48" 或 "1/1/1970 00:00:00"
 */
function parseDateTime(dateStr) {
  if (!dateStr || dateStr === '1/1/1970 00:00:00') {
    return null;
  }

  // 解析 M/D/YYYY H:MM:SS 格式
  const parts = dateStr.split(' ');
  const dateParts = parts[0].split('/');
  const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0'];

  const month = parseInt(dateParts[0]) - 1; // JavaScript月份从0开始
  const day = parseInt(dateParts[1]);
  const year = parseInt(dateParts[2]);
  const hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);
  const second = parseInt(timeParts[2]);

  return new Date(year, month, day, hour, minute, second);
}

/**
 * 获取告警日期（只保留年月日）
 */
function getAlarmDate(dateStr) {
  if (!dateStr) return null;

  // 如果是 YYYY-MM-DD 格式（来自 CSV 的告警发生日期字段）
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JavaScript月份从0开始
    const day = parseInt(parts[2]);
    return new Date(year, month, day);
  }

  // 如果是 M/D/YYYY H:MM:SS 格式，解析后只保留日期
  const date = parseDateTime(dateStr);
  if (!date) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 根据设备和告警名称推断严重程度
 */
function inferSeverity(device, alarmName) {
  // 紧急停机、电池舱开门等严重告警
  const criticalKeywords = ['紧急停机', '电池舱开门', 'BMS通讯丢失', 'PCS通讯丢失'];
  // 设备故障类告警
  const errorKeywords = ['故障', '欠压', '欠频', '开路', '反馈'];
  // 通讯丢失类告警
  const warningKeywords = ['通讯丢失', '通信丢失', '连接超时', '数据库异常'];

  for (const keyword of criticalKeywords) {
    if (alarmName.includes(keyword)) return 'critical';
  }

  for (const keyword of errorKeywords) {
    if (alarmName.includes(keyword)) return 'error';
  }

  for (const keyword of warningKeywords) {
    if (alarmName.includes(keyword)) return 'warning';
  }

  return 'info';
}

/**
 * 从CSV导入告警数据
 */
async function importAlarmsFromCSV() {
  let connection;

  try {
    // 连接MongoDB
    console.log('正在连接MongoDB...');
    connection = await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功!');

    // 清空现有告警数据（可选）
    console.log('\n开始导入数据（不清空现有数据）...\n');
    // await Alarm.deleteMany({});
    // console.log('已清空现有告警数据');

    const alarms = [];
    const errors = [];
    let lineNumber = 0;

    // 读取CSV文件
    console.log(`\n正在读取CSV文件: ${CSV_FILE_PATH}`);

    return new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;

          try {
            const startTime = parseDateTime(row['告警开始时间']);
            const endTime = parseDateTime(row['告警结束时间']);
            const alarmDate = getAlarmDate(row['告警发生日期']);

            // 跳过无效数据
            if (!startTime || !alarmDate) {
              errors.push({
                line: lineNumber,
                reason: '无效的日期时间',
                data: row
              });
              return;
            }

            // 如果结束时间为1970-01-01（未结束的告警），设置为开始时间
            const finalEndTime = endTime && endTime.getFullYear() > 2000
              ? endTime
              : startTime;

            const alarm = {
              alarmDate: alarmDate,
              stationId: parseInt(row['电站id']),
              alarmId: row['告警id'],
              device: row['告警设备'],
              alarmName: row['告警名称'],
              startTime: startTime,
              endTime: finalEndTime,
              severity: inferSeverity(row['告警设备'], row['告警名称'])
            };

            alarms.push(alarm);
          } catch (error) {
            errors.push({
              line: lineNumber,
              reason: error.message,
              data: row
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`\nCSV文件读取完成，共读取 ${lineNumber} 行数据`);
            console.log(`成功解析: ${alarms.length} 条`);
            console.log(`解析失败: ${errors.length} 条`);

            if (errors.length > 0) {
              console.log('\n前5条错误记录:');
              errors.slice(0, 5).forEach(err => {
                console.log(`  行 ${err.line}: ${err.reason}`);
              });
            }

            // 批量插入数据
            if (alarms.length > 0) {
              console.log('\n正在批量插入告警数据到MongoDB...');
              console.log(`准备插入的告警数: ${alarms.length}`);
              console.log('第一条数据示例:', JSON.stringify(alarms[0], null, 2));

              try {
                // 使用 insertMany 并设置 ordered: false 以跳过重复项
                const result = await Alarm.insertMany(alarms, {
                  ordered: false
                });

                console.log(`✅ 成功插入 ${result.length} 条告警记录`);
              } catch (error) {
                if (error.code === 11000) {
                  // 部分重复的情况
                  const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
                  console.log(`⚠️  成功插入 ${insertedCount} 条记录，${alarms.length - insertedCount} 条记录因重复被跳过`);
                } else {
                  console.error('插入错误详情:', error);
                  throw error;
                }
              }

              // 统计信息
              console.log('\n📊 数据统计:');
              const totalCount = await Alarm.countDocuments();
              console.log(`  - 数据库总告警数: ${totalCount}`);

              const stationIds = await Alarm.distinct('stationId');
              console.log(`  - 涉及电站数: ${stationIds.length}`);
              console.log(`  - 电站列表: ${stationIds.sort((a, b) => a - b).join(', ')}`);

              const devices = await Alarm.distinct('device');
              console.log(`  - 设备类型: ${devices.join(', ')}`);

              // 按电站统计
              console.log('\n📈 各电站告警数统计:');
              const stationStats = await Alarm.aggregate([
                {
                  $group: {
                    _id: '$stationId',
                    count: { $sum: 1 },
                    devices: { $addToSet: '$device' }
                  }
                },
                { $sort: { _id: 1 } }
              ]);

              stationStats.forEach(stat => {
                console.log(`  - 电站 ${stat._id}: ${stat.count} 条告警，设备: ${stat.devices.join(', ')}`);
              });

              // 按设备类型统计
              console.log('\n🔧 各设备类型告警数统计:');
              const deviceStats = await Alarm.aggregate([
                {
                  $group: {
                    _id: '$device',
                    count: { $sum: 1 },
                    avgDuration: { $avg: '$durationMinutes' }
                  }
                },
                { $sort: { count: -1 } }
              ]);

              deviceStats.forEach(stat => {
                console.log(`  - ${stat._id}: ${stat.count} 条，平均时长: ${stat.avgDuration.toFixed(2)} 分钟`);
              });
            }

            // 关闭MongoDB连接
            if (connection && mongoose.connection.readyState === 1) {
              await mongoose.connection.close();
              console.log('\n✅ MongoDB连接已关闭');
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ 导入失败:', error);
    // 确保连接在错误情况下也能关闭
    if (connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n✅ MongoDB连接已关闭');
    }
    throw error;
  }
}

// 执行导入
if (require.main === module) {
  importAlarmsFromCSV()
    .then(() => {
      console.log('\n🎉 导入完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 导入过程出错:', error);
      process.exit(1);
    });
}

module.exports = { importAlarmsFromCSV, parseDateTime, inferSeverity };
