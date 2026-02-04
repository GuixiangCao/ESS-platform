const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function showJanuaryAlarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('查询2026年1月的所有告警数据\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询2026年1月的所有告警
    const startOfJan = new Date('2026-01-01');
    const endOfJan = new Date('2026-02-01');

    console.log('查询条件:');
    console.log(`  alarmDate >= ${startOfJan.toISOString()}`);
    console.log(`  alarmDate < ${endOfJan.toISOString()}\n`);

    const alarms = await Alarm.find({
      alarmDate: {
        $gte: startOfJan,
        $lt: endOfJan
      }
    }).sort({ alarmDate: 1, startTime: 1 });

    console.log(`总共找到: ${alarms.length} 条告警\n`);

    if (alarms.length === 0) {
      console.log('1月份没有告警数据');
      return;
    }

    // 按电站分组统计
    const stationStats = {};
    alarms.forEach(alarm => {
      if (!stationStats[alarm.stationId]) {
        stationStats[alarm.stationId] = {
          count: 0,
          devices: {},
          dates: new Set()
        };
      }
      stationStats[alarm.stationId].count++;
      stationStats[alarm.stationId].devices[alarm.device] =
        (stationStats[alarm.stationId].devices[alarm.device] || 0) + 1;

      const dateKey = alarm.alarmDate.toISOString().split('T')[0];
      stationStats[alarm.stationId].dates.add(dateKey);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('按电站统计:\n');

    Object.keys(stationStats).sort((a, b) => stationStats[b].count - stationStats[a].count).forEach(stationId => {
      const stat = stationStats[stationId];
      console.log(`电站 ${stationId}:`);
      console.log(`  告警总数: ${stat.count} 条`);
      console.log(`  涉及日期: ${stat.dates.size} 天`);
      console.log(`  设备分布:`);
      Object.keys(stat.devices).forEach(device => {
        console.log(`    ${device}: ${stat.devices[device]} 条`);
      });
      console.log('');
    });

    // 按日期分组统计
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('按日期统计:\n');

    const dateStats = {};
    alarms.forEach(alarm => {
      const dateKey = alarm.alarmDate.toISOString().split('T')[0];
      if (!dateStats[dateKey]) {
        dateStats[dateKey] = {
          count: 0,
          stations: new Set()
        };
      }
      dateStats[dateKey].count++;
      dateStats[dateKey].stations.add(alarm.stationId);
    });

    Object.keys(dateStats).sort().forEach(date => {
      const stat = dateStats[date];
      console.log(`${date}: ${stat.count} 条告警, 涉及 ${stat.stations.size} 个电站`);
    });

    // 显示前20条告警详情
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('前20条告警详情:\n');

    alarms.slice(0, 20).forEach((alarm, idx) => {
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startTimeStr = alarm.startTime.toISOString();
      const endTimeStr = alarm.endTime.toISOString();

      console.log(`${idx + 1}. ${alarm.alarmName}`);
      console.log(`   电站: ${alarm.stationId}, 设备: ${alarm.device}`);
      console.log(`   alarmDate: ${alarmDateStr}`);
      console.log(`   startTime: ${startTimeStr}`);
      console.log(`   endTime: ${endTimeStr}`);
      console.log(`   持续时间: ${alarm.durationMinutes.toFixed(2)} 分钟`);
      console.log(`   严重程度: ${alarm.severity}`);

      // 检查 alarmDate 和 startTime 是否一致
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      if (alarmDateStr !== startDateStr) {
        console.log(`   ⚠️  数据不一致: alarmDate=${alarmDateStr}, startTime日期=${startDateStr}`);
      }
      console.log('');
    });

    if (alarms.length > 20) {
      console.log(`... 还有 ${alarms.length - 20} 条告警\n`);
    }

    // 检查数据一致性
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('数据一致性检查:\n');

    let inconsistentCount = 0;
    alarms.forEach(alarm => {
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startDateStr = alarm.startTime.toISOString().split('T')[0];

      if (alarmDateStr !== startDateStr) {
        inconsistentCount++;
      }
    });

    if (inconsistentCount > 0) {
      console.log(`⚠️  发现 ${inconsistentCount} 条告警的 alarmDate 和 startTime 日期不一致`);
      console.log(`   占比: ${(inconsistentCount / alarms.length * 100).toFixed(2)}%`);
      console.log(`   建议进行数据清洗修复\n`);
    } else {
      console.log(`✓ 所有告警的 alarmDate 和 startTime 日期一致\n`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

showJanuaryAlarms();
