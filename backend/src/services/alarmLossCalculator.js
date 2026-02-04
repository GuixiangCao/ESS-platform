const Alarm = require('../models/Alarm');
const ChargingStrategy = require('../models/ChargingStrategy');
const ElectricityPrice = require('../models/ElectricityPrice');
const StationGateway = require('../models/StationGateway');
const SocData = require('../models/SocData');
const Holiday = require('../models/Holiday');

/**
 * 合并重叠的时间区间
 * @param {Array} intervals - 时间区间数组 [{start: Date, end: Date, ...}, ...]
 * @returns {Array} 合并后的时间区间数组
 */
function mergeTimeIntervals(intervals) {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  // 按开始时间排序
  const sorted = intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // 如果当前区间与上一个区间重叠或相邻（允许1秒误差）
    if (current.start.getTime() <= last.end.getTime() + 1000) {
      // 合并区间，取最晚的结束时间
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      // 保留所有相关告警ID
      if (!last.alarmIds) {
        last.alarmIds = [last.alarmId];
      }
      last.alarmIds.push(current.alarmId);
    } else {
      // 不重叠，添加新区间
      merged.push(current);
    }
  }

  return merged;
}

/**
 * 将时间字符串 HH:MM 转换为分钟数
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
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
  let iterations = 0;
  const MAX_ITERATIONS = 1000; // 防止无限循环

  while (currentTime < endTime && iterations < MAX_ITERATIONS) {
    iterations++;

    // 转换为北京时间
    const currentLocal = new Date(currentTime.getTime() + UTC_OFFSET_MS);
    const currentMinute = currentLocal.getUTCHours() * 60 + currentLocal.getUTCMinutes();

    // 获取当前的日期（北京时区，但用UTC方法读取）
    const currentYear = currentLocal.getUTCFullYear();
    const currentMonth = currentLocal.getUTCMonth();
    const currentDay = currentLocal.getUTCDate();

    // 跳过 17:00-23:59 时段
    if (currentMinute >= EXCLUDE_START) {
      // 跳到第二天 00:00（北京时间）
      // 构造第二天00:00的UTC时间
      const nextDayUTC = Date.UTC(currentYear, currentMonth, currentDay + 1, 0, 0, 0, 0) - UTC_OFFSET_MS;
      currentTime = new Date(nextDayUTC);
      continue;
    }

    // 获取当前时刻的功率信息
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

    if (!powerInfo || powerInfo.power <= 0 || (powerInfo.ctype !== 1 && powerInfo.ctype !== 2)) {
      // 跳过非充放电时段，跳到下一个充放电时段
      const nextSlotStart = findNextChargingSlot(strategy, currentMinute);
      if (nextSlotStart === null || nextSlotStart >= EXCLUDE_START) {
        // 没有下一个时段了，跳到第二天
        const nextDayUTC = Date.UTC(currentYear, currentMonth, currentDay + 1, 0, 0, 0, 0) - UTC_OFFSET_MS;
        currentTime = new Date(nextDayUTC);
        continue;
      }

      // 跳到下一个时段（当天的某个时刻）
      const nextSlotHour = Math.floor(nextSlotStart / 60);
      const nextSlotMinute = nextSlotStart % 60;
      const nextSlotUTC = Date.UTC(currentYear, currentMonth, currentDay, nextSlotHour, nextSlotMinute, 0, 0) - UTC_OFFSET_MS;
      currentTime = new Date(nextSlotUTC);
      continue;
    }

    // 当前时段的结束时间：取以下最早者
    const slotEnd = powerInfo.slotEnd;
    const priceEnd = getPriceSlotEnd(priceData, currentMinute);

    const candidateEnds = [
      slotEnd,
      priceEnd,
      EXCLUDE_START,
      EXCLUDE_END
    ].filter(m => m > currentMinute);

    if (candidateEnds.length === 0) {
      // 没有候选结束时间，跳到第二天
      const nextDayUTC = Date.UTC(currentYear, currentMonth, currentDay + 1, 0, 0, 0, 0) - UTC_OFFSET_MS;
      currentTime = new Date(nextDayUTC);
      continue;
    }

    const segmentEndMinute = Math.min(...candidateEnds);

    // 构造时段结束时间（北京时间的某个时刻）
    let segmentEndTime;
    if (segmentEndMinute >= EXCLUDE_END) {
      // 到达当天结束，跳到第二天
      const nextDayUTC = Date.UTC(currentYear, currentMonth, currentDay + 1, 0, 0, 0, 0) - UTC_OFFSET_MS;
      segmentEndTime = new Date(nextDayUTC);
    } else {
      const segmentEndHour = Math.floor(segmentEndMinute / 60);
      const segmentEndMin = segmentEndMinute % 60;
      const segmentEndUTC = Date.UTC(currentYear, currentMonth, currentDay, segmentEndHour, segmentEndMin, 0, 0) - UTC_OFFSET_MS;
      segmentEndTime = new Date(segmentEndUTC);
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
        date: new Date(currentYear, currentMonth, currentDay)
      });
    }

    // 移动到下一个时段
    currentTime = segmentEndTime;
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn('splitAlarmIntoTimeslots: 达到最大迭代次数，可能存在无限循环');
  }

  return timeslots;
}

/**
 * 将 Date 对象转换为当天的分钟数
 */
function dateToMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * 检查时间点是否在时段内
 */
function isTimeInSlot(timeInMinutes, slotStart, slotEnd) {
  // 处理跨天的情况
  if (slotEnd < slotStart) {
    return timeInMinutes >= slotStart || timeInMinutes < slotEnd;
  }
  return timeInMinutes >= slotStart && timeInMinutes < slotEnd;
}

/**
 * 获取指定时间点的充放电功率
 */
function getPowerAtTime(chargingStrategy, timeInMinutes) {
  if (!chargingStrategy || !chargingStrategy.timeslots) {
    return null;
  }

  for (const slot of chargingStrategy.timeslots) {
    const slotStart = timeToMinutes(slot.stime);
    const slotEnd = timeToMinutes(slot.etime);

    if (isTimeInSlot(timeInMinutes, slotStart, slotEnd)) {
      return {
        power: slot.power || 0,
        ctype: slot.ctype,
        slotStart,
        slotEnd
      };
    }
  }

  return null;
}

/**
 * 计算基于SOC未达标的损失
 * @param {Object} alarm - 告警对象
 * @param {Object} chargingStrategy - 充放电策略
 * @param {Number} price - 电价
 * @param {Number} capacity - 设备容量(kWh)
 * @param {Object} powerInfo - 功率信息
 */
