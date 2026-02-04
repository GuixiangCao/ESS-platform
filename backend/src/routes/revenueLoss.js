const express = require('express');
const router = express.Router();
const RevenueLoss = require('../models/RevenueLoss');
const StationRevenue = require('../models/StationRevenue');
const { auth } = require('../middleware/auth');

// 获取电站损失统计
router.get('/station/:stationId/loss-stats', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await RevenueLoss.getLossStatsByStation(stationId, startDate, endDate);

    // 转换损失类型为中文
    const lossTypeMap = {
      'planned_shutdown': '计划性停运',
      'equipment_failure': '设备故障',
      'external_factors': '外界因素'
    };

    const formattedStats = stats.map(stat => ({
      lossType: stat._id,
      lossTypeName: lossTypeMap[stat._id] || stat._id,
      totalLoss: stat.totalLoss,
      count: stat.count,
      avgLoss: stat.avgLoss,
      totalDuration: stat.totalDuration
    }));

    // 计算总损失
    const totalLoss = formattedStats.reduce((sum, stat) => sum + stat.totalLoss, 0);

    res.json({
      success: true,
      data: {
        stats: formattedStats,
        totalLoss,
        summary: {
          totalIncidents: formattedStats.reduce((sum, stat) => sum + stat.count, 0),
          totalDuration: formattedStats.reduce((sum, stat) => sum + stat.totalDuration, 0)
        }
      }
    });
  } catch (error) {
    console.error('获取损失统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取损失统计失败',
      error: error.message
    });
  }
});

// 获取每日损失详情
router.get('/station/:stationId/daily-losses', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    const dailyLosses = await RevenueLoss.getDailyLossDetails(stationId, startDate, endDate);

    // 转换损失类型为中文
    const lossTypeMap = {
      'planned_shutdown': '计划性停运',
      'equipment_failure': '设备故障',
      'external_factors': '外界因素'
    };

    const formattedData = dailyLosses.map(day => ({
      date: day._id,
      totalDailyLoss: day.totalDailyLoss,
      losses: day.losses.map(loss => ({
        lossType: loss.lossType,
        lossTypeName: lossTypeMap[loss.lossType] || loss.lossType,
        totalLoss: loss.totalLoss,
        records: loss.records
      }))
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('获取每日损失详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取每日损失详情失败',
      error: error.message
    });
  }
});

// 添加损失记录
router.post('/station/:stationId/loss', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date, lossType, lossAmount, description, reason, duration } = req.body;

    const loss = new RevenueLoss({
      stationId: parseInt(stationId),
      date: new Date(date),
      lossType,
      lossAmount,
      description,
      reason,
      duration
    });

    await loss.save();

    res.json({
      success: true,
      message: '损失记录添加成功',
      data: loss
    });
  } catch (error) {
    console.error('添加损失记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加损失记录失败',
      error: error.message
    });
  }
});

// 更新损失记录
router.put('/loss/:lossId', auth, async (req, res) => {
  try {
    const { lossId } = req.params;
    const updates = req.body;

    const loss = await RevenueLoss.findByIdAndUpdate(
      lossId,
      updates,
      { new: true, runValidators: true }
    );

    if (!loss) {
      return res.status(404).json({
        success: false,
        message: '损失记录不存在'
      });
    }

    res.json({
      success: true,
      message: '损失记录更新成功',
      data: loss
    });
  } catch (error) {
    console.error('更新损失记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新损失记录失败',
      error: error.message
    });
  }
});

// 删除损失记录
router.delete('/loss/:lossId', auth, async (req, res) => {
  try {
    const { lossId } = req.params;

    const loss = await RevenueLoss.findByIdAndDelete(lossId);

    if (!loss) {
      return res.status(404).json({
        success: false,
        message: '损失记录不存在'
      });
    }

    res.json({
      success: true,
      message: '损失记录删除成功'
    });
  } catch (error) {
    console.error('删除损失记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除损失记录失败',
      error: error.message
    });
  }
});

// 获取电站收益与损失对比数据
router.get('/station/:stationId/loss-comparison', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    // 获取收益数据
    const revenueQuery = {
      stationId: parseInt(stationId)
    };

    if (startDate && endDate) {
      revenueQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const revenueData = await StationRevenue.find(revenueQuery).sort({ date: 1 });

    // 获取每日损失
    const dailyLosses = await RevenueLoss.getDailyLossDetails(stationId, startDate, endDate);

    // 构建损失映射
    const lossMap = {};
    dailyLosses.forEach(day => {
      const dateKey = new Date(day._id).toISOString().split('T')[0];
      lossMap[dateKey] = {
        totalLoss: day.totalDailyLoss,
        losses: day.losses
      };
    });

    // 合并数据
    const comparisonData = revenueData.map(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      const lossData = lossMap[dateKey] || { totalLoss: 0, losses: [] };

      return {
        date: record.date,
        expectedRevenue: record.expectedRevenue,
        actualRevenue: record.actualRevenue,
        revenueLoss: record.expectedRevenue - record.actualRevenue,
        lossBreakdown: lossData.losses,
        totalRecordedLoss: lossData.totalLoss,
        achievementRate: record.achievementRate
      };
    });

    res.json({
      success: true,
      data: comparisonData
    });
  } catch (error) {
    console.error('获取收益损失对比失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收益损失对比失败',
      error: error.message
    });
  }
});

module.exports = router;
