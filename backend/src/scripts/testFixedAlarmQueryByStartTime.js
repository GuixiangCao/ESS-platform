const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function testFixedAlarmQueryByStartTime() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log('测试修复后的告警查询逻辑（基于startTime）\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 使用修复后的查询逻辑（基于startTime的UTC查询）
    const [alarmYear, alarmMonth, alarmDay] = dateStr.split('-').map(Number);
    const alarmStartOfDay = new Date(Date.UTC(alarmYear, alarmMonth - 1, alarmDay, 0, 0, 0, 0));
    const alarmEndOfDay = new Date(Date.UTC(alarmYear, alarmMonth - 1, alarmDay + 1, 0, 0, 0, 0));

    console.log('查询参数（UTC时间，基于startTime）:');
    console.log(`  日期: ${dateStr}`);
    console.log(`  alarmStartOfDay: ${alarmStartOfDay.toISOString()}`);
    console.log(`  alarmEndOfDay: ${alarmEndOfDay.toISOString()}`);
    console.log('');

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      startTime: {
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
    console.log('所有告警详情:\n');

    alarms.forEach((alarm, idx) => {
      const startTime = new Date(alarm.startTime);
      const endTime = new Date(alarm.endTime);
      const startHour = startTime.getUTCHours();
      const startMinute = startTime.getUTCMinutes();
      const endHour = endTime.getUTCHours();
      const endMinute = endTime.getUTCMinutes();

      const startDateStr = startTime.toISOString().split('T')[0];
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];

      console.log(`${idx + 1}. ${alarm.alarmName}`);
      console.log(`   告警ID: ${alarm.alarmId}`);
      console.log(`   设备: ${alarm.device}`);
      console.log(`   startTime: ${alarm.startTime.toISOString()} (${startDateStr})`);
      console.log(`   alarmDate: ${alarm.alarmDate.toISOString()} (${alarmDateStr})`);
      console.log(`   时间段: ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
      console.log(`   持续: ${alarm.durationMinutes.toFixed(2)} 分钟`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('验证结果:\n');

    // 检查所有告警的startTime是否都在目标日期
    const allInCorrectDate = alarms.every(alarm => {
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      return startDateStr === dateStr;
    });

    if (allInCorrectDate) {
      console.log(`✓ 所有 ${alarms.length} 条告警的startTime都在 ${dateStr}`);
    } else {
      console.log('⚠️ 发现startTime不在目标日期的告警:');
      alarms.forEach(alarm => {
        const startDateStr = alarm.startTime.toISOString().split('T')[0];
        if (startDateStr !== dateStr) {
          console.log(`  - ${alarm.alarmId}: startTime=${startDateStr}`);
        }
      });
    }

    console.log('');

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

    // 对比原始的4条告警ID
    const originalAlarmIds = [
      'e0a39f85-94a4-435c-b53f-413e49370b43',
      '35917343-fec5-468e-85e8-5fd7ad334533',
      '90b4e568-fe22-4433-af39-6eb364c6a52f',
      '07548f01-61ee-40f4-af6c-ed4160ead363'
    ];

    console.log('原始告警ID匹配情况:');
    originalAlarmIds.forEach(id => {
      const found = alarms.find(a => a.alarmId === id);
      console.log(`  ${id.substring(0, 8)}... ${found ? '✓ 找到' : '✗ 未找到（可能已被去重删除）'}`);
    });
    console.log('');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testFixedAlarmQueryByStartTime();