async function calculateSocTargetLoss(alarm, chargingStrategy, price, capacity, powerInfo) {
  try {
    if (!powerInfo || !capacity || capacity <= 0) {
      return {
        socTargetLoss: 0,
        socTargetNote: '缺少必要参数',
        socTargetMet: undefined  // 无法判断
      };
    }

    const { ctype, slotEnd } = powerInfo;
    const { startTime, endTime } = alarm;

    // 只处理充电(ctype=1)或放电(ctype=2)周期
    if (ctype !== 1 && ctype !== 2) {
      return {
        socTargetLoss: 0,
        socTargetNote: '不在充放电周期内',
        socTargetMet: undefined  // 无法判断
      };
    }

    // 获取告警日期（转换为本地时间 UTC+8）
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
    const startTimeLocal = new Date(startTime.getTime() + UTC_OFFSET_MS);
    const alarmDateLocal = new Date(startTimeLocal);
    alarmDateLocal.setUTCHours(0, 0, 0, 0);  // 使用UTC方法设置为当天00:00，但日期已经是本地的

    // 找到故障所在周期在时段列表中的索引
    let currentSlotIndex = -1;
    for (let i = 0; i < chargingStrategy.timeslots.length; i++) {
      const slot = chargingStrategy.timeslots[i];
      const [sHour, sMinute] = slot.stime.split(':').map(Number);
      const [eHour, eMinute] = slot.etime.split(':').map(Number);
      const slotStartMinutes = sHour * 60 + sMinute;
      const slotEndMinutes = eHour * 60 + eMinute;

      if (slotEndMinutes === slotEnd) {
        currentSlotIndex = i;
        break;
      }
    }

    if (currentSlotIndex === -1) {
      return {
        socTargetLoss: 0,
        socTargetNote: '无法定位故障所在周期',
        socTargetMet: undefined  // 无法判断
      };
    }

    // 从当前周期开始，向后查找所有连续的相同类型周期
    let lastSameCycleIndex = currentSlotIndex;
    for (let i = currentSlotIndex + 1; i < chargingStrategy.timeslots.length; i++) {
      const nextSlot = chargingStrategy.timeslots[i];
      if (nextSlot.ctype === ctype) {
        // 下一个周期也是相同类型，继续
        lastSameCycleIndex = i;
      } else {
        // 下一个周期不是相同类型，停止
        break;
      }
    }

    // 计算最后一个相同类型周期的结束时间（本地时间）
    const lastSlot = chargingStrategy.timeslots[lastSameCycleIndex];
    const [lastEndHour, lastEndMinute] = lastSlot.etime.split(':').map(Number);
    const finalCycleEndTimeLocal = new Date(alarmDateLocal);
    finalCycleEndTimeLocal.setUTCHours(lastEndHour, lastEndMinute, 0, 0);

    // 始终使用周期结束时间来检查SOC，因为我们要评估的是
    // "故障导致充放电周期未能达到目标SOC"，而不是"故障期间的SOC变化"
    const checkTimeLocal = finalCycleEndTimeLocal;

    // 记录周期信息用于日志
    let cycleRangeNote = '';
    if (lastSameCycleIndex === currentSlotIndex) {
      const slot = chargingStrategy.timeslots[currentSlotIndex];
      cycleRangeNote = `${slot.stime}-${slot.etime}`;
    } else {
      const firstSlot = chargingStrategy.timeslots[currentSlotIndex];
      const lastSlot = chargingStrategy.timeslots[lastSameCycleIndex];
      cycleRangeNote = `${firstSlot.stime}-${lastSlot.etime} (连续${lastSameCycleIndex - currentSlotIndex + 1}个周期)`;
    }

    // 查找告警相关的设备ID
    // 从告警的gatewayDeviceId获取设备信息
    if (!alarm.gatewayDeviceId) {
      return {
        socTargetLoss: 0,
        socTargetNote: '告警缺少设备ID信息',
        socTargetMet: undefined  // 无法判断
      };
    }

    // 查询周��结束时刻的SOC数据
    // checkTimeLocal是本地时间，需要转换为UTC时间查询数据库
    const checkTimeUTC = new Date(checkTimeLocal.getTime() - UTC_OFFSET_MS);

    // 查询目标时间前后的SOC记录，找到最接近的那条
    const socRecords = await SocData.find({
      deviceId: alarm.gatewayDeviceId,
      timestamp: {
        $gte: new Date(checkTimeUTC.getTime() - 2 * 60 * 1000), // 前2分钟
        $lte: new Date(checkTimeUTC.getTime() + 2 * 60 * 1000)  // 后2分钟
      }
    }).sort({ timestamp: 1 });  // 升序排序

    if (!socRecords || socRecords.length === 0) {
      return {
        socTargetLoss: 0,
        socTargetNote: '未找到周期结束时的SOC数据',
        socTargetMet: undefined  // 无法判断
      };
    }

    // 找到最接近目标时间的记录
    let socRecord = socRecords[0];
    let minTimeDiff = Math.abs(socRecords[0].timestamp.getTime() - checkTimeUTC.getTime());

    for (let i = 1; i < socRecords.length; i++) {
      const timeDiff = Math.abs(socRecords[i].timestamp.getTime() - checkTimeUTC.getTime());
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        socRecord = socRecords[i];
      }
    }

    const actualSoc = socRecord.soc;
    let socTargetLoss = 0;
    let socTargetNote = '';
    let socTargetMet = false;  // 是否达到SOC目标

    // 充电周期：检查是否达到95%
    if (ctype === 1) {
      const targetSoc = 95;
      if (actualSoc < targetSoc) {
        // 未达标：计算损失
        const socDeficit = targetSoc - actualSoc;
        socTargetLoss = (socDeficit / 100) * capacity * price;
        socTargetNote = `连续充电周期${cycleRangeNote}结束时SOC=${actualSoc.toFixed(2)}%，未达到目标95%（极大值），亏损电量=${socDeficit.toFixed(2)}%`;
        socTargetMet = false;
      } else {
        // 已达标：无损失
        socTargetNote = `连续充电周期${cycleRangeNote}结束时SOC=${actualSoc.toFixed(2)}%，已达到目标95%`;
        socTargetMet = true;
      }
    }
    // 放电周期：检查是否达到8%
    else if (ctype === 2) {
      const targetSoc = 8;
      if (actualSoc > targetSoc) {
        // 未达标：计算损失
        const socSurplus = actualSoc - targetSoc;
        socTargetLoss = (socSurplus / 100) * capacity * price;
        socTargetNote = `连续放电周期${cycleRangeNote}结束时SOC=${actualSoc.toFixed(2)}%，未达到目标8%（极小值），未放电量=${socSurplus.toFixed(2)}%`;
        socTargetMet = false;
      } else {
        // 已达标：无损失
        socTargetNote = `连续放电周期${cycleRangeNote}结束时SOC=${actualSoc.toFixed(2)}%，已达到目标8%`;
        socTargetMet = true;
      }
    }

    return {
      socTargetLoss: Math.round(socTargetLoss * 1000) / 1000,
      socTargetNote,
      socTargetMet,  // 返回是否达标的标志
      actualSocAtCycleEnd: actualSoc,
      cycleEndTime: checkTimeLocal.toISOString(),
      socCheckTime: checkTimeUTC.toISOString()
    };

  } catch (error) {
    console.error('计算SOC目标损失失败:', error);
    return {
      socTargetLoss: 0,
      socTargetNote: `计算失败: ${error.message}`,
      socTargetMet: undefined  // 无法判断
    };
  }
}

