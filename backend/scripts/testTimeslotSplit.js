const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');
const ChargingStrategy = require('../src/models/ChargingStrategy');
const ElectricityPrice = require('../src/models/ElectricityPrice');

/**
 * 按电价时段和充放电周期拆分告警时间段
 * @param {Date} startTime - 告警开始时间（UTC）
 * @param {Date} endTime - 告警结束时间（UTC）
 * @param {Object} strategy - 充放电策略
 * @param {Object} priceData - 电价数据
 * @returns {Array} 拆分后的时段数组
 */
function splitAlarmIntoTimeslots(startTime, endTime, strategy, priceData) {
  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
  const EXCLUDE_START = 17 * 60; // 17:00
  const EXCLUDE_END = 24 * 60;   // 23:59

  const timeslots = [];
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    // 转换为北京时间
    const currentLocal = new Date(currentTime.getTime() + UTC_OFFSET_MS);
    const currentMinute = currentLocal.getUTCHours() * 60 + currentLocal.getUTCMinutes();
    const currentDate = new Date(currentLocal.getUTCFullYear(), currentLocal.getUTCMonth(), currentLocal.getUTCDate());

    // 跳过 17:00-23:59 时段
    if (currentMinute >= EXCLUDE_START) {
      // 跳到第二天 00:00
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayUTC = new Date(nextDay.getTime() - UTC_OFFSET_MS);
      currentTime = nextDayUTC;
      continue;
    }

    // 获取当前时刻的功率信息
    const powerInfo = getPowerAtTime(strategy, currentMinute);
    if (!powerInfo || powerInfo.power <= 0 || (powerInfo.ctype !== 1 && powerInfo.ctype !== 2)) {
      // 跳过非充放电时段，跳到下一个充放电时段
      const nextSlotStart = findNextChargingSlot(strategy, currentMinute);
      if (nextSlotStart === null || nextSlotStart >= EXCLUDE_START) {
        // 没有下一个时段了，跳到第二天
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayUTC = new Date(nextDay.getTime() - UTC_OFFSET_MS);
        currentTime = nextDayUTC;
        continue;
      }

      // 跳到下一个时段
      const nextSlotTime = new Date(currentDate);
      nextSlotTime.setUTCHours(Math.floor(nextSlotStart / 60), nextSlotStart % 60, 0, 0);
      const nextSlotUTC = new Date(nextSlotTime.getTime() - UTC_OFFSET_MS);
      currentTime = nextSlotUTC;
      continue;
    }

    // 当前时段的结束时间：取以下最早者
    // 1. 告警结束时间
    // 2. 当前充放电时段结束时间
    // 3. 当前电价时段结束时间
    // 4. 17:00（排除时段开始）
    // 5. 当天结束 23:59:59

    const slotEnd = powerInfo.slotEnd; // 当前充放电时段结束分钟数
    const priceEnd = getPriceSlotEnd(priceData, currentMinute);
    const excludeStartMinute = EXCLUDE_START;

    const candidateEnds = [
      slotEnd,
      priceEnd,
      excludeStartMinute,
      EXCLUDE_END
    ].filter(m => m > currentMinute);

    const segmentEndMinute = Math.min(...candidateEnds);

    // 构造时段结束时间
    let segmentEndTime;
    if (segmentEndMinute >= EXCLUDE_END) {
      // 到达当天结束，跳到第二天
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      segmentEndTime = new Date(nextDay.getTime() - UTC_OFFSET_MS);
    } else {
      const segmentEndLocal = new Date(currentDate);
      segmentEndLocal.setUTCHours(Math.floor(segmentEndMinute / 60), segmentEndMinute % 60, 0, 0);
      segmentEndTime = new Date(segmentEndLocal.getTime() - UTC_OFFSET_MS);
    }

    // 取告警结束时间和时段结束时间的最小值
    segmentEndTime = new Date(Math.min(segmentEndTime.getTime(), endTime.getTime()));

    // 计算该时段的持续时间（小时）
    const durationMs = segmentEndTime.getTime() - currentTime.getTime();
    const durationHours = durationMs / 1000 / 60 / 60;

    if (durationHours > 0) {
      // 获取该时段的电价
      const price = priceData.getPriceAtTime(currentMinute);

      timeslots.push({
        startTime: new Date(currentTime),
        endTime: new Date(segmentEndTime),
        startMinute: currentMinute,
        endMinute: segmentEndMinute,
        durationHours: durationHours,
        power: powerInfo.power,
        price: price,
        ctype: powerInfo.ctype,
        ctypeName: powerInfo.ctype === 1 ? '充电' : '放电',
        date: currentDate
      });
    }

    // 移动到下一个时段
    currentTime = segmentEndTime;
  }

  return timeslots;
}

