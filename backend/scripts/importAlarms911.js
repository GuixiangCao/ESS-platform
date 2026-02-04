const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 导入Alarm模型
const Alarm = require('../src/models/Alarm');

// MongoDB连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

// 解析日期时间格式 "1/9/2025 07:48:43" 或 "31/8/2025 17:36:59" -> Date对象
function parseDateTime(dateStr) {
  // 格式: "1/9/2025 07:48:43" (日/月/年 时:分:秒)
  const parts = dateStr.trim().split(' ');
  const datePart = parts[0].split('/');
  const timePart = parts[1].split(':');

  const day = parseInt(datePart[0]);
  const month = parseInt(datePart[1]) - 1; // JavaScript月份从0开始
  const year = parseInt(datePart[2]);
  const hour = parseInt(timePart[0]);
  const minute = parseInt(timePart[1]);
  const second = parseInt(timePart[2]);

  return new Date(year, month, day, hour, minute, second);
}

// 解析告警发生日期格式 "2025-09-01" -> Date对象
function parseAlarmDate(dateStr) {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  return new Date(year, month, day);
}

// 确定告警严重程度
function determineSeverity(alarmName) {
  const criticalKeywords = ['通信丢失', '通讯丢失', '控制器故障', '系统故障'];
  const errorKeywords = ['欠压', '过压', '欠频', '过频', '故障', '反馈'];
  const warningKeywords = ['告警', '异常', '超时'];

  if (criticalKeywords.some(keyword => alarmName.includes(keyword))) {
    return 'critical';
  }
  if (errorKeywords.some(keyword => alarmName.includes(keyword))) {
    return 'error';
  }
  if (warningKeywords.some(keyword => alarmName.includes(keyword))) {
    return 'warning';
  }
  return 'info';
}

async function importAlarms() {
  try {
    // 连接MongoDB
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功');

    const csvFilePath = path.join(__dirname, '..', '..', '国内9-11故障.csv');

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV文件不存在: ${csvFilePath}`);
    }

    const alarms = [];
    let rowCount = 0;
    let errorCount = 0;

    console.log(`开始读取CSV文件: ${csvFilePath}`);

    // 使用Promise包装CSV读取
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            rowCount++;

            // 解析CSV行
            const alarmDate = parseAlarmDate(row['告警发生日期']);
            const stationId = parseInt(row['电站id']);
            const alarmId = row['告警id'].trim();

            // 统一设备类型格式
            let device = row['告警设备'].trim();
            const deviceMap = {
              'lc': 'lc',
              'pcs': 'pcs',
              'cluster': 'cluster',
              'meter': 'meter',
              'highmeter': 'highMeter',
              'ac': 'ac',
              'ems': 'ems'
            };
            device = deviceMap[device.toLowerCase()] || device;

            const alarmName = row['告警名称'].trim();
            const startTime = parseDateTime(row['告警开始时间']);
            const endTime = parseDateTime(row['告警结束时间']);

            // 计算持续时间
            const duration = Math.floor((endTime - startTime) / 1000);
            const durationMinutes = Math.floor((endTime - startTime) / 60000);

            // 验证数据有效性
            if (isNaN(duration) || !isFinite(duration) || duration < 0) {
              throw new Error(`无效的持续时间: ${row['告警开始时间']} -> ${row['告警结束时间']}`);
            }

            // 确定严重程度
            const severity = determineSeverity(alarmName);

            // 构建告警对象
            const alarm = {
              alarmDate,
              stationId,
              alarmId,
              device,
              alarmName,
              startTime,
              endTime,
              duration,
              durationMinutes,
              severity
            };

            alarms.push(alarm);

            if (rowCount % 1000 === 0) {
              console.log(`已读取 ${rowCount} 条记录...`);
            }
          } catch (err) {
            errorCount++;
            console.error(`解析行 ${rowCount} 出错:`, err.message);
            if (errorCount <= 5) {
              console.error('  问题数据:', row);
            }
          }
        })
        .on('end', () => {
          console.log(`CSV文件读取完成，共 ${rowCount} 行，成功解析 ${alarms.length} 条`);
          if (errorCount > 0) {
            console.warn(`警告: ${errorCount} 条记录解析失败`);
          }
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    if (alarms.length === 0) {
      console.log('没有数据需要导入');
      return;
    }

    // 批量插入数据
    console.log(`开始批量插入 ${alarms.length} 条告警数据...`);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 分批处理，每批1000条
    const batchSize = 1000;
    for (let i = 0; i < alarms.length; i += batchSize) {
      const batch = alarms.slice(i, i + batchSize);

      // 逐条处理以避免默认值函数的问题
      for (const alarmData of batch) {
        try {
          // 检查是否已存在
          const existing = await Alarm.findOne({ alarmId: alarmData.alarmId });

          if (existing) {
            // 更新现有记录
            await Alarm.updateOne({ alarmId: alarmData.alarmId }, { $set: alarmData });
            updatedCount++;
          } else {
            // 创建新记录
            await Alarm.create(alarmData);
            insertedCount++;
          }
        } catch (err) {
          if (err.code === 11000) {
            // 重复键错误，跳过
            skippedCount++;
          } else {
            console.error(`插入告警 ${alarmData.alarmId} 失败:`, err.message);
          }
        }
      }

      console.log(`进度: ${Math.min(i + batchSize, alarms.length)}/${alarms.length}`);
    }

    console.log('\n导入完成！');
    console.log(`- 新增记录: ${insertedCount}`);
    console.log(`- 更新记录: ${updatedCount}`);
    console.log(`- 跳过记录: ${skippedCount}`);
    console.log(`- 总计: ${insertedCount + updatedCount + skippedCount}`);

    // 统计信息
    const totalCount = await Alarm.countDocuments();
    const stationCount = await Alarm.distinct('stationId');

    // 按月份统计
    const monthlyStats = await Alarm.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$alarmDate' },
            month: { $month: '$alarmDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    console.log('\n数据库统计:');
    console.log(`- 告警总数: ${totalCount}`);
    console.log(`- 电站数量: ${stationCount.length}`);
    console.log('\n按月份统计:');
    monthlyStats.forEach(stat => {
      console.log(`  ${stat._id.year}年${stat._id.month}月: ${stat.count} 条`);
    });

  } catch (error) {
    console.error('导入失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行导入
importAlarms();
