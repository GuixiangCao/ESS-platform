const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 清除并重新导入告警数据
 *
 * 时间处理说明：
 * 1. CSV中的时间格式是：日/月/年 时:分:秒（如 16/1/2026 02:14:43）
 * 2. 所有时间都是UTC+8本地时间
 * 3. 存储到数据库时转换为UTC时间戳
 */

// 解析CSV中的日期格式：日/月/年 时:分:秒
function parseCSVDateTime(dateTimeStr) {
  if (!dateTimeStr || dateTimeStr.trim() === '') {
    return null;
  }

  // 格式：16/1/2026 02:14:43 或 16/1/2026 2:14:43
  const parts = dateTimeStr.trim().split(' ');
  if (parts.length !== 2) {
    console.error(`无效的日期时间格式: ${dateTimeStr}`);
    return null;
  }

  const [datePart, timePart] = parts;
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  if (!day || !month || !year || isNaN(hour) || isNaN(minute) || isNaN(second)) {
    console.error(`日期时间解析失败: ${dateTimeStr}`);
    return null;
  }

  // CSV中的时间是UTC+0标准时间，直接存储为UTC时间戳
  // 例如：CSV中的 "11/1/2026 19:55:38" (UTC+0)
  //      → 存为 "2026-01-11T19:55:38.000Z" (UTC+0)
  //      → 显示时加8小时 → "2026-01-12 03:55:38" (UTC+8)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date;
}

// 计算持续时间（分钟）
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
}

// 确定告警严重程度
function determineSeverity(alarmName) {
  const criticalKeywords = ['丢失', '故障', '欠压', '过压', '过流', '短路', '停机'];
  const warningKeywords = ['开门', '除湿'];

  if (criticalKeywords.some(keyword => alarmName.includes(keyword))) {
    return 'critical';
  } else if (warningKeywords.some(keyword => alarmName.includes(keyword))) {
    return 'warning';
  }
  return 'info';
}

async function clearAndReimportAlarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 1. 清除所有告警数据
    console.log('【步骤1】清除数据库中的所有告警数据\n');
    const deleteResult = await Alarm.deleteMany({});
    console.log(`✓ 已删除 ${deleteResult.deletedCount} 条告警记录\n`);

    // 2. 准备导入的CSV文件列表
    const csvFiles = [
      '国内9-11故障.csv',
      '2025-12月故障告警.csv',
      '国内2026-1月故障列表.csv'
    ];

    console.log('【步骤2】重新导入CSV文件\n');

    let totalImported = 0;
    let totalErrors = 0;

    for (const csvFile of csvFiles) {
      const csvPath = path.join(__dirname, '../../../', csvFile);

      console.log(`正在导入: ${csvFile}`);

      if (!fs.existsSync(csvPath)) {
        console.log(`⚠️  文件不存在: ${csvPath}\n`);
        continue;
      }

      const records = [];
      let lineNumber = 0;
      let parseErrors = 0;

      // 读取CSV文件
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            lineNumber++;

            try {
              // CSV列名：告警发生日期,电站id,告警id,告警设备,告警名称,告警开始时间,告警结束时间
              const alarmDateStr = row['告警发生日期']; // 格式：2026-01-11
              const stationId = parseInt(row['电站id']);
              const alarmId = row['告警id'];
              const device = row['告警设备'];
              const alarmName = row['告警名称'];
              const startTimeStr = row['告警开始时间']; // 格式：16/1/2026 02:14:43
              const endTimeStr = row['告警结束时间'];

              // 解析时间
              const startTime = parseCSVDateTime(startTimeStr);
              const endTime = parseCSVDateTime(endTimeStr);

              if (!startTime || !endTime) {
                parseErrors++;
                console.error(`  ✗ 行${lineNumber}: 时间解析失败 - ${startTimeStr} / ${endTimeStr}`);
                return;
              }

              // 从startTime提取日期作为alarmDate（UTC时间的00:00）
              const alarmDate = new Date(startTime);
              alarmDate.setUTCHours(0, 0, 0, 0);

              const durationMinutes = calculateDuration(startTime, endTime);
              const severity = determineSeverity(alarmName);

              records.push({
                alarmId,
                stationId,
                device,
                alarmName,
                startTime,
                endTime,
                alarmDate,
                durationMinutes,
                severity
              });

            } catch (error) {
              parseErrors++;
              console.error(`  ✗ 行${lineNumber}: 解析错误 - ${error.message}`);
            }
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });

      // 批量插入数据库
      if (records.length > 0) {
        try {
          await Alarm.insertMany(records, { ordered: false });
          console.log(`  ✓ 成功导入 ${records.length} 条记录`);
          totalImported += records.length;
        } catch (error) {
          if (error.code === 11000) {
            // 处理重复键错误
            const duplicates = error.writeErrors?.length || 0;
            const inserted = records.length - duplicates;
            console.log(`  ✓ 导入 ${inserted} 条记录 (跳过 ${duplicates} 条重复)`);
            totalImported += inserted;
            totalErrors += duplicates;
          } else {
            console.error(`  ✗ 批量插入失败: ${error.message}`);
            totalErrors += records.length;
          }
        }
      }

      if (parseErrors > 0) {
        console.log(`  ⚠️  ${parseErrors} 条记录解析失败`);
        totalErrors += parseErrors;
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【导入完成】\n');
    console.log(`✓ 成功导入: ${totalImported} 条告警`);
    if (totalErrors > 0) {
      console.log(`⚠️  错误/跳过: ${totalErrors} 条`);
    }
    console.log('');

    // 3. 验证导入结果
    console.log('【步骤3】验证导入结果\n');

    const totalCount = await Alarm.countDocuments();
    console.log(`数据库中共有 ${totalCount} 条告警\n`);

    // 验证电站205在2026-01-11的数据
    const station205Count = await Alarm.countDocuments({
      stationId: 205,
      startTime: {
        $gte: new Date('2026-01-11T00:00:00.000Z'),
        $lt: new Date('2026-01-12T00:00:00.000Z')
      }
    });

    console.log(`电站205在2026-01-11的告警数: ${station205Count} 条`);

    // 检查被删除的那条告警是否恢复
    const restoredAlarm = await Alarm.findOne({
      alarmId: '35917343-fec5-468e-85e8-5fd7ad334533'
    });

    if (restoredAlarm) {
      console.log(`\n✓ 已恢复被删除的告警: 35917343-fec5-468e-85e8-5fd7ad334533`);
      console.log(`  电站: ${restoredAlarm.stationId}`);
      console.log(`  告警名称: ${restoredAlarm.alarmName}`);
      console.log(`  开始时间: ${restoredAlarm.startTime.toISOString()}`);
    } else {
      console.log(`\n⚠️  未找到告警: 35917343-fec5-468e-85e8-5fd7ad334533`);
    }

    console.log('\n');

  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

clearAndReimportAlarms();
