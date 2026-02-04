const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function checkStation205Alarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log(`查询电站 ${stationId} (喜尔美) 在 ${dateStr} 的故障数据\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 构建查询范围
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    console.log('查询范围:');
    console.log(`  开始: ${startOfDay.toISOString()}`);
    console.log(`  结束: ${endOfDay.toISOString()}\n`);

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 });

    console.log(`找到 ${alarms.length} 条故障记录\n`);

    if (alarms.length > 0) {
      console.log('故障详情:\n');
      alarms.forEach((alarm, idx) => {
        const startTime = new Date(alarm.startTime);
        const endTime = new Date(alarm.endTime);
        console.log(`${idx + 1}. ${alarm.alarmName}`);
        console.log(`   设备: ${alarm.device}`);
        console.log(`   开始时间: ${startTime.toISOString()}`);
        console.log(`   UTC小时: ${startTime.getUTCHours()}:${String(startTime.getUTCMinutes()).padStart(2, '0')}`);
        console.log(`   结束时间: ${endTime.toISOString()}`);
        console.log(`   UTC小时: ${endTime.getUTCHours()}:${String(endTime.getUTCMinutes()).padStart(2, '0')}`);
        console.log(`   持续时间: ${alarm.durationMinutes} 分钟`);
        console.log(`   严重程度: ${alarm.severity}`);
        console.log('');
      });
    } else {
      console.log('❌ 该日期没有故障记录\n');

      // 检查前后日期是否有数据
      console.log('检查前后日期是否有故障数据...\n');

      const prevDay = new Date(dateStr);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split('T')[0];

      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const prevDayStart = new Date(prevDayStr + 'T00:00:00Z');
      const prevDayEnd = new Date(prevDayStr + 'T23:59:59.999Z');
      const nextDayStart = new Date(nextDayStr + 'T00:00:00Z');
      const nextDayEnd = new Date(nextDayStr + 'T23:59:59.999Z');

      const prevCount = await Alarm.countDocuments({
        stationId: parseInt(stationId),
        startTime: { $gte: prevDayStart, $lte: prevDayEnd }
      });

      const nextCount = await Alarm.countDocuments({
        stationId: parseInt(stationId),
        startTime: { $gte: nextDayStart, $lte: nextDayEnd }
      });

      console.log(`  ${prevDayStr}: ${prevCount} 条故障`);
      console.log(`  ${dateStr}: 0 条故障`);
      console.log(`  ${nextDayStr}: ${nextCount} 条故障\n`);

      // 查询电站205的故障数据时间范围
      const firstAlarm = await Alarm.findOne({ stationId: parseInt(stationId) }).sort({ startTime: 1 });
      const lastAlarm = await Alarm.findOne({ stationId: parseInt(stationId) }).sort({ startTime: -1 });

      if (firstAlarm && lastAlarm) {
        console.log('电站205故障数据时间范围:');
        console.log(`  最早: ${firstAlarm.startTime.toISOString()}`);
        console.log(`  最晚: ${lastAlarm.startTime.toISOString()}\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

checkStation205Alarms();
