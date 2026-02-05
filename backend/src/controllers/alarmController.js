const Alarm = require('../models/Alarm');
const Holiday = require('../models/Holiday');
const StationRevenue = require('../models/StationRevenue');
const {
  calculateAlarmLoss,
  calculateStationAlarmLosses,
  calculateLossByDevice
} = require('../services/alarmLossCalculator');

// 获取电站告警列表
exports.getAlarmsByStation = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    const alarms = await Alarm.findByStationAndDateRange(
      parseInt(stationId),
      new Date(startDate),
      new Date(endDate)
    );

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAlarms = alarms.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedAlarms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: alarms.length,
        pages: Math.ceil(alarms.length / limit)
      }
    });

  } catch (error) {
    console.error('获取告警列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警列表失败',
      error: error.message
    });
  }
};

// 计算单个告警的损失
exports.calculateSingleAlarmLoss = async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { regionId = '330000', userType = 0, voltageType = 1 } = req.query;

    // 查找告警
    const alarm = await Alarm.findOne({ alarmId });

    if (!alarm) {
      return res.status(404).json({
        success: false,
        message: '未找到该告警'
      });
    }

    // 计算损失
    const lossData = await calculateAlarmLoss(
      alarm,
      regionId,
      parseInt(userType),
      parseInt(voltageType)
    );

    res.json({
      success: true,
      data: lossData
    });

  } catch (error) {
    console.error('计算告警损失失败:', error);
    res.status(500).json({
      success: false,
      message: '计算告警损失失败',
      error: error.message
    });
  }
};

// 计算电站告警总损失
exports.calculateStationLosses = async (req, res) => {
  try {
    const { stationId } = req.params;
    const {
      startDate,
      endDate,
      regionId = '330000',
      userType = 0,
      voltageType = 1
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    const result = await calculateStationAlarmLosses(
      parseInt(stationId),
      new Date(startDate),
      new Date(endDate),
      regionId,
      parseInt(userType),
      parseInt(voltageType)
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('计算电站告警损失失败:', error);
    res.status(500).json({
      success: false,
      message: '计算电站告警损失失败',
      error: error.message
    });
  }
};

// 按设备类型统计告警损失
exports.getLossByDevice = async (req, res) => {
  try {
    const { stationId } = req.params;
    const {
      startDate,
      endDate,
      regionId = '330000',
      userType = 0,
      voltageType = 1
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    const result = await calculateLossByDevice(
      parseInt(stationId),
      new Date(startDate),
      new Date(endDate),
      regionId,
      parseInt(userType),
      parseInt(voltageType)
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('按设备统计告警损失失败:', error);
    res.status(500).json({
      success: false,
      message: '按设备统计告警损失失败',
      error: error.message
    });
  }
};

// 获取告警统计信息
exports.getAlarmStats = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    // 按告警类型统计
    const alarmStats = await Alarm.getAlarmStatsByStation(
      stationId,
      startDate,
      endDate
    );

    // 按设备统计
    const deviceStats = await Alarm.getDeviceStats(
      stationId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: {
        alarmStats,
        deviceStats
      }
    });

  } catch (error) {
    console.error('获取告警统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警统计失败',
      error: error.message
    });
  }
};

