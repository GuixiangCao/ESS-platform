const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function compareAlarmQueries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log(`对比电站${stationId}在${dateStr}的告警查询差异\n`);
    console.log('═══════════════════════════════════════════════════\n');

    // 方法1：损失分析页面的查询逻辑（使用本地时区）
    const [year1, month1, day1] = dateStr.split('-').map(Number);
    const startOfDay1 = new Date(year1, month1 - 1, day1);
    const endOfDay1 = new Date(startOfDay1);
    endOfDay1.setDate(endOfDay1.getDate() + 1);

    console.log('方法1：损失分析页面查询（使用本地时区）');
    console.log(`  startOfDay: ${startOfDay1.toISOString()}`);
    console.log(`  endOfDay: ${endOfDay1.toISOString()}`);

    const alarms1 = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: startOfDay1,
        $lt: endOfDay1
      }
    }).sort({ startTime: 1 });

    console.log(`  结果: ${alarms1.length} 条告警\n`);

    // 方法2：SOC详情页面的查询逻辑（使用UTC）
    const [year2, month2, day2] = dateStr.split('-').map(Number);
    const startOfDay2 = new Date(Date.UTC(year2, month2 - 1, day2, 0, 0, 0, 0));
    const endOfDay2 = new Date(Date.UTC(year2, month2 - 1, day2 + 1, 0, 0, 0, 0));

    console.log('方法2：SOC详情页面查询（使用UTC）');
    console.log(`  startOfDay: ${startOfDay2.toISOString()}`);
    console.log(`  endOfDay: ${endOfDay2.toISOString()}`);

    const alarms2 = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: startOfDay2,
        $lt: endOfDay2
      }
    }).sort({ startTime: 1 });

    console.log(`  结果: ${alarms2.length} 条告警\n`);

    console.log('═══════════════════════════════════════════════════\n');
    console.log('差异分析:\n');

    if (alarms1.length !== alarms2.length) {
      console.log(`⚠️ 查询结果数量不同：方法1=${alarms1.length}, 方法2=${alarms2.length}\n`);

      // 找出差异的告警
      const ids1 = new Set(alarms1.map(a => a.alarmId));
      const ids2 = new Set(alarms2.map(a => a.alarmId));

      const onlyIn1 = alarms1.filter(a => !ids2.has(a.alarmId));
      const onlyIn2 = alarms2.filter(a => !ids1.has(a.alarmId));

      if (onlyIn1.length > 0) {
        console.log(`只在方法1中出现 (${onlyIn1.length}条):`);
        onlyIn1.slice(0, 5).forEach(alarm => {
          console.log(`  - ${alarm.alarmName}`);
          console.log(`    alarmDate: ${alarm.alarmDate.toISOString()}`);
          console.log(`    startTime: ${alarm.startTime.toISOString()}`);
        });
        console.log('');
      }

      if (onlyIn2.length > 0) {
        console.log(`只在方法2中出现 (${onlyIn2.length}条):`);
        onlyIn2.slice(0, 5).forEach(alarm => {
          console.log(`  - ${alarm.alarmName}`);
          console.log(`    alarmDate: ${alarm.alarmDate.toISOString()}`);
          console.log(`    startTime: ${alarm.startTime.toISOString()}`);
        });
        console.log('');
      }
    } else {
      console.log('✓ 两种查询方法返回相同数量的告警\n');
    }

    // 显示所有告警的alarmDate分布
    console.log('═══════════════════════════════════════════════════\n');
    console.log('所有告警的alarmDate值:\n');

    const allAlarmsForStation = await Alarm.find({
      stationId: parseInt(stationId)
    }).sort({ alarmDate: 1 });

    const dateGroups = {};
    allAlarmsForStation.forEach(alarm => {
      const dateKey = alarm.alarmDate.toISOString().split('T')[0];
      dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
    });

    Object.keys(dateGroups).sort().forEach(dateKey => {
      const highlight = dateKey === dateStr || dateKey === '2026-01-10' ? ' ⬅' : '';
      console.log(`  ${dateKey}: ${dateGroups[dateKey]} 条${highlight}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭\n');
  }
}

compareAlarmQueries();
