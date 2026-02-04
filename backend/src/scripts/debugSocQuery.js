require('dotenv').config();
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const SocData = require('../models/SocData');
const ChargingStrategy = require('../models/ChargingStrategy');

async function debugSocQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 获取电站231在2025-12-22的第一个告警（11:50那个）
    const alarm = await Alarm.findOne({
      stationId: 231,
      startTime: {
        $gte: new Date('2025-12-22T03:50:00.000Z'), // 11:50 UTC+8 = 03:50 UTC
        $lt: new Date('2025-12-22T04:00:00.000Z')
      }
    });

    if (!alarm) {
      console.log('❌ 未找到告警');
      return;
    }

    console.log('=== 告警信息 ===');
    console.log('告警ID:', alarm.alarmId);
    console.log('设备:', alarm.device);
    console.log('gatewayDeviceId:', alarm.gatewayDeviceId);
    console.log('开始时间 (UTC):', alarm.startTime.toISOString());
    console.log('开始时间 (本地):', new Date(alarm.startTime.getTime() + 8*60*60*1000).toISOString());
    console.log('');

    // 获取充放电策略
    const alarmDate = new Date('2025-12-21T16:00:00.000Z'); // 2025-12-22 00:00 UTC+8
    const strategy = await ChargingStrategy.findOne({
      stationId: 231,
      date: alarmDate,
      isActive: true
    });

    if (!strategy) {
      console.log('❌ 未找到充放电策略');
      return;
    }

    console.log('=== 充放电策略 ===');
    strategy.timeslots.forEach((slot, i) => {
      const ctypeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '待机';
      console.log(`时段${i+1}: ${slot.stime}-${slot.etime}, ${ctypeName}, 功率: ${slot.power}kW`);
    });
    console.log('');

    // 模拟计算连续充电周期
    console.log('=== 连续周期计算 ===');
    const startMinuteOfDay = alarm.startTime.getUTCHours() * 60 + alarm.startTime.getUTCMinutes();
    console.log('故障发生时刻 (UTC分钟数):', startMinuteOfDay);

    // 找到故障所在周期
    let currentSlotIndex = -1;
    let ctype = null;
    for (let i = 0; i < strategy.timeslots.length; i++) {
      const slot = strategy.timeslots[i];
      const [sHour, sMinute] = slot.stime.split(':').map(Number);
      const [eHour, eMinute] = slot.etime.split(':').map(Number);
      const slotStartMinutes = sHour * 60 + sMinute;
      const slotEndMinutes = eHour * 60 + eMinute;

      let inSlot = false;
      if (slotEndMinutes < slotStartMinutes) {
        inSlot = startMinuteOfDay >= slotStartMinutes || startMinuteOfDay < slotEndMinutes;
      } else {
        inSlot = startMinuteOfDay >= slotStartMinutes && startMinuteOfDay < slotEndMinutes;
      }

      if (inSlot) {
        currentSlotIndex = i;
        ctype = slot.ctype;
        console.log(`故障所在周期: 时段${i+1} (${slot.stime}-${slot.etime}), 类型:${ctype}`);
        break;
      }
    }

    // 向后查找连续周期
    let lastSameCycleIndex = currentSlotIndex;
    for (let i = currentSlotIndex + 1; i < strategy.timeslots.length; i++) {
      const nextSlot = strategy.timeslots[i];
      if (nextSlot.ctype === ctype) {
        console.log(`  → 发现连续周期: 时段${i+1} (${nextSlot.stime}-${nextSlot.etime})`);
        lastSameCycleIndex = i;
      } else {
        console.log(`  ✗ 时段${i+1}类型不同，停止查找`);
        break;
      }
    }

    const lastSlot = strategy.timeslots[lastSameCycleIndex];
    console.log(`最后连续周期: 时段${lastSameCycleIndex+1} (${lastSlot.stime}-${lastSlot.etime})`);
    console.log('');

    // 构建检查时间
    const alarmDateLocal = new Date(alarm.startTime);
    alarmDateLocal.setHours(0, 0, 0, 0);

    const [lastEndHour, lastEndMinute] = lastSlot.etime.split(':').map(Number);
    const finalCycleEndTime = new Date(alarmDateLocal);
    finalCycleEndTime.setHours(lastEndHour, lastEndMinute, 0, 0);

    console.log('=== SOC查询时间分析 ===');
    console.log('告警日期基准 (本地):', alarmDateLocal.toISOString());
    console.log('周期结束时间 (本地构建):', finalCycleEndTime.toISOString());
    console.log('周期结束时间 (显示):', `${lastSlot.etime} (本地时间)`);
    console.log('');

    // 方法1：当前代码的逻辑（减8小时）
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
    const checkTimeUTC_v1 = new Date(finalCycleEndTime.getTime() - UTC_OFFSET_MS);
    console.log('方法1 (当前代码 - 减8小时):');
    console.log('  查询时间:', checkTimeUTC_v1.toISOString());

    const socRecord_v1 = await SocData.findOne({
      deviceId: alarm.gatewayDeviceId,
      timestamp: {
        $gte: new Date(checkTimeUTC_v1.getTime() - 5 * 60 * 1000),
        $lte: new Date(checkTimeUTC_v1.getTime() + 5 * 60 * 1000)
      }
    }).sort({ timestamp: -1 });

    if (socRecord_v1) {
      console.log('  ✓ 找到SOC记录:');
      console.log('    timestamp:', socRecord_v1.timestamp.toISOString());
      console.log('    SOC:', socRecord_v1.soc + '%');
    } else {
      console.log('  ✗ 未找到SOC记录');
    }
    console.log('');

    // 方法2：直接使用本地时间（不转换）
    console.log('方法2 (直接使用本地时间):');
    console.log('  查询时间:', finalCycleEndTime.toISOString());

    const socRecord_v2 = await SocData.findOne({
      deviceId: alarm.gatewayDeviceId,
      timestamp: {
        $gte: new Date(finalCycleEndTime.getTime() - 5 * 60 * 1000),
        $lte: new Date(finalCycleEndTime.getTime() + 5 * 60 * 1000)
      }
    }).sort({ timestamp: -1 });

    if (socRecord_v2) {
      console.log('  ✓ 找到SOC记录:');
      console.log('    timestamp:', socRecord_v2.timestamp.toISOString());
      console.log('    SOC:', socRecord_v2.soc + '%');
    } else {
      console.log('  ✗ 未找到SOC记录');
    }
    console.log('');

    // 方法3：查询15:00前后更大范围的数据
    const checkTime15 = new Date('2025-12-22T15:00:00+08:00');
    console.log('方法3 (15:00本地时间前后30分钟):');
    console.log('  目标时间:', checkTime15.toISOString(), '(15:00 UTC+8)');

    const socRecords = await SocData.find({
      deviceId: alarm.gatewayDeviceId,
      timestamp: {
        $gte: new Date(checkTime15.getTime() - 30 * 60 * 1000),
        $lte: new Date(checkTime15.getTime() + 30 * 60 * 1000)
      }
    }).sort({ timestamp: 1 });

    console.log(`  找到 ${socRecords.length} 条SOC记录:`);
    socRecords.forEach(record => {
      const localTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      console.log(`    ${localTime.toISOString().slice(11, 19)} (本地) - SOC: ${record.soc}%`);
    });

    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

debugSocQuery();
