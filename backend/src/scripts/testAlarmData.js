const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function testAlarmData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 测试电站173在2026-01-13的故障数据
    const stationId = 173;
    const dateStr = '2026-01-13';

    console.log(`查询电站 ${stationId} 在 ${dateStr} 的故障数据\n`);
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
        console.log(`   开始时间: ${startTime.toISOString()} (${startTime.getUTCHours()}:${String(startTime.getUTCMinutes()).padStart(2, '0')})`);
        console.log(`   结束时间: ${endTime.toISOString()} (${endTime.getUTCHours()}:${String(endTime.getUTCMinutes()).padStart(2, '0')})`);
        console.log(`   持续时间: ${alarm.durationMinutes} 分钟`);
        console.log(`   严重程度: ${alarm.severity}`);
        console.log('');
      });
    } else {
      console.log('该日期没有故障记录');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testAlarmData();
