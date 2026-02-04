const express = require('express');
const router = express.Router();
const Alarm = require('../models/Alarm');
const alarmController = require('../controllers/alarmController');

/**
 * 格式化小时数，移除末尾的0
 * 例如: 2.50 -> "2.5", 3.00 -> "3", 1.23 -> "1.23"
 */
function formatHours(minutes) {
  const hours = minutes / 60;
  // 保留两位小数，然后转换为数字再转回字符串，自动去除末尾的0
  return parseFloat(hours.toFixed(2)).toString();
}

/**
 * 获取电站告警统计（包含全量告警）
 * GET /api/alarms/station/:stationId/stats
 */
router.get('/station/:stationId/stats', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    // 构建查询条件
    const query = {
      stationId: parseInt(stationId)
    };

    // 如果提供了日期范围，添加到查询条件
    if (startDate && endDate) {
      // 用户传入的日期是UTC+8本地日期，需要转换为UTC时间范围查询
      const parseUTC8Date = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时的毫秒数
        // 构建UTC+8本地时间00:00
        const localDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        // 减去8小时，转换为UTC时间
        return new Date(localDate.getTime() - UTC_OFFSET_MS);
      };

      const start = parseUTC8Date(startDate);
      const end = parseUTC8Date(endDate);
      // 将结束日期设置为第二天的UTC+8时间00:00（即UTC时间16:00前一天）
      end.setDate(end.getDate() + 1);

      query.startTime = {
        $gte: start,
        $lt: end
      };
    }

    // 按设备类型统计告警数量和累计时长
    const deviceStats = await Alarm.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationMinutes' },
          avgDuration: { $avg: '$durationMinutes' },
          maxDuration: { $max: '$durationMinutes' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 计算总数和总时长
    const totalCount = deviceStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = deviceStats.reduce((sum, stat) => sum + stat.totalDuration, 0);

    // 转换设备代码为中文名称
    const deviceNameMap = {
      lc: 'LC设备',
      pcs: 'PCS设备',
      cluster: '簇控设备',
      meter: '电表',
      highMeter: '高压电表',
      ac: '空调',
      ems: 'EMS系统'
    };

    // 格式化统计结果
    const formattedStats = deviceStats.map(stat => ({
      device: stat._id,
      deviceName: deviceNameMap[stat._id] || stat._id,
      count: stat.count,
      countPercent: ((stat.count / totalCount) * 100).toFixed(1),
      totalDuration: Math.round(stat.totalDuration),
      totalDurationHours: formatHours(stat.totalDuration),
      durationPercent: ((stat.totalDuration / totalDuration) * 100).toFixed(1),
      avgDuration: Math.round(stat.avgDuration),
      maxDuration: Math.round(stat.maxDuration)
    }));

    res.json({
      success: true,
      data: {
        stationId: parseInt(stationId),
        totalCount,
        totalDuration: Math.round(totalDuration),
        totalDurationHours: formatHours(totalDuration),
        deviceStats: formattedStats
      }
    });
  } catch (error) {
    console.error('获取电站告警统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电站告警统计失败',
      error: error.message
    });
  }
});

/**
 * 获取指定日期的告警列表（包含全量告警）
 * GET /api/alarms/station/:stationId/daily
 */
router.get('/station/:stationId/daily', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '缺少日期参数'
      });
    }

    // 解析日期 - 用户传入的date是UTC+8本地日期，需要转换为UTC时间范围查询
    // 例如：用户选择 "2026-01-11" (UTC+8)
    //      → 查询 "2026-01-10T16:00:00.000Z" 到 "2026-01-11T16:00:00.000Z" (UTC+0)
    const dateStr = date;
    const [year, month, day] = dateStr.split('-').map(Number);
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时的毫秒数

    // 构建UTC+8本地时间的00:00和24:00
    const localStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const localEndOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    // 减去8小时，转换为UTC时间范围
    const startOfDay = new Date(localStartOfDay.getTime() - UTC_OFFSET_MS);
    const endOfDay = new Date(localEndOfDay.getTime() - UTC_OFFSET_MS);

    // 查询该日期的全量告警（使用startTime字段）
    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      startTime: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    // 转换设备代码为中文名称
    const deviceNameMap = {
      lc: 'LC设备',
      pcs: 'PCS设备',
      cluster: '簇控设备',
      meter: '电表',
      highMeter: '高压电表',
      ac: '空调',
      ems: 'EMS系统'
    };

    // 严重程度中文映射
    const severityNameMap = {
      critical: '紧急',
      error: '错误',
      warning: '警告',
      info: '信息'
    };

    // 格式化告警数据
    const formattedAlarms = alarms.map(alarm => ({
      alarmId: alarm.alarmId,
      device: alarm.device,
      deviceName: deviceNameMap[alarm.device] || alarm.device,
      gatewayDeviceId: alarm.gatewayDeviceId || null, // 网关设备ID
      alarmName: alarm.alarmName,
      severity: alarm.severity,
      severityName: severityNameMap[alarm.severity] || alarm.severity,
      startTime: alarm.startTime,
      endTime: alarm.endTime,
      duration: alarm.durationMinutes,
      durationFormatted: formatDuration(alarm.durationMinutes)
    }));

    // 计算总时长（分钟）
    const totalDuration = formattedAlarms.reduce((sum, alarm) => sum + alarm.duration, 0);

    // 按设备类型分组统计
    const deviceGroups = {};
    formattedAlarms.forEach(alarm => {
      if (!deviceGroups[alarm.device]) {
        deviceGroups[alarm.device] = {
          device: alarm.device,
          deviceName: alarm.deviceName,
          count: 0,
          totalDuration: 0,
          alarms: []
        };
      }
      deviceGroups[alarm.device].count++;
      deviceGroups[alarm.device].totalDuration += alarm.duration;
      deviceGroups[alarm.device].alarms.push(alarm);
    });

    res.json({
      success: true,
      data: {
        stationId: parseInt(stationId),
        date: startOfDay,
        totalCount: formattedAlarms.length,
        totalDuration: Math.round(totalDuration),
        totalDurationHours: formatHours(totalDuration),
        totalDurationFormatted: formatDuration(totalDuration),
        alarms: formattedAlarms,
        deviceGroups: Object.values(deviceGroups)
      }
    });
  } catch (error) {
    console.error('获取每日告警列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取每日告警列表失败',
      error: error.message
    });
  }
});

/**
 * 格式化持续时长
 */
function formatDuration(minutes) {
  if (minutes < 1) {
    // 不足1分钟，显示秒数
    const seconds = Math.round(minutes * 60);
    return `${seconds}秒`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
}

// ==================== 告警损失计算相关路由 ====================

// 计算电站告警总损失
router.get('/station/:stationId/losses', alarmController.calculateStationLosses);

// 按设备类型统计告警损失
router.get('/station/:stationId/losses/by-device', alarmController.getLossByDevice);

// 计算节假日损失
router.get('/station/:stationId/holiday-losses', alarmController.calculateHolidayLosses);

// 计算非计划性停机损失（工作日无充放电损失）
router.get('/station/:stationId/unplanned-outage-losses', alarmController.calculateUnplannedOutageLosses);

// 计算单个告警的损失
router.get('/:alarmId/loss', alarmController.calculateSingleAlarmLoss);

module.exports = router;