// 计算节假日损失
exports.calculateHolidayLosses = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('=== calculateHolidayLosses 开始 ===');
    console.log('电站ID:', stationId);
    console.log('开始日期:', startDate);
    console.log('结束日期:', endDate);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    // 1. 生成日期范围内的所有日期
    const dates = [];
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    console.log('生成的日期数组:', dates);
    console.log('日期数量:', dates.length);

    // 2. 查询节假日
    const holidayMap = await Holiday.checkHolidayDates(dates);

    console.log('节假日映射结果:', holidayMap);

    // 3. 筛选出节假日日期
    const holidayDates = dates.filter(date => holidayMap[date]);

    console.log('筛选出的节假日:', holidayDates);
    console.log('节假日数量:', holidayDates.length);

    if (holidayDates.length === 0) {
      console.log('=== 日期范围内没有节假日，返回0 ===');
      return res.json({
        success: true,
        data: {
          totalHolidayLoss: 0,
          holidayCount: 0,
          missingDataCount: 0,
          details: []
        }
      });
    }

    // 4. 查询这些节假日的收益数据
    // 注意：数据库中存储的日期有16小时偏移(UTC+8的两倍)
    // 例如：2026-01-01 存储为 2026-01-01T16:00:00.000Z
    const revenueRecords = await StationRevenue.find({
      stationId: parseInt(stationId),
      date: {
        $in: holidayDates.map(d => new Date(d + 'T16:00:00.000Z'))
      }
    }).sort({ date: 1 });

    console.log('查询到的收益记录数量:', revenueRecords.length);
    console.log('收益记录详情:', revenueRecords.map(r => ({
      date: r.date.toISOString().split('T')[0],
      expected: r.expectedRevenue,
      actual: r.actualRevenue
    })));

    // 5. 查询节假日名称
    // 注意：数据库中Holiday存储的日期格式也可能有偏移，需要匹配
    const holidays = await Holiday.find({
      date: {
        $in: holidayDates.map(d => new Date(d + 'T16:00:00.000Z'))
      }
    });
    const holidayNameMap = new Map();
    holidays.forEach(h => {
      const dateKey = h.date.toISOString().split('T')[0];
      holidayNameMap.set(dateKey, h.name);
    });

    // 6. 计算节假日损失
    let totalHolidayLoss = 0;
    const holidayLossDetails = revenueRecords.map(record => {
      const dailyLoss = record.expectedRevenue - record.actualRevenue;
      totalHolidayLoss += dailyLoss;

      const dateKey = record.date.toISOString().split('T')[0];
      return {
        date: record.date,
        dateStr: dateKey,
        holidayName: holidayNameMap.get(dateKey) || '周末',
        expectedRevenue: record.expectedRevenue,
        actualRevenue: record.actualRevenue,
        loss: dailyLoss
      };
    });

    console.log('计算出的节假日总损失:', totalHolidayLoss);
    console.log('损失详情:', holidayLossDetails);

    // 7. 返回结果
    const result = {
      totalHolidayLoss: Math.round(totalHolidayLoss * 100) / 100,
      holidayCount: revenueRecords.length,
      missingDataCount: holidayDates.length - revenueRecords.length,
      details: holidayLossDetails
    };

    console.log('=== calculateHolidayLosses 完成，返回结果 ===');
    console.log(result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('计算节假日损失失败:', error);
    res.status(500).json({
      success: false,
      message: '计算节假日损失失败',
      error: error.message
    });
  }
};

