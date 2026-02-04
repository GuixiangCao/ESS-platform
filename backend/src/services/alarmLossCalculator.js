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

    // 排除17:00-23:59:59时间段的告警
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

    // 获取该时刻的功率（从充放电策略）
    const powerInfo = getPowerAtTime(strategies[0], startMinuteOfDay);

    // 只计算在充电(ctype=1)或放电(ctype=2)周期内的告警损失
    if (!powerInfo || powerInfo.power <= 0 || (powerInfo.ctype !== 1 && powerInfo.ctype !== 2)) {
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
        calculationNote: '告警不在充电或放电周期内'
      };
    }

    // 获取该时刻的电价
    const price = priceData.getPriceAtTime(startMinuteOfDay);

    if (!price || price <= 0) {
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
        calculationNote: '未找到有效电价数据'
      };
    }

    // 初始化损失变量（等待SOC达标检查后再计算）
    totalLoss = 0;

    // 记录详细信息
    lossDetails.push({
      time: `${Math.floor(startMinuteOfDay / 60)}:${String(startMinuteOfDay % 60).padStart(2, '0')}`,
      power: powerInfo.power,
      price: price,
      ctype: powerInfo.ctype,
      ctypeName: powerInfo.ctype === 1 ? '充电' : '放电',
      durationHours: durationHours,
      calculatedLoss: 0  // 稍后根据SOC达标情况更新
    });

    // 计算基于SOC未达标的额外损失
    let socTargetLoss = 0;
    let socTargetDetails = null;
    let timeLoss = 0;

    // 获取设备容量
    const gateway = gateways[0]; // 使用第一个网关的容量
    if (gateway && gateway.capacity) {
      const socLossResult = await calculateSocTargetLoss(
        alarm,
        strategies[0],
        price,
        gateway.capacity,
        powerInfo
      );

      socTargetDetails = socLossResult;

      // 关键逻辑：根据SOC达标情况决定是否计算损失
      if (socLossResult.socTargetMet === false) {
        // SOC未达标：说明故障确实造成了影响，只计算时间损失
        timeLoss = durationHours * powerInfo.power * price;
        socTargetLoss = socLossResult.socTargetLoss || 0;  // 仅用于展示参考
        totalLoss = timeLoss;  // 只计算时间损失
      } else if (socLossResult.socTargetMet === true) {
        // SOC已达标：故障未造成实际影响，无损失
        timeLoss = 0;
        socTargetLoss = 0;
        totalLoss = 0;
      } else {
        // 无法判断SOC达标情况（socTargetMet === undefined）：按原逻辑计算时间损失
        timeLoss = durationHours * powerInfo.power * price;
        socTargetLoss = 0;
        totalLoss = timeLoss;
      }
    } else {
      // 如果没有容量数据，无法判断SOC达标情况，按原逻辑计算时间损失
      timeLoss = durationHours * powerInfo.power * price;
      totalLoss = timeLoss;
    }

    // 更新损失详情中的计算结果
    if (lossDetails.length > 0) {
      lossDetails[0].calculatedLoss = totalLoss;
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
      loss: Math.round(totalLoss * 1000) / 1000, // 保留3位小数精度
      timeLoss: Math.round(timeLoss * 1000) / 1000, // 时间损失（实际计入总损失）
      socTargetLoss: Math.round(socTargetLoss * 1000) / 1000, // SOC目标偏差（仅作参考，不计入总损失）
      lossDetails: lossDetails,
      socTargetDetails: socTargetDetails, // SOC目标损失详情
      calculationNote: '损失计算逻辑：检查周期结束时SOC是否达标。充电周期需达95%，放电周期需达8%。SOC未达标时，损失 = 时间损失（故障持续时长×功率×电价）；SOC达标时损失为0（故障未影响最终目标）。SOC目标偏差仅作参考，不计入总损失。仅计算充电和放电周期内的告警，排除17:00-23:59:59时段'
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
