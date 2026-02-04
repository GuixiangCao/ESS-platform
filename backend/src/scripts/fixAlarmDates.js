const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 修复告警日期格式问题
 * 将startTime和endTime的月份和日期交换（从错误的YYYY-MM-DD转换为正确的YYYY-DD-MM）
 */
async function fixAlarmDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('开始修复告警日期格式\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 获取所有告警
    const allAlarms = await Alarm.find({});
    console.log(`数据库中共有 ${allAlarms.length} 条告警\n`);

    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    console.log('开始处理...\n');

    for (const alarm of allAlarms) {
      try {
        const oldStartTime = new Date(alarm.startTime);
        const oldEndTime = new Date(alarm.endTime);

        // 提取年月日时分秒
        const startYear = oldStartTime.getFullYear();
        const startMonth = oldStartTime.getMonth() + 1; // 0-11 -> 1-12
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

        // 检查交换后的日期是否有效
        // 如果当前月份<=12且日期<=12，交换后的日期可能是有效的
        // 如果当前月份>12，说明原始数据就是日月颠倒的
        const needsFix = startMonth > 12 || endMonth > 12 ||
                        (startMonth <= 12 && startDay <= 12 && startMonth !== startDay);

        if (!needsFix) {
          // 如果月份和日期都<=12且相等，无法判断是否需要修复，跳过
          if (startMonth === startDay && endMonth === endDay) {
            skippedCount++;
            continue;
          }
        }

        // 交换月份和日期
        // 原来的月份变成日期，原来的日期变成月份
        const newStartTime = new Date(startYear, startDay - 1, startMonth, startHours, startMinutes, startSeconds, startMs);
        const newEndTime = new Date(endYear, endDay - 1, endMonth, endHours, endMinutes, endSeconds, endMs);

        // 检查新日期是否有效
        if (isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
          errorCount++;
          errors.push({
            alarmId: alarm.alarmId,
            reason: '交换后日期无效',
            oldStartTime: oldStartTime.toISOString(),
            oldEndTime: oldEndTime.toISOString()
          });
          continue;
        }

        // 更新alarmDate为新的startTime的日期部分（去掉时间）
        const newAlarmDate = new Date(newStartTime);
        newAlarmDate.setHours(0, 0, 0, 0);

        // 更新数据库
        await Alarm.updateOne(
          { _id: alarm._id },
          {
            $set: {
              startTime: newStartTime,
              endTime: newEndTime,
              alarmDate: newAlarmDate,
              duration: Math.floor((newEndTime - newStartTime) / 1000),
              durationMinutes: Math.floor((newEndTime - newStartTime) / 60000)
            }
          }
        );

        fixedCount++;

        // 每100条显示一次进度
        if (fixedCount % 100 === 0) {
          console.log(`已修复 ${fixedCount} 条...`);
        }

      } catch (err) {
        errorCount++;
        errors.push({
          alarmId: alarm.alarmId,
          reason: err.message,
          error: err
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('修复完成!\n');
    console.log(`总数: ${allAlarms.length} 条`);
    console.log(`成功修复: ${fixedCount} 条`);
    console.log(`跳过: ${skippedCount} 条 (月份和日期相同，无法判断)`);
    console.log(`错误: ${errorCount} 条\n`);

    if (errors.length > 0) {
      console.log('错误详情:\n');
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`${idx + 1}. 告警ID: ${err.alarmId}`);
        console.log(`   原因: ${err.reason}`);
        if (err.oldStartTime) {
          console.log(`   原startTime: ${err.oldStartTime}`);
        }
        console.log('');
      });

      if (errors.length > 10) {
        console.log(`... 还有 ${errors.length - 10} 个错误\n`);
      }
    }

    // 验证修复结果 - 检查电站205在1月11日的告警
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('验证修复结果 (电站205, 2026-01-11):\n');

    const startOfDay = new Date(2026, 0, 11);
    const endOfDay = new Date(2026, 0, 12);

    const verifyAlarms = await Alarm.find({
      stationId: 205,
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${verifyAlarms.length} 条告警\n`);

    verifyAlarms.forEach((alarm, idx) => {
      console.log(`${idx + 1}. ${alarm.alarmName}`);
      console.log(`   alarmDate: ${alarm.alarmDate.toISOString().split('T')[0]}`);
      console.log(`   startTime: ${alarm.startTime.toISOString()}`);
      console.log(`   endTime: ${alarm.endTime.toISOString()}`);

      // 检查日期是否一致
      const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      if (alarmDateStr === startDateStr) {
        console.log(`   ✓ 日期一致`);
      } else {
        console.log(`   ⚠️ 日期不一致`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 运行前确认
console.log('⚠️  警告：此脚本将修改数据库中的告警数据！\n');
console.log('修复逻辑：交换 startTime 和 endTime 的月份和日期\n');
console.log('例如：2026-11-01 → 2026-01-11\n');
console.log('建议先备份数据库后再运行此脚本！\n');
console.log('按 Ctrl+C 取消，或等待3秒后自动开始...\n');

setTimeout(() => {
  fixAlarmDates();
}, 3000);
