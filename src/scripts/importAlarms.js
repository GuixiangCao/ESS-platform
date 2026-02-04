const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');

const MONGODB_URI = 'mongodb://localhost:27017/ess-platform';

// 严重程度映射
const getSeverity = (alarmName) => {
  if (alarmName.includes('通讯丢失') || alarmName.includes('通信丢失')) {
    return 'warning';
  }
  if (alarmName.includes('故障') || alarmName.includes('失败')) {
    return 'error';
  }
  if (alarmName.includes('紧急') || alarmName.includes('严重')) {
    return 'critical';
  }
  return 'info';
};

async function importAlarms() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 删除现有数据
    await Alarm.deleteMany({});
    console.log('Cleared existing alarm data');

    // 读取CSV文件
    const csvPath = path.join(__dirname, '../../国内2026-1月故障列表.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());

    // 跳过表头
    const dataLines = lines.slice(1);

    const alarms = [];
    let skipped = 0;

    for (const line of dataLines) {
      // 解析CSV行 (处理引号包裹的字段)
      const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
      if (!match) {
        console.log('Skipping invalid line:', line);
        skipped++;
        continue;
      }

      const [, dateStr, stationId, alarmId, device, alarmName, startTimeStr, endTimeStr] = match;

      // 解析日期时间
      const parseDateTime = (dateTimeStr) => {
        // 格式: "1/1/2026 19:45:48"
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [month, day, year] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
      };

      const startTime = parseDateTime(startTimeStr);
      const endTime = parseDateTime(endTimeStr);

      // 计算持续时长（分钟）
      const durationMinutes = (endTime - startTime) / (1000 * 60);

      // 解析告警日期
      const [year, month, day] = dateStr.split('-').map(Number);
      const alarmDate = new Date(year, month - 1, day);

      alarms.push({
        alarmId,
        stationId: parseInt(stationId),
        alarmDate,
        device,
        alarmName,
        severity: getSeverity(alarmName),
        startTime,
        endTime,
        durationMinutes: Math.round(durationMinutes * 100) / 100
      });
    }

    // 批量插入
    if (alarms.length > 0) {
      await Alarm.insertMany(alarms);
      console.log(`✓ Successfully imported ${alarms.length} alarms`);
      console.log(`✗ Skipped ${skipped} invalid rows`);

      // 显示统计
      const stats = await Alarm.aggregate([
        {
          $group: {
            _id: '$stationId',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      console.log('\nAlarms by station:');
      stats.forEach(s => {
        console.log(`  Station ${s._id}: ${s.count} alarms`);
      });

      // 统计大于1分钟的告警
      const filtered = await Alarm.countDocuments({ durationMinutes: { $gt: 1 } });
      console.log(`\nAlarms > 1 minute: ${filtered}`);
    }

    await mongoose.connection.close();
    console.log('\nImport completed successfully!');
  } catch (error) {
    console.error('Error importing alarms:', error);
    process.exit(1);
  }
}

importAlarms();