/**
 * 计算单个告警的损失
 * @param {Object} alarm - 告警对象
 * @param {String} regionId - 地区代码（如 330000）
 * @param {Number} userType - 用户类型（0: 工商业, 1: 居民）
 * @param {Number} voltageType - 电压等级
 */
async function calculateAlarmLoss(alarm, regionId = '330000', userType = 0, voltageType = 1) {
  try {
    const { stationId, startTime, endTime, alarmName } = alarm;

    // 0. 排除不会造成停机的故障类型
    const nonStopAlarms = [
      '直流输入电控开关开路'
    ];

    if (nonStopAlarms.includes(alarmName)) {
      return {
        alarmId: alarm.alarmId,
        alarmName: alarm.alarmName,
        device: alarm.device,
        gatewayDeviceId: alarm.gatewayDeviceId || null,
        startTime: alarm.startTime,
        endTime: alarm.endTime,
        durationMinutes: alarm.durationMinutes,
        durationHours: Math.round((alarm.durationMinutes / 60) * 1000000) / 1000000,
        loss: 0,
        lossDetails: [],
        calculationNote: '此类故障不会造成停机，无需计算损失'
      };
    }

    // 1. 获取电站的网关信息
    const gateways = await StationGateway.findByStationId(stationId);
    if (!gateways || gateways.length === 0) {
      return {
        alarmId: alarm.alarmId,
        loss: 0,
        reason: '未找到电站网关信息'
      };
    }

    // 2. 获取告警日期的充放电策略
    const alarmDate = new Date(startTime);
    alarmDate.setHours(0, 0, 0, 0);

    const strategies = await ChargingStrategy.find({
      stationId,
      date: alarmDate,
      isActive: true
    });

    if (!strategies || strategies.length === 0) {
      return {
        alarmId: alarm.alarmId,
        loss: 0,
        reason: '未找到充放电策略数据'
      };
    }

    // 3. 获取电价数据
    const priceData = await ElectricityPrice.findPriceByDate(
      regionId,
      alarmDate,
      userType,
      voltageType
    );

    if (!priceData) {
      return {
        alarmId: alarm.alarmId,
        loss: 0,
        reason: '未找到电价数据'
      };
    }

    // 4. 计算告警期间的损失
    let totalLoss = 0;
    const lossDetails = [];

    // 计算实际持续时长（以小时为单位，高精度）
    const durationHours = Math.round((alarm.durationMinutes / 60) * 1000000) / 1000000;

    // 获取开始和结束时刻（转换为UTC+8本地时间）
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
    const startDateLocal = new Date(startTime.getTime() + UTC_OFFSET_MS);
    const endDateLocal = new Date(endTime.getTime() + UTC_OFFSET_MS);

    // 使用UTC方法获取小时和分钟（因为已经加上了8小时偏移，UTC方法返回的就是本地时间）
    const startMinuteOfDay = startDateLocal.getUTCHours() * 60 + startDateLocal.getUTCMinutes();
    const endMinuteOfDay = endDateLocal.getUTCHours() * 60 + endDateLocal.getUTCMinutes();

    // 排除17:00-23:59:59时间段开始的告警（但允许从之前时段延续到此时段的告警）
    if (startMinuteOfDay >= 1020) {
      return {
        alarmId: alarm.alarmId,
        alarmName: alarm.alarmName,
        device: alarm.device,
        gatewayDeviceId: alarm.gatewayDeviceId || null, // 网关设备ID
        startTime: alarm.startTime,
        endTime: alarm.endTime,
        durationMinutes: alarm.durationMinutes,
        durationHours: durationHours,
        loss: 0,
        lossDetails: [],
        calculationNote: '告警发生在17:00-23:59:59排除时段内'
      };
    }

    // 使用时段拆分算法计算损失
    // 将告警时间段按电价区间、充放电周期、日期边界进行拆分
    const timeslots = splitAlarmIntoTimeslots(
      startTime,
      endTime,
      strategies[0],
      priceData
    );

    // 如果没有有效时段（全部在排除时段或非充放电周期）
    if (!timeslots || timeslots.length === 0) {
      return {
        alarmId: alarm.alarmId,
        alarmName: alarm.alarmName,
        device: alarm.device,
        gatewayDeviceId: alarm.gatewayDeviceId || null,
        startTime: alarm.startTime,
        endTime: alarm.endTime,
        durationMinutes: alarm.durationMinutes,
        durationHours: durationHours,
        loss: 0,
        lossDetails: [],
        calculationNote: '告警全部在排除时段或非充放电周期内'
      };
    }

    // 计算每个时段的损失并汇总
    totalLoss = 0;
    let timeLoss = 0;

    timeslots.forEach(slot => {
      const slotLoss = slot.durationHours * slot.power * slot.price;
      totalLoss += slotLoss;
      timeLoss += slotLoss;

      // 记录每个时段的详细信息
      const startBJ = new Date(slot.startTime.getTime() + UTC_OFFSET_MS);
      const endBJ = new Date(slot.endTime.getTime() + UTC_OFFSET_MS);

      lossDetails.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        startTimeStr: `${startBJ.getUTCFullYear()}-${String(startBJ.getUTCMonth() + 1).padStart(2, '0')}-${String(startBJ.getUTCDate()).padStart(2, '0')} ${String(startBJ.getUTCHours()).padStart(2, '0')}:${String(startBJ.getUTCMinutes()).padStart(2, '0')}`,
        endTimeStr: `${endBJ.getUTCFullYear()}-${String(endBJ.getUTCMonth() + 1).padStart(2, '0')}-${String(endBJ.getUTCDate()).padStart(2, '0')} ${String(endBJ.getUTCHours()).padStart(2, '0')}:${String(endBJ.getUTCMinutes()).padStart(2, '0')}`,
        durationHours: Math.round(slot.durationHours * 10000) / 10000,
        power: slot.power,
        price: slot.price,
        ctype: slot.ctype,
        ctypeName: slot.ctypeName,
        calculatedLoss: Math.round(slotLoss * 100) / 100
      });
    });

    // SOC达标检查（保留原有逻辑，但仅作为参考）
    let socTargetLoss = 0;
    let socTargetDetails = null;

    const gateway = gateways[0];
    if (gateway && gateway.capacity) {
      // 使用第一个时段的功率信息进行SOC达标检查
      const firstSlot = timeslots[0];
      const firstPowerInfo = {
        power: firstSlot.power,
        ctype: firstSlot.ctype
      };

      const socLossResult = await calculateSocTargetLoss(
        alarm,
        strategies[0],
        firstSlot.price,
        gateway.capacity,
        firstPowerInfo
      );

      socTargetDetails = socLossResult;
      socTargetLoss = socLossResult.socTargetLoss || 0;

      // 注意：时段拆分模式下，我们始终计算时间损失
      // SOC达标情况仅作为参考信息，不影响最终损失计算
    }

    return {
      alarmId: alarm.alarmId,
      alarmName: alarm.alarmName,
      device: alarm.device,
      gatewayDeviceId: alarm.gatewayDeviceId || null, // 网关设备ID
      startTime: alarm.startTime,
      endTime: alarm.endTime,
      durationMinutes: alarm.durationMinutes,
      durationHours: durationHours,
      loss: Math.round(totalLoss * 100) / 100, // 保留2位小数精度
      timeLoss: Math.round(timeLoss * 100) / 100, // 时间损失（按时段拆分计算）
      socTargetLoss: Math.round(socTargetLoss * 100) / 100, // SOC目标偏差（仅作参考）
      lossDetails: lossDetails,
      socTargetDetails: socTargetDetails,
      timeslotCount: timeslots.length, // 拆分的时段数量
      calculationNote: `损失计算使用时段拆分算法：将告警时间段按电价区间、充放电周期、日期边界自动拆分为${timeslots.length}个时段，每个时段使用对应的功率和电价单独计算损失后汇总。自动排除17:00-23:59:59时段和非充放电周期。此方法确保跨天、跨电价区间的告警损失计算准确。`
    };

  } catch (error) {
    console.error('计算告警损失失败:', error);
    return {
      alarmId: alarm.alarmId,
      loss: 0,
      error: error.message
    };
  }
}

