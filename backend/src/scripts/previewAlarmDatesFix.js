const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 预览告警日期修复效果（不实际修改数据库）
 */
async function previewAlarmDatesFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('预览告警日期修复效果（仅查看，不修改数据库）\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 取样：电站205在"1���11日"的告警（实际是错误存储的）
    const startOfDay = new Date(2026, 0, 11);
    const endOfDay = new Date(2026, 0, 12);

    console.log('查询条件：电站205, alarmDate=2026-01-11\n');

    const sampleAlarms = await Alarm.find({
      stationId: 205,
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${sampleAlarms.length} 条告警\n`);

    if (sampleAlarms.length === 0) {
      console.log('没有找到数据');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('修复预览:\n');

    sampleAlarms.forEach((alarm, idx) => {
      const oldStartTime = new Date(alarm.startTime);
      const oldEndTime = new Date(alarm.endTime);
      const oldAlarmDate = new Date(alarm.alarmDate);

      // 提取年月日时分秒
      const startYear = oldStartTime.getFullYear();
      const startMonth = oldStartTime.getMonth() + 1;
      const startDay = oldStartTime.getDate();
      const startHours = oldStartTime.getHours();
      const startMinutes = oldStartTime.getMinutes();
      const startSeconds = oldStartTime.getSeconds();
      const startMs = oldStartTime.getMilliseconds();

      const endYear = oldEndTime.getFullYear();
      const endMonth = oldEndTime.getMonth() + 1;
      const endDay = oldEndTime.getDate();
      const endHours = oldEndTime.getHours();
      const endMinutes = oldEndTime.getMinutes();
      const endSeconds = oldEndTime.getSeconds();
      const endMs = oldEndTime.getMilliseconds();

      // 交换月份和日期：原来的月份变成日期，原来的日期变成月份
      const newStartTime = new Date(startYear, startDay - 1, startMonth, startHours, startMinutes, startSeconds, startMs);
      const newEndTime = new Date(endYear, endDay - 1, endMonth, endHours, endMinutes, endSeconds, endMs);
      const newAlarmDate = new Date(newStartTime);
      newAlarmDate.setHours(0, 0, 0, 0);

      console.log(`${idx + 1}. 告警: ${alarm.alarmName}`);
      console.log(`   设备: ${alarm.device}`);
      console.log('');
      console.log('   【修复前】');
      console.log(`   alarmDate:  ${oldAlarmDate.toISOString()} (${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')})`);
      console.log(`   startTime:  ${oldStartTime.toISOString()}`);
      console.log(`   endTime:    ${oldEndTime.toISOString()}`);
      console.log('');
      console.log('   【修复后】');
      console.log(`   alarmDate:  ${newAlarmDate.toISOString()} (${startYear}-${String(startDay).padStart(2, '0')}-${String(startMonth).padStart(2, '0')})`);
      console.log(`   startTime:  ${newStartTime.toISOString()}`);
      console.log(`   endTime:    ${newEndTime.toISOString()}`);
      console.log('');
      console.log(`   解释: 将月份${startMonth}和日期${startDay}交换 → ${startYear}年${startDay}月${startMonth}日`);
      console.log('');
      console.log('   ─────────────────────────────────');
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('结论:\n');
    console.log('修复后，电站205在2026-01-11的告警将会:');
    console.log('1. alarmDate 保持为 2026-01-11');
    console.log('2. startTime 从 2026-11-01 修复为 2026-01-11');
    console.log('3. endTime 从 2026-11-01 修复为 2026-01-11');
    console.log('4. alarmDate 和 startTime 的日期部分将保持一致\n');

    console.log('这样，SOC详情页面将能正确显示故障时段在对应的日期。\n');

    // 统计需要修复的总数
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('统计需要修复的告警总数:\n');

    const allAlarms = await Alarm.find({});
    let needsFixCount = 0;

    for (const alarm of allAlarms) {
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startDateStr = alarm.startTime.toISOString().split('T')[0];

      if (alarmDateStr !== startDateStr) {
        needsFixCount++;
      }
    }

    console.log(`数据库总告警数: ${allAlarms.length}`);
    console.log(`日期不一致的告警: ${needsFixCount} 条`);
    console.log(`占比: ${(needsFixCount / allAlarms.length * 100).toFixed(2)}%\n`);

    if (needsFixCount > 0) {
      console.log('�� 建议运行修复脚本: node src/scripts/fixAlarmDates.js\n');
    }

  } catch (error) {
    console.error('预览失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

previewAlarmDatesFix();