/**
 * 获取指定时刻的功率信息
 */
function getPowerAtTime(strategy, minuteOfDay) {
  if (!strategy || !strategy.timeslots) return null;

  for (const slot of strategy.timeslots) {
    const stime = timeToMinutes(slot.stime);
    const etime = timeToMinutes(slot.etime);

    if (minuteOfDay >= stime && minuteOfDay < etime) {
      return {
        power: slot.power || 0,
        ctype: slot.ctype,
        slotEnd: etime
      };
    }
  }

  return null;
}

/**
 * 查找下一个充放电时段的开始时间
 */
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

/**
 * 获取电价时段结束时间
 */
function getPriceSlotEnd(priceData, currentMinute) {
  if (!priceData || !priceData.timingPrice) return 24 * 60;

  for (const slot of priceData.timingPrice) {
    if (currentMinute >= slot.startTime && currentMinute < slot.endTime) {
      return slot.endTime;
    }
  }

  return 24 * 60;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 测试用例：使用实际的告警数据
async function testTimeslotSplit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    // 查询那个跨天的告警
    const alarm = await Alarm.findOne({ alarmId: '986a3968-343b-4487-91f3-9db727fafc87' }).lean();

    if (!alarm) {
      console.log('未找到告警');
      return;
    }

    console.log('测试告警时段拆分\n');
    console.log('告警ID:', alarm.alarmId);
    console.log('设备:', alarm.device);
    console.log('开始时间(UTC):', alarm.startTime);
    console.log('结束时间(UTC):', alarm.endTime);
    console.log('开始时间(北京):', new Date(alarm.startTime.getTime() + 8*60*60*1000).toISOString());
    console.log('结束时间(北京):', new Date(alarm.endTime.getTime() + 8*60*60*1000).toISOString());
    console.log('总持续时长:', alarm.durationMinutes, '分钟\n');

    // 获取充放电策略
    const startDate = new Date(alarm.startTime);
    startDate.setHours(0, 0, 0, 0);

    const strategies = await ChargingStrategy.find({
      stationId: alarm.stationId,
      date: startDate,
      isActive: true
    });

    if (!strategies || strategies.length === 0) {
      console.log('未找到充放电策略');
      return;
    }

    // 获取电价数据
    const priceData = await ElectricityPrice.findPriceByDate(
      '330000',
      startDate,
      0,
      1
    );

    if (!priceData) {
      console.log('未找到电价数据');
      return;
    }

    console.log('─'.repeat(100));
    console.log('拆分后的时段:\n');

    const timeslots = splitAlarmIntoTimeslots(
      alarm.startTime,
      alarm.endTime,
      strategies[0],
      priceData
    );

    console.log(`共拆分为 ${timeslots.length} 个时段\n`);

    let totalLoss = 0;

    timeslots.forEach((slot, index) => {
      const startBJ = new Date(slot.startTime.getTime() + 8*60*60*1000)
        .toISOString().replace('T', ' ').substring(0, 19);
      const endBJ = new Date(slot.endTime.getTime() + 8*60*60*1000)
        .toISOString().replace('T', ' ').substring(0, 19);

      const loss = slot.durationHours * slot.power * slot.price;
      totalLoss += loss;

      console.log(`[${index + 1}]`);
      console.log(`  时间: ${startBJ} → ${endBJ}`);
      console.log(`  持续: ${slot.durationHours.toFixed(4)} 小时`);
      console.log(`  类型: ${slot.ctypeName}`);
      console.log(`  功率: ${slot.power} kW`);
      console.log(`  电价: ${slot.price} 元/kWh`);
      console.log(`  损失: ${loss.toFixed(2)} 元`);
      console.log();
    });

    console.log('─'.repeat(100));
    console.log(`总损失（拆分计算）: ¥${totalLoss.toFixed(2)}`);
    console.log('原损失（不拆分）:   ¥3920.28');
    console.log('差异:              ¥' + (totalLoss - 3920.28).toFixed(2));
    console.log('─'.repeat(100));

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testTimeslotSplit();