/**
 * 批量计算告警损失
 * @param {Number} stationId - 电站ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {String} regionId - 地区代码
 * @param {Number} userType - 用户类型
 * @param {Number} voltageType - 电压等级
 */
async function calculateStationAlarmLosses(
  stationId,
  startDate,
  endDate,
  regionId = '330000',
  userType = 0,
  voltageType = 1
) {
  try {
    // 获取时间段内的所有告警
    const alarms = await Alarm.findByStationAndDateRange(stationId, startDate, endDate);

    if (!alarms || alarms.length === 0) {
      return {
        stationId,
        alarmCount: 0,
        totalLoss: 0,
        workdayAlarmCount: 0,
        holidayAlarmCount: 0,
        alarms: []
      };
    }

    // 批量查询节假日标记
    const alarmDates = alarms.map(alarm =>
      new Date(alarm.startTime).toISOString().split('T')[0]
    );
    const holidayMap = await Holiday.checkHolidayDates(alarmDates);

    // 第一步：计算每个告警的损失（用于展示）
    const alarmsWithLoss = [];
    let holidayAlarmCount = 0;
    let workdayAlarmCount = 0;

    for (const alarm of alarms) {
      const alarmDateKey = new Date(alarm.startTime).toISOString().split('T')[0];
      const isHoliday = holidayMap[alarmDateKey] || false;

      // 计算损失（无论是否节假日都正常计算，用于展示）
      const lossData = await calculateAlarmLoss(alarm, regionId, userType, voltageType);

      // 添加节假日标记
      const alarmWithHolidayFlag = {
        ...lossData,
        isHoliday
      };

      alarmsWithLoss.push(alarmWithHolidayFlag);

      if (!isHoliday) {
        workdayAlarmCount++;
      } else {
        holidayAlarmCount++;
      }
    }

    // 第二步：按网关和日期分组，合并时间重叠的告警来计算实际总损失
    const groupKey = (alarm) => {
      const dateKey = new Date(alarm.startTime).toISOString().split('T')[0];
      const gatewayId = alarm.device || 'unknown';
      return `${dateKey}_${gatewayId}`;
    };

    // 按网关和日期分组
    const alarmGroups = {};
    for (const alarm of alarms) {
      const key = groupKey(alarm);
      if (!alarmGroups[key]) {
        alarmGroups[key] = [];
      }
      alarmGroups[key].push(alarm);
    }

    // 对每组合并时间并计算实际损失
    let workdayLoss = 0;

    for (const [groupKey, groupAlarms] of Object.entries(alarmGroups)) {
      // 检查是否为工作日
      const sampleAlarm = groupAlarms[0];
      const alarmDateKey = new Date(sampleAlarm.startTime).toISOString().split('T')[0];
      const isHoliday = holidayMap[alarmDateKey] || false;

      // 只计算工作日的损失
      if (isHoliday) {
        continue;
      }

      // 提取时间区间
      const intervals = groupAlarms.map(alarm => ({
        start: new Date(alarm.startTime),
        end: new Date(alarm.endTime),
        alarmId: alarm.alarmId,
        device: alarm.device
      }));

      // 合并重叠的时间区间
      const mergedIntervals = mergeTimeIntervals(intervals);

      // 对每个合并后的时间段计算损失
      for (const interval of mergedIntervals) {
        // 创建一个虚拟告警对象，包含合并后的时间段
        // 注意：sampleAlarm可能是Mongoose文档，需要转换为普通对象
        const sampleAlarmObj = sampleAlarm.toObject ? sampleAlarm.toObject() : sampleAlarm;

        const mergedAlarm = {
          ...sampleAlarmObj,
          startTime: interval.start,
          endTime: interval.end,
          durationMinutes: (interval.end - interval.start) / 1000 / 60
        };

        // 计算这个合并时间段的损失
        const mergedLossData = await calculateAlarmLoss(mergedAlarm, regionId, userType, voltageType);
        workdayLoss += mergedLossData.loss || 0;
      }
    }

    // 按损失从大到小排序
    alarmsWithLoss.sort((a, b) => (b.loss || 0) - (a.loss || 0));

    return {
      stationId,
      dateRange: {
        start: startDate,
        end: endDate
      },
      alarmCount: alarms.length,
      workdayAlarmCount,
      holidayAlarmCount,
      totalLoss: Math.round(workdayLoss * 100) / 100, // 只统计工作日告警损失
      averageLossPerAlarm: workdayAlarmCount > 0
        ? Math.round((workdayLoss / workdayAlarmCount) * 100) / 100
        : 0,
      alarms: alarmsWithLoss,
      summary: {
        maxLoss: alarmsWithLoss[0]?.loss || 0,
        minLoss: alarmsWithLoss[alarmsWithLoss.length - 1]?.loss || 0,
        totalDurationHours: alarms.reduce((sum, a) => sum + (a.durationMinutes / 60), 0).toFixed(2),
        workdayLoss: Math.round(workdayLoss * 100) / 100
      }
    };

  } catch (error) {
    console.error('批量计算告警损失失败:', error);
    throw error;
  }
}

