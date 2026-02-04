const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 告警去重脚本
 * 1. 基于alarmId去重（唯一标识）
 * 2. 基于业务逻辑去重（相同电站、设备、时间、告警名称）
 */
async function deduplicateAlarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('告警数据去重处理\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 获取所有告警
    const allAlarms = await Alarm.find({}).sort({ createdAt: 1 });
    console.log(`数据库中共有 ${allAlarms.length} 条告警\n`);

    // ==================== 方法1：基于alarmId去重 ====================
    console.log('【方法1】基于alarmId去重（保留最早创建的记录）\n');

    const alarmIdMap = new Map();
    const duplicatesByAlarmId = [];

    allAlarms.forEach(alarm => {
      if (alarmIdMap.has(alarm.alarmId)) {
        // 发现重复，标记为删除
        duplicatesByAlarmId.push(alarm._id);
      } else {
        // 第一次出现，记录
        alarmIdMap.set(alarm.alarmId, alarm._id);
      }
    });

    console.log(`基于alarmId的重复记录: ${duplicatesByAlarmId.length} 条\n`);

    if (duplicatesByAlarmId.length > 0) {
      console.log('删除重复的alarmId记录...');
      const result1 = await Alarm.deleteMany({
        _id: { $in: duplicatesByAlarmId }
      });
      console.log(`✓ 已删除 ${result1.deletedCount} 条重复记录\n`);
    }

    // ==================== 方法2：基于业务逻辑去重 ====================
    console.log('【方法2】基于业务逻辑去重（相同电站、设备、时间范围内的相同告警）\n');

    // 重新查询（因为可能已删除部分数据）
    const remainingAlarms = await Alarm.find({}).sort({ stationId: 1, startTime: 1 });
    console.log(`剩余告警数: ${remainingAlarms.length} 条\n`);

    // 按业务逻辑分组
    const businessKeyMap = new Map();
    const duplicatesByBusiness = [];

    remainingAlarms.forEach(alarm => {
      // 业务唯一键：电站+设备+告警名称+开始时间（精确到秒）
      const businessKey = `${alarm.stationId}_${alarm.device}_${alarm.alarmName}_${alarm.startTime.toISOString()}`;

      if (businessKeyMap.has(businessKey)) {
        // 发现重复，比较创建时间，保留最早的
        const existingAlarm = businessKeyMap.get(businessKey);
        if (alarm.createdAt > existingAlarm.createdAt) {
          // 当前告警更晚，删除当前
          duplicatesByBusiness.push({
            deleteId: alarm._id,
            alarmId: alarm.alarmId,
            reason: '业务逻辑重复'
          });
        } else {
          // 已存在的更晚，删除已存在的，保留当前
          duplicatesByBusiness.push({
            deleteId: existingAlarm._id,
            alarmId: existingAlarm.alarmId,
            reason: '业务逻辑重复'
          });
          businessKeyMap.set(businessKey, alarm);
        }
      } else {
        businessKeyMap.set(businessKey, alarm);
      }
    });

    console.log(`基于业务逻辑的重复记录: ${duplicatesByBusiness.length} 条\n`);

    if (duplicatesByBusiness.length > 0) {
      console.log('前10条重复记录示例:');
      duplicatesByBusiness.slice(0, 10).forEach((dup, idx) => {
        console.log(`  ${idx + 1}. alarmId: ${dup.alarmId.substring(0, 20)}... (${dup.reason})`);
      });
      console.log('');

      console.log('删除业务逻辑重复的记录...');
      const deleteIds = duplicatesByBusiness.map(d => d.deleteId);
      const result2 = await Alarm.deleteMany({
        _id: { $in: deleteIds }
      });
      console.log(`✓ 已删除 ${result2.deletedCount} 条重复记录\n`);
    }

    // ==================== 统计结果 ====================
    console.log('═══════════════════════════════════════════════════\n');
    console.log('去重完成!\n');

    const finalCount = await Alarm.countDocuments();
    const totalDeleted = allAlarms.length - finalCount;

    console.log(`原始记录数: ${allAlarms.length}`);
    console.log(`去重后记录数: ${finalCount}`);
    console.log(`删除记录数: ${totalDeleted}\n`);

    // 验证电站205在2026-01-11的告警
    console.log('═══════════════════════════════════════════════════\n');
    console.log('验证电站205在2026-01-11的告警:\n');

    const [year, month, day] = '2026-01-11'.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const station205Alarms = await Alarm.find({
      stationId: 205,
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`电站205在2026-01-11的告警数: ${station205Alarms.length} 条\n`);

    // 检查是否还有重复
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
      console.log('✓ 电站205在2026-01-11没有重复的告警\n');
    }

    // 显示告警列表
    if (station205Alarms.length > 0) {
      console.log('告警列表:\n');
      station205Alarms.forEach((alarm, idx) => {
        const startHour = alarm.startTime.getUTCHours();
        const startMinute = alarm.startTime.getUTCMinutes();
        console.log(`${String(idx + 1).padStart(2, ' ')}. ${alarm.alarmName} (${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')})`);
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

deduplicateAlarms();
