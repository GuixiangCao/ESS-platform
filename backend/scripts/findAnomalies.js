const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Alarm = require('../src/models/Alarm');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

async function findAnomalies() {
  try {
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功\n');

    // 查找结束时间早于开始时间的记录
    console.log('=== 结束时间早于开始时间的记录 ===');
    const invalidRecords = await Alarm.find({
      $expr: { $lt: ['$endTime', '$startTime'] }
    }).lean();

    invalidRecords.forEach(record => {
      console.log(`告警ID: ${record.alarmId}`);
      console.log(`电站: ${record.stationId}, 设备: ${record.device}, 名称: ${record.alarmName}`);
      console.log(`开始时间: ${record.startTime.toLocaleString('zh-CN')}`);
      console.log(`结束时间: ${record.endTime.toLocaleString('zh-CN')}`);
      console.log(`持续时间: ${record.durationMinutes} 分钟`);
      console.log('---');
    });

    // 查找未来日期的记录
    console.log('\n=== 未来日期的记录 ===');
    const futureRecords = await Alarm.find({
      endTime: { $gt: new Date('2026-02-01') }
    }).lean();

    futureRecords.forEach(record => {
      console.log(`告警ID: ${record.alarmId}`);
      console.log(`电站: ${record.stationId}, 设备: ${record.device}, 名称: ${record.alarmName}`);
      console.log(`告警日期: ${record.alarmDate.toLocaleDateString('zh-CN')}`);
      console.log(`开始时间: ${record.startTime.toLocaleString('zh-CN')}`);
      console.log(`结束时间: ${record.endTime.toLocaleString('zh-CN')}`);
      console.log('---');
    });

    // 查找持续时间异常长的记录（超过7天）
    console.log('\n=== 持续时间超过7天的记录 ===');
    const longRecords = await Alarm.find({
      durationMinutes: { $gt: 7 * 24 * 60 }
    }).sort({ durationMinutes: -1 }).limit(10).lean();

    longRecords.forEach(record => {
      const days = Math.floor(record.durationMinutes / (24 * 60));
      const hours = Math.floor((record.durationMinutes % (24 * 60)) / 60);
      const minutes = record.durationMinutes % 60;

      console.log(`告警ID: ${record.alarmId}`);
      console.log(`电站: ${record.stationId}, 设备: ${record.device}, 名称: ${record.alarmName}`);
      console.log(`持续时间: ${days}天 ${hours}小时 ${minutes}分钟`);
      console.log(`开始: ${record.startTime.toLocaleString('zh-CN')} -> 结束: ${record.endTime.toLocaleString('zh-CN')}`);
      console.log('---');
    });

  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

findAnomalies();