/**
 * 按设备类型统计告警损失
 */
async function calculateLossByDevice(stationId, startDate, endDate, regionId = '330000', userType = 0, voltageType = 1) {
  try {
    const result = await calculateStationAlarmLosses(stationId, startDate, endDate, regionId, userType, voltageType);

    // 按设备类型分组统计
    const deviceStats = {};

    result.alarms.forEach(alarm => {
      const device = alarm.device || 'unknown';
      if (!deviceStats[device]) {
        deviceStats[device] = {
          device,
          count: 0,
          totalLoss: 0,
          totalDurationMinutes: 0
        };
      }

      deviceStats[device].count += 1;
      deviceStats[device].totalLoss += alarm.loss || 0;
      deviceStats[device].totalDurationMinutes += alarm.durationMinutes || 0;
    });

    // 转换为数组并排序
    const statsArray = Object.values(deviceStats).map(stat => ({
      ...stat,
      totalLoss: Math.round(stat.totalLoss * 100) / 100,
      averageLoss: Math.round((stat.totalLoss / stat.count) * 100) / 100,
      totalDurationHours: (stat.totalDurationMinutes / 60).toFixed(2)
    })).sort((a, b) => b.totalLoss - a.totalLoss);

    return {
      stationId,
      dateRange: result.dateRange,
      totalLoss: result.totalLoss,
      deviceStats: statsArray
    };

  } catch (error) {
    console.error('按设备统计告警损失失败:', error);
    throw error;
  }
}

module.exports = {
  calculateAlarmLoss,
  calculateStationAlarmLosses,
  calculateLossByDevice
};
