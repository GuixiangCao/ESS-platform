const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');
const ChargingStrategy = require('../src/models/ChargingStrategy');
const ElectricityPrice = require('../src/models/ElectricityPrice');

// 简化的测试，直接测试拆分函数
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function findNextChargingSlot(strategy, currentMinute) {
  if (!strategy || !strategy.timeslots) return null;

  for (const slot of strategy.timeslots) {
    const stime = timeToMinutes(slot.stime);
    if (stime > currentMinute && (slot.ctype === 1 || slot.ctype === 2) && slot.power > 0) {
      return stime;
    }
  }

  return null;
}

function getPriceSlotEnd(priceData, currentMinute) {
  if (!priceData || !priceData.timingPrice) return 24 * 60;

  for (const slot of priceData.timingPrice) {
    if (currentMinute >= slot.startTime && currentMinute < slot.endTime) {
      return slot.endTime;
    }
  }

  return 24 * 60;
}

function splitAlarmIntoTimeslots(startTime, endTime, strategy, priceData) {
  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
  const EXCLUDE_START = 17 * 60; // 17:00
  const EXCLUDE_END = 24 * 60;   // 23:59

  const timeslots = [];
  let currentTime = new Date(startTime);
  let iterations = 0;
  const MAX_ITERATIONS = 20; // Lower limit for debug

  console.log(`开始拆分: ${startTime} → ${endTime}`);

  while (currentTime < endTime && iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`\n=== 第${iterations}次迭代 ===`);

    // 转换为北京时间
    const currentLocal = new Date(currentTime.getTime() + UTC_OFFSET_MS);
    const currentMinute = currentLocal.getUTCHours() * 60 + currentLocal.getUTCMinutes();
    const currentDate = new Date(currentLocal.getUTCFullYear(), currentLocal.getUTCMonth(), currentLocal.getUTCDate());

    console.log(`当前UTC时间: ${currentTime.toISOString()}`);
    console.log(`当前北京时间: ${currentLocal.toISOString()}`);
    console.log(`当前分钟: ${currentMinute} (${Math.floor(currentMinute/60)}:${currentMinute%60})`);

    // 跳过 17:00-23:59 时段
    if (currentMinute >= EXCLUDE_START) {
      console.log(`跳过排除时段 (>= ${EXCLUDE_START}分钟)`);
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayUTC = new Date(nextDay.getTime() - UTC_OFFSET_MS);
      console.log(`跳到第二天00:00: ${nextDayUTC.toISOString()}`);
      currentTime = nextDayUTC;
      continue;
    }

    // 获取功率信息
    let powerInfo = null;
    if (strategy && strategy.timeslots) {
      for (const slot of strategy.timeslots) {
        const stime = timeToMinutes(slot.stime);
        const etime = timeToMinutes(slot.etime);
        if (currentMinute >= stime && currentMinute < etime) {
          powerInfo = {
            power: slot.power || 0,
            ctype: slot.ctype,
            slotEnd: etime
          };
          break;
        }
      }
    }

    if (!powerInfo) {
      console.log(`未找到功率信息`);
      const nextSlotStart = findNextChargingSlot(strategy, currentMinute);
      console.log(`下一个充放电时段开始: ${nextSlotStart}`);

      if (nextSlotStart === null || nextSlotStart >= EXCLUDE_START) {
        console.log(`没有下一个时段，跳到第二天`);
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayUTC = new Date(nextDay.getTime() - UTC_OFFSET_MS);
        currentTime = nextDayUTC;
        continue;
      }

      console.log(`跳到下一个时段: ${Math.floor(nextSlotStart/60)}:${nextSlotStart%60}`);
      const nextSlotTime = new Date(currentDate);
      nextSlotTime.setUTCHours(Math.floor(nextSlotStart / 60), nextSlotStart % 60, 0, 0);
      const nextSlotUTC = new Date(nextSlotTime.getTime() - UTC_OFFSET_MS);
      currentTime = nextSlotUTC;
      continue;
    }

    console.log(`功率: ${powerInfo.power}kW, 类型: ${powerInfo.ctype}, 时段结束: ${powerInfo.slotEnd}`);

    if (powerInfo.power <= 0 || (powerInfo.ctype !== 1 && powerInfo.ctype !== 2)) {
      console.log(`功率无效或不是充放电周期`);
      const nextSlotStart = findNextChargingSlot(strategy, currentMinute);

      if (nextSlotStart === null || nextSlotStart >= EXCLUDE_START) {
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayUTC = new Date(nextDay.getTime() - UTC_OFFSET_MS);
        currentTime = nextDayUTC;
        continue;
      }

      const nextSlotTime = new Date(currentDate);
      nextSlotTime.setUTCHours(Math.floor(nextSlotStart / 60), nextSlotStart % 60, 0, 0);
      const nextSlotUTC = new Date(nextSlotTime.getTime() - UTC_OFFSET_MS);
      currentTime = nextSlotUTC;
      continue;
    }

    // 找结束时间
    const slotEnd = powerInfo.slotEnd;
    const priceEnd = getPriceSlotEnd(priceData, currentMinute);

    console.log(`候选结束时间: slotEnd=${slotEnd}, priceEnd=${priceEnd}, EXCLUDE_START=${EXCLUDE_START}`);

    const candidateEnds = [slotEnd, priceEnd, EXCLUDE_START, EXCLUDE_END].filter(m => m > currentMinute);
    const segmentEndMinute = Math.min(...candidateEnds);

    console.log(`选择的结束分钟: ${segmentEndMinute}`);

    let segmentEndTime;
    if (segmentEndMinute >= EXCLUDE_END) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      segmentEndTime = new Date(nextDay.getTime() - UTC_OFFSET_MS);
    } else {
      const segmentEndLocal = new Date(currentDate);
      segmentEndLocal.setUTCHours(Math.floor(segmentEndMinute / 60), segmentEndMinute % 60, 0, 0);
      segmentEndTime = new Date(segmentEndLocal.getTime() - UTC_OFFSET_MS);
    }

    segmentEndTime = new Date(Math.min(segmentEndTime.getTime(), endTime.getTime()));

    const durationMs = segmentEndTime.getTime() - currentTime.getTime();
    const durationHours = durationMs / 1000 / 60 / 60;

    console.log(`时段: ${currentTime.toISOString()} → ${segmentEndTime.toISOString()} (${durationHours.toFixed(2)}h)`);

    if (durationHours > 0) {
      const price = priceData.getPriceAtTime(currentMinute);
      timeslots.push({
        startTime: new Date(currentTime),
        endTime: new Date(segmentEndTime),
        durationHours,
        power: powerInfo.power,
        price,
        ctype: powerInfo.ctype
      });
      console.log(`✅ 添加时段，损失: ${(durationHours * powerInfo.power * price).toFixed(2)}元`);
    }

    currentTime = segmentEndTime;
  }

  console.log(`\n完成拆分，共${timeslots.length}个时段`);
  return timeslots;
}

