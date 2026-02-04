const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Alarm = require('../src/models/Alarm');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

async function verifyAlarms() {
  try {
    // 连接MongoDB
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功\n');

    // 1. 总体统计
    console.log('=== 总体统计 ===');
    const totalCount = await Alarm.countDocuments();
    const stationIds = await Alarm.distinct('stationId');
    const devices = await Alarm.distinct('device');

    console.log(`告警总数: ${totalCount}`);
    console.log(`涉及电站数: ${stationIds.length}`);
    console.log(`电站列表: ${stationIds.sort((a, b) => a - b).join(', ')}`);
    console.log(`设备类型: ${devices.join(', ')}`);

    // 2. 按电站统计
    console.log('\n=== 按电站统计告警数量 ===');
    const stationStats = await Alarm.aggregate([
      {
        $group: {
          _id: '$stationId',
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationMinutes' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    stationStats.forEach(stat => {
      console.log(`电站 ${stat._id}: ${stat.count} 条告警, 总时长 ${stat.totalDuration.toFixed(0)} 分钟`);
    });

    // 3. 按设备类型统计
    console.log('\n=== 按设备类型统计 ===');
    const deviceStats = await Alarm.aggregate([
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMinutes' },
          totalDuration: { $sum: '$durationMinutes' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    deviceStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} 条, 平均时长 ${stat.avgDuration.toFixed(1)} 分钟, 总时长 ${stat.totalDuration.toFixed(0)} 分钟`);
    });

    // 4. Top 10 告警类型
    console.log('\n=== Top 10 告警类型 ===');
    const alarmTypeStats = await Alarm.aggregate([
      {
        $group: {
          _id: {
            device: '$device',
            alarmName: '$alarmName'
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMinutes' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    alarmTypeStats.forEach((stat, index) => {
      console.log(`${index + 1}. [${stat._id.device}] ${stat._id.alarmName}: ${stat.count} 次, 平均 ${stat.avgDuration.toFixed(1)} 分钟`);
    });

    // 5. 日期范围
    console.log('\n=== 日期范围 ===');
    const dateRange = await Alarm.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$alarmDate' },
          maxDate: { $max: '$alarmDate' },
          minStart: { $min: '$startTime' },
          maxEnd: { $max: '$endTime' }
        }
      }
    ]);

    if (dateRange.length > 0) {
      const range = dateRange[0];
      console.log(`告警日期范围: ${range.minDate.toLocaleDateString('zh-CN')} - ${range.maxDate.toLocaleDateString('zh-CN')}`);
      console.log(`告警时间范围: ${range.minStart.toLocaleString('zh-CN')} - ${range.maxEnd.toLocaleString('zh-CN')}`);
    }

    // 6. 12月份按日期统计
    console.log('\n=== 12月份每日告警数量 ===');
    const dailyStats = await Alarm.aggregate([
      {
        $match: {
          alarmDate: {
            $gte: new Date('2025-12-01'),
            $lte: new Date('2025-12-31')
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$alarmDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    dailyStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} 条告警`);
    });

    // 7. 检查数据完整性
    console.log('\n=== 数据完整性检查 ===');
    const missingFields = await Alarm.find({
      $or: [
        { alarmDate: { $exists: false } },
        { stationId: { $exists: false } },
        { alarmId: { $exists: false } },
        { device: { $exists: false } },
        { alarmName: { $exists: false } },
        { startTime: { $exists: false } },
        { endTime: { $exists: false } }
      ]
    }).countDocuments();

    console.log(`缺失必要字段的记录: ${missingFields} 条`);

    const invalidDuration = await Alarm.find({
      $expr: { $lt: ['$endTime', '$startTime'] }
    }).countDocuments();

    console.log(`结束时间早于开始时间的记录: ${invalidDuration} 条`);

    console.log('\n验证完成！');

  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

verifyAlarms();
