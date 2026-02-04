const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Alarm = require('../src/models/Alarm');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

async function compareAlarmCounts() {
  try {
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功\n');

    // 获取12月份电站173的告警数据
    const stationId = 173;
    const startDate = new Date(2025, 11, 1); // 12月1日
    const endDate = new Date(2025, 11, 32); // 12月32日（会自动转为1月1日）

    console.log('=== 电站173的12月告警统计对比 ===\n');

    // 全量告警
    const allAlarms = await Alarm.find({
      stationId,
      alarmDate: { $gte: startDate, $lt: endDate }
    });

    console.log(`全量告警数: ${allAlarms.length}`);

    // 排除1分钟内的告警（之前的统计方式）
    const filteredAlarms = await Alarm.find({
      stationId,
      alarmDate: { $gte: startDate, $lt: endDate },
      durationMinutes: { $gt: 1 }
    });

    console.log(`排除1分钟内的告警数: ${filteredAlarms.length}`);
    console.log(`差异: ${allAlarms.length - filteredAlarms.length} 条\n`);

    // 1分钟及以内的告警
    const shortAlarms = await Alarm.find({
      stationId,
      alarmDate: { $gte: startDate, $lt: endDate },
      durationMinutes: { $lte: 1 }
    });

    console.log('=== 1分钟及以内的告警详情 ===');
    if (shortAlarms.length === 0) {
      console.log('没有1分钟及以内的告警');
    } else {
      shortAlarms.forEach((alarm, index) => {
        console.log(`${index + 1}. ${alarm.alarmName} - ${alarm.device} - ${alarm.durationMinutes}分钟`);
      });
    }

    // 按持续时间分组统计
    console.log('\n=== 按持续时间分组统计（所有电站12月数据）===');
    const durationGroups = await Alarm.aggregate([
      {
        $match: {
          alarmDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $bucket: {
          groupBy: '$durationMinutes',
          boundaries: [0, 1, 5, 10, 30, 60, 360, 1440, 10000],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalDuration: { $sum: '$durationMinutes' }
          }
        }
      }
    ]);

    const labels = {
      0: '0-1分钟',
      1: '1-5分钟',
      5: '5-10分钟',
      10: '10-30分钟',
      30: '30-60分钟',
      60: '1-6小时',
      360: '6-24小时',
      1440: '1天以上',
      'Other': '其他'
    };

    durationGroups.forEach(group => {
      const label = labels[group._id] || group._id;
      console.log(`${label}: ${group.count} 条告警, 累计 ${group.totalDuration.toFixed(0)} 分钟`);
    });

    // 检查所有电站的情况
    console.log('\n=== 所有电站的12月告警统计 ===');
    const stationStats = await Alarm.aggregate([
      {
        $match: {
          alarmDate: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$stationId',
          total: { $sum: 1 },
          shortAlarms: {
            $sum: {
              $cond: [{ $lte: ['$durationMinutes', 1] }, 1, 0]
            }
          },
          longAlarms: {
            $sum: {
              $cond: [{ $gt: ['$durationMinutes', 1] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('电站ID | 全量告警 | ≤1分钟 | >1分钟 | 短告警占比');
    console.log('-------|---------|--------|--------|----------');
    stationStats.forEach(stat => {
      const percent = ((stat.shortAlarms / stat.total) * 100).toFixed(1);
      console.log(`${stat._id.toString().padEnd(6)} | ${stat.total.toString().padEnd(7)} | ${stat.shortAlarms.toString().padEnd(6)} | ${stat.longAlarms.toString().padEnd(6)} | ${percent}%`);
    });

    const totalAll = stationStats.reduce((sum, s) => sum + s.total, 0);
    const totalShort = stationStats.reduce((sum, s) => sum + s.shortAlarms, 0);
    const totalLong = stationStats.reduce((sum, s) => sum + s.longAlarms, 0);
    const overallPercent = ((totalShort / totalAll) * 100).toFixed(1);

    console.log('-------|---------|--------|--------|----------');
    console.log(`总计   | ${totalAll.toString().padEnd(7)} | ${totalShort.toString().padEnd(6)} | ${totalLong.toString().padEnd(6)} | ${overallPercent}%`);

  } catch (error) {
    console.error('统计失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

compareAlarmCounts();
