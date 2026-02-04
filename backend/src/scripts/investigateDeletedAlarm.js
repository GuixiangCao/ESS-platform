const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function investigateDeletedAlarm() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const deletedAlarmId = '35917343-fec5-468e-85e8-5fd7ad334533';

    console.log('调查被删除的告警记录\n');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`目标告警ID: ${deletedAlarmId}\n`);

    // 1. 检查这条告警是否还存在
    console.log('【1】检查告警是否仍存在于数据库:\n');
    const alarm = await Alarm.findOne({ alarmId: deletedAlarmId });

    if (alarm) {
      console.log('✓ 告警仍然存在:');
      console.log(`  告警名称: ${alarm.alarmName}`);
      console.log(`  电站: ${alarm.stationId}`);
      console.log(`  设备: ${alarm.device}`);
      console.log(`  startTime: ${alarm.startTime.toISOString()}`);
      console.log(`  alarmDate: ${alarm.alarmDate.toISOString()}`);
      console.log(`  创建时间: ${alarm.createdAt ? alarm.createdAt.toISOString() : 'N/A'}`);
      console.log('');
    } else {
      console.log('✗ 告警已被删除\n');
    }

    // 2. 查询原始4条告警的相关信息
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【2】原始4条告警的详细信息:\n');

    const originalAlarmIds = [
      'e0a39f85-94a4-435c-b53f-413e49370b43',
      '35917343-fec5-468e-85e8-5fd7ad334533',
      '90b4e568-fe22-4433-af39-6eb364c6a52f',
      '07548f01-61ee-40f4-af6c-ed4160ead363'
    ];

    const existingAlarms = [];

    for (const alarmId of originalAlarmIds) {
      const a = await Alarm.findOne({ alarmId });
      if (a) {
        existingAlarms.push(a);
        console.log(`✓ ${alarmId}`);
        console.log(`  告警名称: ${a.alarmName}`);
        console.log(`  电站: ${a.stationId}`);
        console.log(`  设备: ${a.device}`);
        console.log(`  startTime: ${a.startTime.toISOString()}`);
        console.log(`  endTime: ${a.endTime.toISOString()}`);
        console.log(`  alarmDate: ${a.alarmDate.toISOString()}`);
        console.log(`  创建时间: ${a.createdAt ? a.createdAt.toISOString() : 'N/A'}`);
        console.log('');
      } else {
        console.log(`✗ ${alarmId} - 已删除\n`);
      }
    }

    // 3. 查找与被删除告警相似的记录（可能的重复项）
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【3】查找可能的重复告警:\n');
    console.log('（与原始4条告警时间、名称相近的其他告警）\n');

    // 基于现有3条告警的时间范围，查找相似的告警
    if (existingAlarms.length > 0) {
      const timeRange = 60 * 1000; // 60秒范围

      for (const existingAlarm of existingAlarms) {
        const startTime = new Date(existingAlarm.startTime);
        const searchStart = new Date(startTime.getTime() - timeRange);
        const searchEnd = new Date(startTime.getTime() + timeRange);

        const similarAlarms = await Alarm.find({
          stationId: 205,
          device: existingAlarm.device,
          alarmName: existingAlarm.alarmName,
          startTime: {
            $gte: searchStart,
            $lte: searchEnd
          },
          alarmId: { $ne: existingAlarm.alarmId }
        });

        if (similarAlarms.length > 0) {
          console.log(`与 ${existingAlarm.alarmId.substring(0, 8)}... 相似的告警:`);
          console.log(`  基准时间: ${existingAlarm.startTime.toISOString()}`);
          console.log(`  基准名称: ${existingAlarm.alarmName}`);
          console.log(`  找到 ${similarAlarms.length} 条相似告警:`);

          similarAlarms.forEach(similar => {
            const timeDiff = Math.abs(similar.startTime.getTime() - existingAlarm.startTime.getTime()) / 1000;
            console.log(`    - ${similar.alarmId.substring(0, 8)}... 时间差: ${timeDiff.toFixed(0)}秒`);
            console.log(`      startTime: ${similar.startTime.toISOString()}`);
            console.log(`      创建时间: ${similar.createdAt ? similar.createdAt.toISOString() : 'N/A'}`);
          });
          console.log('');
        }
      }
    }

    // 4. 查询电站205在1月11日前后的所有告警（11:55时间段）
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【4】查询电站205在2026-01-11 11:55附近的所有告警:\n');

    const targetTime = new Date('2026-01-11T11:55:00.000Z');
    const searchStart = new Date(targetTime.getTime() - 5 * 60 * 1000); // 前5分钟
    const searchEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);   // 后5分钟

    const nearbyAlarms = await Alarm.find({
      stationId: 205,
      startTime: {
        $gte: searchStart,
        $lte: searchEnd
      }
    }).sort({ startTime: 1 });

    console.log(`时间范围: ${searchStart.toISOString()} - ${searchEnd.toISOString()}`);
    console.log(`找到 ${nearbyAlarms.length} 条告警:\n`);

    nearbyAlarms.forEach((a, idx) => {
      const isOriginal = originalAlarmIds.includes(a.alarmId);
      const marker = isOriginal ? ' ⬅ 原始4条之一' : '';

      console.log(`${idx + 1}. ${a.alarmName}${marker}`);
      console.log(`   告警ID: ${a.alarmId}`);
      console.log(`   startTime: ${a.startTime.toISOString()}`);
      console.log(`   endTime: ${a.endTime.toISOString()}`);
      console.log(`   alarmDate: ${a.alarmDate.toISOString()}`);
      console.log(`   创建时间: ${a.createdAt ? a.createdAt.toISOString() : 'N/A'}`);
      console.log('');
    });

    // 5. 分析去重的可能原因
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【5】去重分析:\n');

    if (nearbyAlarms.length > 3) {
      console.log('发现告警���量 > 3条，说明存在重复。\n');

      // 按业务逻辑分组
      const businessGroups = {};
      nearbyAlarms.forEach(a => {
        const key = `${a.stationId}_${a.device}_${a.alarmName}_${a.startTime.toISOString()}`;
        if (!businessGroups[key]) {
          businessGroups[key] = [];
        }
        businessGroups[key].push(a);
      });

      console.log('按业务逻辑（电站+设备+名称+时间）分组:\n');
      Object.keys(businessGroups).forEach((key, idx) => {
        const group = businessGroups[key];
        if (group.length > 1) {
          console.log(`分组 ${idx + 1}: ${group.length} 条重复`);
          group.forEach((a, i) => {
            const isDeleted = a.alarmId === deletedAlarmId;
            const status = isDeleted ? ' ⬅ 已删除' : ' ⬅ 保留';
            console.log(`  ${i + 1}. ${a.alarmId.substring(0, 8)}... (创建于 ${a.createdAt ? a.createdAt.toISOString().substring(0, 19) : 'N/A'})${status}`);
          });
          console.log('');
        }
      });

      // 如果找不到精确时间匹配，尝试秒级匹配
      const secondGroups = {};
      nearbyAlarms.forEach(a => {
        const startTimeSecond = new Date(a.startTime);
        startTimeSecond.setMilliseconds(0);
        const key = `${a.stationId}_${a.device}_${a.alarmName}_${startTimeSecond.toISOString()}`;
        if (!secondGroups[key]) {
          secondGroups[key] = [];
        }
        secondGroups[key].push(a);
      });

      console.log('按业务逻辑（精确到秒）分组:\n');
      Object.keys(secondGroups).forEach((key, idx) => {
        const group = secondGroups[key];
        if (group.length > 1) {
          console.log(`分组 ${idx + 1}: ${group.length} 条重复`);
          group.forEach((a, i) => {
            const isDeleted = a.alarmId === deletedAlarmId;
            const isOriginal = originalAlarmIds.includes(a.alarmId);
            let status = '';
            if (isDeleted) status = ' ⬅ 已删除（原始）';
            else if (isOriginal) status = ' ⬅ 保留（原始）';
            else status = ' ⬅ 保留';

            console.log(`  ${i + 1}. ${a.alarmId.substring(0, 8)}...`);
            console.log(`     startTime: ${a.startTime.toISOString()}`);
            console.log(`     创建时间: ${a.createdAt ? a.createdAt.toISOString() : 'N/A'}${status}`);
          });
          console.log('');
        }
      });
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【6】结论:\n');
    console.log(`告警 ${deletedAlarmId} 被去重脚本删除。\n`);
    console.log('可能的原因：');
    console.log('  1. 与其他告警存在完全相同的业务逻辑键（电站+设备+名称+时间）');
    console.log('  2. 去重脚本保留了创建时间更早的记录');
    console.log('  3. 该告警与其他3条告警在同一时间段内，但存在细微差异\n');

  } catch (error) {
    console.error('调查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

investigateDeletedAlarm();
