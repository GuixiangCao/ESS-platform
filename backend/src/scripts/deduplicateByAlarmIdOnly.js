const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 告警去重脚本（仅基于alarmId）
 * 只保留alarmId唯一的记录
 * 如果有重复的alarmId，保留最早创建的记录
 */
async function deduplicateAlarmsByIdOnly() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('告警数据去重处理（仅基于alarmId）\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 获取所有告警
    const allAlarms = await Alarm.find({}).sort({ createdAt: 1 });
    console.log(`数据库中共有 ${allAlarms.length} 条告警\n`);

    // 基于alarmId去重
    console.log('【方法】基于alarmId去重（保留最早创建的记录）\n');

    const alarmIdMap = new Map();
    const duplicatesToDelete = [];

    allAlarms.forEach(alarm => {
      if (alarmIdMap.has(alarm.alarmId)) {
        // 发现重复的alarmId，标记为删除
        duplicatesToDelete.push({
          _id: alarm._id,
          alarmId: alarm.alarmId,
          stationId: alarm.stationId,
          startTime: alarm.startTime,
          createdAt: alarm.createdAt
        });
      } else {
        // 第一次出现，记录
        alarmIdMap.set(alarm.alarmId, {
          _id: alarm._id,
          createdAt: alarm.createdAt
        });
      }
    });

    console.log(`基于alarmId的重复记录: ${duplicatesToDelete.length} 条\n`);

    if (duplicatesToDelete.length > 0) {
      console.log('前10条重复记录示例:');
      duplicatesToDelete.slice(0, 10).forEach((dup, idx) => {
        console.log(`  ${idx + 1}. alarmId: ${dup.alarmId.substring(0, 20)}...`);
        console.log(`     电站: ${dup.stationId}, 时间: ${dup.startTime.toISOString()}`);
        console.log(`     创建于: ${dup.createdAt ? dup.createdAt.toISOString() : 'N/A'}`);
      });
      console.log('');

      // 询问用户确认
      console.log('⚠️  警告: 此操作将删除 ' + duplicatesToDelete.length + ' 条重复的告警记录');
      console.log('⚠️  删除标准: 相同的alarmId，保留最早创建的记录');
      console.log('⚠️  如需执行删除，请取消注释下方代码\n');

      /*
      console.log('开始删除重复的alarmId记录...');
      const deleteIds = duplicatesToDelete.map(d => d._id);
      const result = await Alarm.deleteMany({
        _id: { $in: deleteIds }
      });
      console.log(`✓ 已删除 ${result.deletedCount} 条重复记录\n`);
      */

      console.log('⚠️  注意: 删除功能已注释，如需执行请手动取消注释\n');
    } else {
      console.log('✓ 没有发现基于alarmId的重复记录\n');
    }

    // 统计结果
    console.log('═══════════════════════════════════════════════════\n');
    console.log('去重分析完成!\n');

    const uniqueAlarmIds = new Set(allAlarms.map(a => a.alarmId));
    console.log(`原始记录数: ${allAlarms.length}`);
    console.log(`唯一alarmId数: ${uniqueAlarmIds.size}`);
    console.log(`重复记录数: ${allAlarms.length - uniqueAlarmIds.size}\n`);

    // 验证电站205在2026-01-11的告警
    console.log('═══════════════════════════════════════════════════\n');
    console.log('验证电站205在2026-01-11的告警:\n');

    const station205Alarms = await Alarm.find({
      stationId: 205,
      startTime: {
        $gte: new Date('2026-01-11T00:00:00.000Z'),
        $lt: new Date('2026-01-12T00:00:00.000Z')
      }
    }).sort({ startTime: 1 });

    console.log(`电站205在2026-01-11的告警数: ${station205Alarms.length} 条\n`);

    // 检查是否还有重复的alarmId
    const alarmIdSet = new Set();
    let hasDuplicate = false;
    station205Alarms.forEach(alarm => {
      if (alarmIdSet.has(alarm.alarmId)) {
        hasDuplicate = true;
        console.log(`⚠️ 仍有重复: ${alarm.alarmId}`);
      }
      alarmIdSet.add(alarm.alarmId);
    });

    if (!hasDuplicate) {
      console.log('✓ 电站205在2026-01-11没有重复的alarmId\n');
    }

    // 显示告警列表
    if (station205Alarms.length > 0) {
      console.log('告警列表:\n');
      station205Alarms.forEach((alarm, idx) => {
        const startHour = alarm.startTime.getUTCHours();
        const startMinute = alarm.startTime.getUTCMinutes();
        console.log(`${String(idx + 1).padStart(2, ' ')}. ${alarm.alarmName} (${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')})`);
        console.log(`    alarmId: ${alarm.alarmId}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('去重失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

deduplicateAlarmsByIdOnly();
