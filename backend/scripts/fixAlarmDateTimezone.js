const mongoose = require('mongoose');
const Alarm = require('../src/models/Alarm');

async function fixAlarmDateTimezone() {
  try {
    console.log('连接到MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到MongoDB\n');

    // 获取所有告警
    const alarms = await Alarm.find({});
    console.log(`找到 ${alarms.length} 条告警记录\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    console.log('开始修复alarmDate字段...\n');

    for (const alarm of alarms) {
      // 将UTC时间转换为UTC+8时间
      const utcTime = new Date(alarm.startTime);
      const utc8Time = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);

      // 提取UTC+8日期（年-月-日）
      const year = utc8Time.getUTCFullYear();
      const month = utc8Time.getUTCMonth();
      const day = utc8Time.getUTCDate();

      // 创建新的alarmDate（UTC时间的00:00:00，但日期是UTC+8的）
      const newAlarmDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      // 获取旧的alarmDate
      const oldAlarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const newAlarmDateStr = newAlarmDate.toISOString().split('T')[0];

      if (oldAlarmDateStr !== newAlarmDateStr) {
        // 需要更新
        await Alarm.updateOne(
          { _id: alarm._id },
          { $set: { alarmDate: newAlarmDate } }
        );
        updatedCount++;

        if (updatedCount <= 5) {
          console.log(`✓ 更新告警 ${alarm.alarmId.substring(0, 20)}...`);
          console.log(`  startTime (UTC): ${utcTime.toISOString()}`);
          console.log(`  startTime (UTC+8): ${utc8Time.toISOString()}`);
          console.log(`  旧 alarmDate: ${oldAlarmDateStr}`);
          console.log(`  新 alarmDate: ${newAlarmDateStr}\n`);
        }
      } else {
        unchangedCount++;
      }
    }

    console.log('\n修复完成:');
    console.log(`  更新: ${updatedCount} 条`);
    console.log(`  未改变: ${unchangedCount} 条`);
    console.log(`  总计: ${alarms.length} 条\n`);

    // 验证修复
    console.log('验证修复...');
    const testAlarm = await Alarm.findOne({ alarmId: 'ef08c607-cf88-4a9d-9e38-242dad561647' });
    if (testAlarm) {
      const utcTime = new Date(testAlarm.startTime);
      const utc8Time = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);

      console.log('\n测试告警 ef08c607-cf88-4a9d-9e38-242dad561647:');
      console.log(`  startTime (UTC): ${utcTime.toISOString()}`);
      console.log(`  startTime (UTC+8): ${utc8Time.toISOString()}`);
      console.log(`  alarmDate: ${testAlarm.alarmDate.toISOString().split('T')[0]}`);
      console.log(`  预期 alarmDate: 2026-01-06`);
      console.log(`  结果: ${testAlarm.alarmDate.toISOString().split('T')[0] === '2026-01-06' ? '✓ 正确' : '✗ 错误'}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

fixAlarmDateTimezone();