async function debugTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const alarm = await Alarm.findOne({ alarmId: '986a3968-343b-4487-91f3-9db727fafc87' }).lean();
    const alarmDate = new Date(alarm.startTime);
    alarmDate.setHours(0, 0, 0, 0);

    const strategies = await ChargingStrategy.find({
      stationId: alarm.stationId,
      date: alarmDate,
      isActive: true
    });

    const priceData = await ElectricityPrice.findPriceByDate('330000', alarmDate, 0, 1);

    console.log('\n充放电策略:');
    strategies[0].timeslots.forEach(slot => {
      console.log(`  ${slot.stime}-${slot.etime}: ${slot.power}kW, ctype=${slot.ctype}`);
    });

    console.log('\n电价数据:');
    priceData.timingPrice.forEach(slot => {
      console.log(`  ${slot.startTime}-${slot.endTime}分钟: ${slot.price}元/kWh`);
    });

    console.log('\n\n开始测试拆分...\n');
    const timeslots = splitAlarmIntoTimeslots(
      alarm.startTime,
      alarm.endTime,
      strategies[0],
      priceData
    );

    console.log('\n\n最终结果:');
    let totalLoss = 0;
    timeslots.forEach((slot, i) => {
      const loss = slot.durationHours * slot.power * slot.price;
      totalLoss += loss;
      console.log(`${i+1}. ${slot.durationHours.toFixed(2)}h × ${slot.power}kW × ¥${slot.price} = ¥${loss.toFixed(2)}`);
    });
    console.log(`\n总损失: ¥${totalLoss.toFixed(2)}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

debugTest();
