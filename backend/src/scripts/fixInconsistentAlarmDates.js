const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function fixInconsistentAlarmDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('修复alarmDate和startTime日期不一致的告警\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 查询所有告警
    const allAlarms = await Alarm.find({});
    console.log(`数据库中共有 ${allAlarms.length} 条告警\n`);

    let fixedCount = 0;
    let alreadyConsistentCount = 0;

    console.log('检查每条告警的日期一致性...\n');

    for (const alarm of allAlarms) {
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startDateStr = alarm.startTime.toISOString().split('T')[0];

      if (alarmDateStr !== startDateStr) {
        // 日期不一致，需要修复
        // 根据startTime重新计算正确的alarmDate
        const startTime = new Date(alarm.startTime);
        const newAlarmDate = new Date(startTime);
        newAlarmDate.setUTCHours(0, 0, 0, 0);

        console.log(`修复告警: ${alarm.alarmId.substring(0, 8)}...`);
        console.log(`  告警名称: ${alarm.alarmName}`);
        console.log(`  电站: ${alarm.stationId}`);
        console.log(`  旧alarmDate: ${alarm.alarmDate.toISOString()} (${alarmDateStr})`);
        console.log(`  startTime: ${alarm.startTime.toISOString()} (${startDateStr})`);
        console.log(`  新alarmDate: ${newAlarmDate.toISOString()} (${newAlarmDate.toISOString().split('T')[0]})`);

        await Alarm.updateOne(
          { _id: alarm._id },
          { $set: { alarmDate: newAlarmDate } }
        );

        fixedCount++;
        console.log('  ✓ 已修复\n');
      } else {
        alreadyConsistentCount++;
      }
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('修复完成!\n');
    console.log(`总告警数: ${allAlarms.length}`);
    console.log(`已经一致: ${alreadyConsistentCount} 条`);
    console.log(`成功修复: ${fixedCount} 条\n`);

    // 验证电站205在2026-01-11的告警
    console.log('═══════════════════════════════════════════════════\n');
    console.log('验证电站205在2026-01-11的告警:\n');

    const [year, month, day] = '2026-01-11'.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const verifyAlarms = await Alarm.find({
      stationId: 205,
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${verifyAlarms.length} 条告警\n`);

    // 检查日期一致性
    let inconsistentCount = 0;
    verifyAlarms.forEach(alarm => {
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      if (alarmDateStr !== startDateStr) {
        inconsistentCount++;
        console.log(`⚠️ 仍不一致: ${alarm.alarmId.substring(0, 8)}... alarmDate=${alarmDateStr}, startTime=${startDateStr}`);
      }
    });

    if (inconsistentCount === 0) {
      console.log('✓ 所有告警的alarmDate和startTime日期现在都一致了!\n');
    } else {
      console.log(`⚠️ 还有 ${inconsistentCount} 条告警日期不一致\n`);
    }

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

fixInconsistentAlarmDates();
