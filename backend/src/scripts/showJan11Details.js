const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function showJan11Details() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('查询 alarmDate = 2026-01-11 的告警详情\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询 alarmDate = 2026-01-11 的所有告警
    const startOfDay = new Date(2026, 0, 11); // 2026-01-11
    const endOfDay = new Date(2026, 0, 12);   // 2026-01-12

    const alarms = await Alarm.find({
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ stationId: 1, startTime: 1 });

    console.log(`找到 ${alarms.length} 条 alarmDate=2026-01-11 的告警\n`);

    if (alarms.length === 0) {
      console.log('没有数据');
      return;
    }

    // 按电站分组
    const byStation = {};
    alarms.forEach(alarm => {
      if (!byStation[alarm.stationId]) {
        byStation[alarm.stationId] = [];
      }
      byStation[alarm.stationId].push(alarm);
    });

    console.log('按电站分组:\n');
    Object.keys(byStation).sort().forEach(stationId => {
      const stationAlarms = byStation[stationId];
      console.log(`电站 ${stationId}: ${stationAlarms.length} 条告警`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('所有告警详情:\n');

    alarms.forEach((alarm, idx) => {
      const alarmDateStr = alarm.alarmDate.toISOString();
      const startTimeStr = alarm.startTime.toISOString();
      const endTimeStr = alarm.endTime.toISOString();

      // 提取日期部分
      const alarmDateOnly = alarmDateStr.split('T')[0];
      const startDateOnly = startTimeStr.split('T')[0];

      console.log(`${idx + 1}. 告警ID: ${alarm.alarmId}`);
      console.log(`   电站: ${alarm.stationId}`);
      console.log(`   设备: ${alarm.device}`);
      console.log(`   告警名称: ${alarm.alarmName}`);
      console.log(`   alarmDate: ${alarmDateStr}`);
      console.log(`   startTime: ${startTimeStr}`);
      console.log(`   endTime: ${endTimeStr}`);
      console.log(`   持续时间: ${alarm.durationMinutes.toFixed(2)} 分钟`);

      // 高亮不一致
      if (alarmDateOnly !== startDateOnly) {
        console.log(`   ⚠️  日期不一致:`);
        console.log(`       alarmDate 日期: ${alarmDateOnly}`);
        console.log(`       startTime 日期: ${startDateOnly}`);
        console.log(`       相差: ${Math.abs(new Date(startDateOnly) - new Date(alarmDateOnly)) / (1000 * 60 * 60 * 24)} 天`);
      } else {
        console.log(`   ✓ 日期一致`);
      }
      console.log('');
    });

    // 特别关注电站205
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('电站205 (喜尔美) 的告警:\n');

    const station205 = alarms.filter(a => a.stationId === 205);
    if (station205.length > 0) {
      console.log(`共 ${station205.length} 条\n`);
      station205.forEach((alarm, idx) => {
        console.log(`${idx + 1}. ${alarm.alarmName}`);
        console.log(`   startTime: ${alarm.startTime.toISOString()}`);
        console.log(`   startTime显示时间: ${alarm.startTime.getUTCHours()}:${String(alarm.startTime.getUTCMinutes()).padStart(2, '0')}`);
        console.log(`   应该在SOC图表显示的时段: ${alarm.startTime.getUTCHours()}:00`);
        console.log('');
      });

      console.log('总结:');
      console.log(`- 这${station205.length}条告警的 alarmDate 被标记为 2026-01-11`);
      console.log(`- 但实际 startTime 是在 ${station205[0].startTime.toISOString().split('T')[0]}`);
      console.log(`- 损失分析页面使用 alarmDate 查询，所以能找到`);
      console.log(`- SOC详情页面现在也使用 alarmDate 查询，所以也能找到`);
      console.log(`- 但在SOC图表上显示的时间会不准确（显示的是 startTime 的小时）\n`);
    } else {
      console.log('电站205没有 alarmDate=2026-01-11 的告警\n');
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

showJan11Details();
