require('dotenv').config();
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const ChargingStrategy = require('../models/ChargingStrategy');
const ElectricityPrice = require('../models/ElectricityPrice');

async function showLossCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 231;
    const targetDate = new Date('2025-12-22T00:00:00.000Z');  // UTC时间
    const nextDay = new Date('2025-12-23T00:00:00.000Z');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`电站231 - 2025-12-22 时间损失计算详解`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 获取该日的告警
    const alarms = await Alarm.find({
      stationId,
      startTime: {
        $gte: targetDate,
        $lt: nextDay
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${alarms.length} 条告警\n`);

    // 获取充放电策略（策略日期使用UTC+8本地日期）
    const alarmDate = new Date('2025-12-21T16:00:00.000Z');  // 2025-12-22 00:00 UTC+8对应的UTC时间

    const strategy = await ChargingStrategy.findOne({
      stationId,
      date: alarmDate,
      isActive: true
    });

    if (!strategy) {
      console.log('❌ 未找到充放电策略');
      return;
    }

    console.log('📋 充放电策略:');
    strategy.timeslots.forEach((slot, i) => {
      const ctypeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '待机';
      console.log(`  时段${i+1}: ${slot.stime}-${slot.etime}, ${ctypeName}, 功率: ${slot.power}kW`);
    });
    console.log('');

    // 获取电价
    const priceData = await ElectricityPrice.findPriceByDate(
      '330000',
      alarmDate,
      0,
      1
    );

    console.log('💰 电价信息:');
    if (priceData && priceData.timeslots) {
      priceData.timeslots.forEach((slot, i) => {
        console.log(`  时段${i+1}: ${slot.stime}-${slot.etime}, 电价: ¥${slot.price}/kWh`);
      });
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // 计算每个告警的损失
    let totalTimeLoss = 0;

    for (let i = 0; i < alarms.length; i++) {
      const alarm = alarms[i];
      console.log(`📍 告警 ${i + 1}/${alarms.length}`);
      console.log('─'.repeat(80));
      console.log(`告警ID: ${alarm.alarmId}`);
      console.log(`设备: ${alarm.device}`);
      console.log(`告警名称: ${alarm.alarmName || '未知'}`);
      console.log(`开始时间: ${alarm.startTime.toISOString()} (UTC)`);
      console.log(`        = ${new Date(alarm.startTime.getTime() + 8*60*60*1000).toISOString().replace('T', ' ').replace('Z', '')} (UTC+8)`);
      console.log(`结束时间: ${alarm.endTime.toISOString()} (UTC)`);
      console.log(`        = ${new Date(alarm.endTime.getTime() + 8*60*60*1000).toISOString().replace('T', ' ').replace('Z', '')} (UTC+8)`);
      console.log(`持续时长: ${alarm.durationMinutes} 分钟`);

      const durationHours = Math.round((alarm.durationMinutes / 60) * 1000000) / 1000000;
      console.log(`        = ${durationHours} 小时`);

      // 获取开始时刻（UTC+8）
      const startDate = new Date(alarm.startTime);
      const startMinuteOfDay = startDate.getHours() * 60 + startDate.getMinutes();
      const startHour = Math.floor(startMinuteOfDay / 60);
      const startMinute = startMinuteOfDay % 60;

      console.log(`\n故障发生时刻（当天分钟数）: ${startMinuteOfDay} 分钟`);
      console.log(`               = ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`);

      // 检查是否在排除时段
      if (startMinuteOfDay >= 1020) {
        console.log(`\n⚠️  此告警在17:00-23:59:59排除时段内，不计算损失`);
        console.log(`时间损失: ¥0.00\n`);
        continue;
      }

      // 查找该时刻的充放电策略
      let powerInfo = null;
      for (const slot of strategy.timeslots) {
        const [sHour, sMinute] = slot.stime.split(':').map(Number);
        const [eHour, eMinute] = slot.etime.split(':').map(Number);
        const slotStart = sHour * 60 + sMinute;
        const slotEnd = eHour * 60 + eMinute;

        let inSlot = false;
        if (slotEnd < slotStart) {
          // 跨天
          inSlot = startMinuteOfDay >= slotStart || startMinuteOfDay < slotEnd;
        } else {
          inSlot = startMinuteOfDay >= slotStart && startMinuteOfDay < slotEnd;
        }

        if (inSlot) {
          powerInfo = {
            power: slot.power,
            ctype: slot.ctype,
            slotTime: `${slot.stime}-${slot.etime}`
          };
          break;
        }
      }

      if (!powerInfo || powerInfo.power <= 0 || (powerInfo.ctype !== 1 && powerInfo.ctype !== 2)) {
        console.log(`\n⚠️  此告警不在充电或放电周期内，不计算损失`);
        console.log(`时间损失: ¥0.00\n`);
        continue;
      }

      const ctypeName = powerInfo.ctype === 1 ? '充电' : '放电';
      console.log(`\n所在周期: ${powerInfo.slotTime} (${ctypeName})`);
      console.log(`功率: ${powerInfo.power} kW`);

      // 获取该时刻的电价
      let price = null;
      if (priceData && priceData.timeslots) {
        for (const slot of priceData.timeslots) {
          const [sHour, sMinute] = slot.stime.split(':').map(Number);
          const [eHour, eMinute] = slot.etime.split(':').map(Number);
          const slotStart = sHour * 60 + sMinute;
          const slotEnd = eHour * 60 + eMinute;

          let inSlot = false;
          if (slotEnd < slotStart) {
            inSlot = startMinuteOfDay >= slotStart || startMinuteOfDay < slotEnd;
          } else {
            inSlot = startMinuteOfDay >= slotStart && startMinuteOfDay < slotEnd;
          }

          if (inSlot) {
            price = slot.price;
            console.log(`电价: ¥${price}/kWh (${slot.stime}-${slot.etime})`);
            break;
          }
        }
      }

      if (!price || price <= 0) {
        console.log(`\n⚠️  未找到有效电价，不计算损失`);
        console.log(`时间损失: ¥0.00\n`);
        continue;
      }

      // 计算时间损失
      const timeLoss = durationHours * powerInfo.power * price;

      console.log(`\n📐 时间损失计算公式:`);
      console.log(`   损失 = 持续时长(小时) × 功率(kW) × 电价(元/kWh)`);
      console.log(`   损失 = ${durationHours} × ${powerInfo.power} × ${price}`);
      console.log(`   损失 = ¥${timeLoss.toFixed(2)}`);

      totalTimeLoss += timeLoss;
      console.log('');
    }

    console.log('='.repeat(80));
    console.log(`\n💵 总时间损失: ¥${totalTimeLoss.toFixed(2)}\n`);

    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    await mongoose.connection.close();
  }
}

showLossCalculation();