// 计算非计划性停机损失（工作日SOC无变化的损失）
exports.calculateUnplannedOutageLosses = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('=== calculateUnplannedOutageLosses 开始 ===');
    console.log('电站ID:', stationId);
    console.log('开始日期:', startDate);
    console.log('结束日期:', endDate);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    const SocData = require('../models/SocData');

    // 1. 生成日期范围内的所有日期
    const dates = [];
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    console.log('生成的日期数组:', dates);
    console.log('日期数量:', dates.length);

    // 2. 查询节假日（用于统计分类，但不排除）
    const holidayMap = await Holiday.checkHolidayDates(dates);

    console.log('节假日映射结果:', holidayMap);

    // 3. 对所有日期（包括节假日）分析SOC数据，找出无充放电的日期
    // 注意：非计划性停机优先级高于节假日，所有无充放电日期都计入
    const noChargingDays = [];

    for (const dateStr of dates) {
      // 将北京时间日期转换为UTC时间范围查询
      const [year, month, day] = dateStr.split('-').map(Number);
      const bjStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const bjEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const socRecords = await SocData.aggregate([
        {
          $match: {
            stationId: parseInt(stationId),
            timestamp: {
              $gte: bjStartOfDay,
              $lte: bjEndOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            minSoc: { $min: '$soc' },
            maxSoc: { $max: '$soc' },
            dataPoints: { $sum: 1 }
          }
        }
      ]);

      if (socRecords.length > 0) {
        const stats = socRecords[0];
        const socRange = stats.maxSoc - stats.minSoc;

        // 判断是否无充放电：SOC波动小于1%
        if (socRange < 1) {
          // 查询该天的完整SOC数据用于绘制曲线
          const socDataPoints = await SocData.find({
            stationId: parseInt(stationId),
            timestamp: {
              $gte: bjStartOfDay,
              $lte: bjEndOfDay
            }
          })
          .sort({ timestamp: 1 })
          .select('timestamp soc')
          .lean();

          const isHoliday = holidayMap[dateStr];
          noChargingDays.push({
            date: dateStr,
            minSoc: stats.minSoc,
            maxSoc: stats.maxSoc,
            socRange: socRange,
            dataPoints: stats.dataPoints,
            isHoliday: isHoliday,
            socData: socDataPoints.map(point => ({
              time: point.timestamp,
              soc: point.soc
            }))
          });
        }
      }
    }

    console.log('无充放电的天数:', noChargingDays.length);
    console.log('无充放电的日期:', noChargingDays.map(d => d.date));
    console.log('其中工作日:', noChargingDays.filter(d => !d.isHoliday).length);
    console.log('其中节假日:', noChargingDays.filter(d => d.isHoliday).length);

    if (noChargingDays.length === 0) {
      console.log('=== 所有日期都有正常充放电 ===');
      return res.json({
        success: true,
        data: {
          totalUnplannedOutageLoss: 0,
          totalDays: dates.length,
          noChargingDays: 0,
          details: []
        }
      });
    }

    // 4. 查询这些无充放电日期的收益数据
    const revenueRecords = await StationRevenue.find({
      stationId: parseInt(stationId),
      date: {
        $in: noChargingDays.map(d => new Date(d.date + 'T16:00:00.000Z'))
      }
    }).sort({ date: 1 });

    console.log('查询到的收益记录数量:', revenueRecords.length);

    // 5. 计算非计划性停机损失
    let totalUnplannedOutageLoss = 0;
    const lossDetails = revenueRecords.map(record => {
      const dailyLoss = record.expectedRevenue - record.actualRevenue;
      totalUnplannedOutageLoss += dailyLoss;

      const dateKey = record.date.toISOString().split('T')[0];
      const socInfo = noChargingDays.find(d => d.date === dateKey);

      return {
        date: record.date,
        dateStr: dateKey,
        expectedRevenue: record.expectedRevenue,
        actualRevenue: record.actualRevenue,
        loss: dailyLoss,
        socRange: socInfo ? socInfo.socRange : 0,
        dataPoints: socInfo ? socInfo.dataPoints : 0,
        isHoliday: socInfo ? socInfo.isHoliday : false,
        socData: socInfo ? socInfo.socData : [] // 添加SOC数据用于绘制曲线
      };
    });

    console.log('计算出的非计划性停机总损失:', totalUnplannedOutageLoss);

    // 6. 返回结果
    const workdays = dates.filter(date => !holidayMap[date]);
    const result = {
      stationId: parseInt(stationId),  // 添加 stationId 字段
      totalUnplannedOutageLoss: Math.round(totalUnplannedOutageLoss * 100) / 100,
      totalDays: dates.length,
      workdayCount: workdays.length,
      noChargingDays: revenueRecords.length,
      noChargingWorkdays: lossDetails.filter(d => !d.isHoliday).length,
      noChargingHolidays: lossDetails.filter(d => d.isHoliday).length,
      missingDataCount: noChargingDays.length - revenueRecords.length,
      details: lossDetails
    };

    console.log('=== calculateUnplannedOutageLosses 完成 ===');
    console.log(result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('计算非计划性停机损失失败:', error);
    res.status(500).json({
      success: false,
      message: '计算非计划性停机损失失败',
      error: error.message
    });
  }
};

module.exports = exports;
