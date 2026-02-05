const SocData = require('../models/SocData');

// Note: correctSOCJumps script should be run separately via CLI
// We'll trigger it as a child process to avoid direct import issues

/**
 * 触发SOC跳变检测和修正
 */
exports.correctJumps = async (req, res) => {
  try {
    const { stationId, startDate, endDate } = req.body;

    if (!stationId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：stationId, startDate, endDate'
      });
    }

    // 返回成功响应，告知用户需要手动运行修正脚本
    res.json({
      success: true,
      message: 'SOC跳变修正需要手动运行脚本：node backend/scripts/correctSOCJumps.js <stationId> <startDate> <endDate>',
      command: `node backend/scripts/correctSOCJumps.js ${stationId} ${startDate} ${endDate}`
    });

  } catch (error) {
    console.error('触发SOC跳变修正失败:', error);
    res.status(500).json({
      success: false,
      message: '触发SOC跳变修正失败',
      error: error.message
    });
  }
};

/**
 * 检查电站是否需要跳变修正
 */
exports.checkNeedCorrection = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：startDate, endDate'
      });
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // 统计该电站的SOC数据
    const totalRecords = await SocData.countDocuments({
      stationId: parseInt(stationId),
      timestamp: { $gte: start, $lte: end }
    });

    const correctedRecords = await SocData.countDocuments({
      stationId: parseInt(stationId),
      timestamp: { $gte: start, $lte: end },
      isJumpCorrected: true
    });

    const uncorrectedRecords = await SocData.countDocuments({
      stationId: parseInt(stationId),
      timestamp: { $gte: start, $lte: end },
      socCorrected: { $exists: false }
    });

    const needsCorrection = uncorrectedRecords > 0;

    res.json({
      success: true,
      data: {
        totalRecords,
        correctedRecords,
        uncorrectedRecords,
        needsCorrection,
        correctionRate: totalRecords > 0
          ? ((correctedRecords / totalRecords) * 100).toFixed(2) + '%'
          : '0%'
      }
    });

  } catch (error) {
    console.error('检查跳变修正状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查跳变修正状态失败',
      error: error.message
    });
  }
};

/**
 * 获取修正后的SOC数据（用于前端展示）
 */
exports.getCorrectedSOCData = async (req, res) => {
  try {
    const { stationId, date } = req.params;

    // 将北京时间（UTC+8）的日期转换为UTC时间范围
    // 例如：北京时间 2025-12-14 00:00:00 = UTC 2025-12-13 16:00:00
    const [year, month, day] = date.split('-').map(Number);
    const bjStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const bjEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Date对象在查询时会自动转换为UTC时间
    const startOfDay = bjStartOfDay;
    const endOfDay = bjEndOfDay;

    const socData = await SocData.find({
      stationId: parseInt(stationId),
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    })
      .sort({ timestamp: 1 })
      .select('timestamp soc socCorrected isJumpCorrected deviceId gatewayId')
      .lean();

    // 使用修正后的数据（如果存在）
    const processedData = socData.map(record => ({
      time: record.timestamp,
      soc: record.socCorrected !== undefined ? record.socCorrected : record.soc,
      socOriginal: record.soc,
      isJumpCorrected: record.isJumpCorrected || false,
      deviceId: record.deviceId,
      gatewayId: record.gatewayId
    }));

    res.json({
      success: true,
      data: processedData,
      count: processedData.length
    });

  } catch (error) {
    console.error('获取修正后的SOC数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取修正后的SOC数据失败',
      error: error.message
    });
  }
};
 
