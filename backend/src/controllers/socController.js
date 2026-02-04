const SocData = require('../models/SocData');
const StationGateway = require('../models/StationGateway');
const Alarm = require('../models/Alarm');

/**
 * 获取电站在指定日期的所有设备SOC数据
 */
exports.getStationSocData = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供日期参数'
      });
    }

    // 查找该电站的所有设备
    const devices = await StationGateway.find({ stationId: parseInt(stationId) });

    if (!devices || devices.length === 0) {
      return res.json({
        success: true,
        data: {
          date,
          stationId: parseInt(stationId),
          devices: []
        }
      });
    }

    const deviceIds = devices.map(d => d.deviceId);

    // 获取指定日期的SOC数据（UTC+8时区）
    // 数据库中的时间戳虽然标记为UTC，但实际含义是UTC+8本地时间
    // 提取日期字符串（YYYY-MM-DD格式）
    let dateStr;

    // 处理不同的日期格式
    if (date.includes('T')) {
      // ISO时间戳格式，如 "2026-01-12T16:00:00.000Z"
      // 直接提取日期部分
      dateStr = date.split('T')[0];
    } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // 已经是 YYYY-MM-DD 格式
      dateStr = date;
    } else {
      // 尝试解析其他格式
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: '无效的日期格式'
        });
      }
      // 转换为UTC+8时区的日期字符串
      const utc8Date = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
      const year = utc8Date.getUTCFullYear();
      const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utc8Date.getUTCDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    // 构建查询范围
    // 数据库现在存储的是正确的UTC时间
    // 用户传入的日期是UTC+8本地日期，需要转换为UTC时间范围
    // 例如：用户查询"2026-01-12"，实际要查询UTC时间"2026-01-11 16:00" ~ "2026-01-12 16:00"
    const [year, month, day] = dateStr.split('-').map(Number);
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时偏移

    // UTC+8本地时间的00:00和24:00
    const localStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const localEndOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    // 转换为UTC时间（减去8小时）
    const startOfDay = new Date(localStartOfDay.getTime() - UTC_OFFSET_MS);
    const endOfDay = new Date(localEndOfDay.getTime() - UTC_OFFSET_MS);

    // 查询所有设备在该日的SOC数据
    const socData = await SocData.find({
      deviceId: { $in: deviceIds },
      timestamp: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ deviceId: 1, timestamp: 1 });

    // 按设备分组数据
    const deviceDataMap = {};
    socData.forEach(record => {
      if (!deviceDataMap[record.deviceId]) {
        const device = devices.find(d => d.deviceId === record.deviceId);
        deviceDataMap[record.deviceId] = {
          deviceId: record.deviceId,
          deviceName: device?.deviceName || record.deviceId.substring(0, 20) + '...',
          gatewayId: record.gatewayId,
          data: []
        };
      }
      deviceDataMap[record.deviceId].data.push({
        timestamp: record.timestamp,
        soc: record.soc
      });
    });

    const devicesData = Object.values(deviceDataMap);

    // 查询当日的故障数据
    // 使用 startTime 字段进行查询，确保只查询真正发生在目标日期的告警
    // 用户传入的date是UTC+8本地日期，需要转换为UTC时间范围查询
    // 例如：用户选择 "2026-01-11" (UTC+8)
    //      → 查询 "2026-01-10T16:00:00.000Z" 到 "2026-01-11T16:00:00.000Z" (UTC+0)

    // 使用与SOC数据相同的时间范围（已经计算好的startOfDay和endOfDay）
    const alarmStartOfDay = startOfDay;
    const alarmEndOfDay = endOfDay;

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      startTime: {
        $gte: alarmStartOfDay,
        $lt: alarmEndOfDay
      }
    }).sort({ startTime: 1 });

    // 格式化故障数据，用于前端显示
    const alarmsData = alarms.map(alarm => ({
      alarmId: alarm.alarmId,
      device: alarm.device,
      alarmName: alarm.alarmName,
      startTime: alarm.startTime,
      endTime: alarm.endTime,
      duration: alarm.durationMinutes,
      severity: alarm.severity
    }));

    res.json({
      success: true,
      data: {
        date,
        stationId: parseInt(stationId),
        stationName: devices[0]?.stationName || '',
        totalDevices: devicesData.length,
        devices: devicesData,
        alarms: alarmsData
      }
    });

  } catch (error) {
    console.error('获取电站SOC数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电站SOC数据失败',
      error: error.message
    });
  }
};

/**
 * 获取单个设备在指定日期范围的SOC数据
 */
exports.getDeviceSocData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供起始日期和结束日期'
      });
    }

    const socData = await SocData.findByDevice(deviceId, startDate, endDate);

    res.json({
      success: true,
      data: {
        deviceId,
        startDate,
        endDate,
        count: socData.length,
        data: socData.map(record => ({
          timestamp: record.timestamp,
          soc: record.soc
        }))
      }
    });

  } catch (error) {
    console.error('获取设备SOC数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设备SOC数据失败',
      error: error.message
    });
  }
};

/**
 * 获取设备在特定时刻的SOC值
 */
exports.getDeviceSocAtTime = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { timestamp } = req.query;

    if (!timestamp) {
      return res.status(400).json({
        success: false,
        message: '请提供时间戳参数'
      });
    }

    const soc = await SocData.getSocAtTime(deviceId, timestamp);

    res.json({
      success: true,
      data: {
        deviceId,
        timestamp,
        soc
      }
    });

  } catch (error) {
    console.error('获取设备特定时刻SOC失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设备特定时刻SOC失败',
      error: error.message
    });
  }
};
