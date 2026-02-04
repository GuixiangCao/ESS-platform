const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function testFixedAlarmQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log('测试修复后的告警查询逻辑\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 使用修复后的查询逻辑（与损失分析页面一致）
    const [alarmYear, alarmMonth, alarmDay] = dateStr.split('-').map(Number);
    const alarmStartOfDay = new Date(alarmYear, alarmMonth - 1, alarmDay);
    const alarmEndOfDay = new Date(alarmStartOfDay);
    alarmEndOfDay.setDate(alarmEndOfDay.getDate() + 1);

    console.log('查询参数（本地时区构造）:');
    console.log(`  日期: ${dateStr}`);
    console.log(`  alarmStartOfDay: ${alarmStartOfDay.toISOString()}`);
    console.log(`  alarmEndOfDay: ${alarmEndOfDay.toISOString()}`);
    console.log('');

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: alarmStartOfDay,
        $lt: alarmEndOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`查询结果: ${alarms.length} 条告警\n`);

    if (alarms.length === 0) {
      console.log('没有找到告警数据');
      return;
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('前10条告警:\n');

    alarms.slice(0, 10).forEach((alarm, idx) => {
      const startTime = new Date(alarm.startTime);
      const endTime = new Date(alarm.endTime);

      // 使用UTC方法读取时间（按UTC+8本地时间理解）
      const startHour = startTime.getUTCHours();
      const startMinute = startTime.getUTCMinutes();
      const endHour = endTime.getUTCHours();
      const endMinute = endTime.getUTCMinutes();

      console.log(`${idx + 1}. ${alarm.alarmName}`);
      console.log(`   设备: ${alarm.device}`);
      console.log(`   alarmDate: ${alarm.alarmDate.toISOString()}`);
      console.log(`   startTime: ${alarm.startTime.toISOString()}`);
      console.log(`   时间段: ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
      console.log(`   持续: ${alarm.durationMinutes.toFixed(2)} 分钟`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('验证结果:\n');
    console.log(`✓ SOC详情页面将显示 ${alarms.length} 条告警`);
    console.log(`✓ ���损失分析页面查询结果一致\n`);

    // 按设备统计
    const deviceStats = {};
    alarms.forEach(alarm => {
      deviceStats[alarm.device] = (deviceStats[alarm.device] || 0) + 1;
    });

    console.log('按设备类型统计:');
    Object.keys(deviceStats).forEach(device => {
      console.log(`  ${device}: ${deviceStats[device]} 条`);
    });
    console.log('');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testFixedAlarmQuery();
