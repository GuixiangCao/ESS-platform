const express = require('express');
const router = express.Router();
const StationRevenue = require('../models/StationRevenue');
const { auth } = require('../middleware/auth');

// 获取所有电站列表
router.get('/stations', auth, async (req, res) => {
  try {
    const stations = await StationRevenue.aggregate([
      {
        $group: {
          _id: '$stationId',
          stationName: { $first: '$stationName' },
          isAI: { $first: '$isAI' },
          recordCount: { $sum: 1 },
          totalExpected: { $sum: '$expectedRevenue' },
          totalActual: { $sum: '$actualRevenue' },
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          // 计算可控收益：排除实际收益为0的天数
          controllableExpected: {
            $sum: {
              $cond: [
                { $gt: ['$actualRevenue', 0] },
                '$expectedRevenue',
                0
              ]
            }
          },
          controllableActual: {
            $sum: {
              $cond: [
                { $gt: ['$actualRevenue', 0] },
                '$actualRevenue',
                0
              ]
            }
          },
          activeDays: {
            $sum: {
              $cond: [
                { $gt: ['$actualRevenue', 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          stationId: '$_id',
          stationName: 1,
          isAI: 1,
          recordCount: 1,
          totalExpected: { $round: ['$totalExpected', 2] },
          totalActual: { $round: ['$totalActual', 2] },
          achievementRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalActual', '$totalExpected'] }, 100] },
              2
            ]
          },
          controllableExpected: { $round: ['$controllableExpected', 2] },
          controllableActual: { $round: ['$controllableActual', 2] },
          controllableRate: {
            $round: [
              {
                $cond: [
                  { $gt: ['$controllableExpected', 0] },
                  { $multiply: [{ $divide: ['$controllableActual', '$controllableExpected'] }, 100] },
                  0
                ]
              },
              2
            ]
          },
          activeDays: 1,
          minDate: 1,
          maxDate: 1
        }
      },
      { $sort: { stationId: 1 } }
    ]);

    // 计算AI电站的平均达成率
    const aiStations = stations.filter(s => s.isAI);
    const normalStations = stations.filter(s => !s.isAI);

    let aiTotalExpected = 0;
    let aiTotalActual = 0;
    aiStations.forEach(station => {
      aiTotalExpected += station.totalExpected;
      aiTotalActual += station.totalActual;
    });
    const aiAverageRate = aiTotalExpected > 0 ? (aiTotalActual / aiTotalExpected) * 100 : 0;

    // 为每个电站计算预估提升金额和可控收益
    let totalEstimatedImprovement = 0;
    let totalControllableRevenue = 0;
    const stationsWithImprovement = stations.map(station => {
      let estimatedImprovement = 0;

      // 只对普通电站且AI达成率更高时才计算预估提升金额
      if (!station.isAI) {
        const rateDifference = aiAverageRate - station.achievementRate;
        if (rateDifference > 0) {
          estimatedImprovement = station.totalExpected * (rateDifference / 100);
          totalEstimatedImprovement += estimatedImprovement;
        }
      }

      totalControllableRevenue += station.controllableActual;

      return {
        ...station,
        estimatedImprovement: Math.round(estimatedImprovement * 100) / 100,
        controllableRevenue: station.controllableActual
      };
    });

    res.json({
      success: true,
      data: stationsWithImprovement,
      summary: {
        totalEstimatedImprovement: Math.round(totalEstimatedImprovement * 100) / 100,
        totalControllableRevenue: Math.round(totalControllableRevenue * 100) / 100,
        aiAverageRate: Math.round(aiAverageRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('获取电站列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电站列表失败',
      error: error.message
    });
  }
});

// 获取指定电站的收益数据
router.get('/station/:stationId', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { stationId: parseInt(stationId) };

    // 如果提供了日期范围,添加过滤
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await StationRevenue.find(query)
      .sort({ date: 1 })
      .lean();

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该电站的收益数据'
      });
    }

    // 计算统计数据
    const totalExpected = records.reduce((sum, r) => sum + r.expectedRevenue, 0);
    const totalActual = records.reduce((sum, r) => sum + r.actualRevenue, 0);
    const achievementRate = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    // 计算可控收益数据：排除实际收益为0的天数（与列表页逻辑一致）
    const controllableExpected = records.reduce((sum, r) => {
      return r.actualRevenue > 0 ? sum + r.expectedRevenue : sum;
    }, 0);
    const controllableActual = records.reduce((sum, r) => {
      return r.actualRevenue > 0 ? sum + r.actualRevenue : sum;
    }, 0);
    const controllableRate = controllableExpected > 0 ? (controllableActual / controllableExpected) * 100 : 0;

    // 按月份汇总
    const monthlyData = {};
    records.forEach(record => {
      const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          expectedRevenue: 0,
          actualRevenue: 0,
          count: 0
        };
      }
      monthlyData[monthKey].expectedRevenue += record.expectedRevenue;
      monthlyData[monthKey].actualRevenue += record.actualRevenue;
      monthlyData[monthKey].count += 1;
    });

    const monthlyStats = Object.values(monthlyData).map(m => ({
      month: m.month,
      expectedRevenue: Math.round(m.expectedRevenue * 100) / 100,
      actualRevenue: Math.round(m.actualRevenue * 100) / 100,
      achievementRate: m.expectedRevenue > 0
        ? Math.round((m.actualRevenue / m.expectedRevenue) * 10000) / 100
        : 0,
      dayCount: m.count
    }));

    res.json({
      success: true,
      data: {
        stationId: parseInt(stationId),
        stationName: records[0].stationName,
        isAI: records[0].isAI || false,
        currency: records[0].currency,
        summary: {
          totalExpected: Math.round(totalExpected * 100) / 100,
          totalActual: Math.round(totalActual * 100) / 100,
          achievementRate: Math.round(achievementRate * 100) / 100,
          controllableExpected: Math.round(controllableExpected * 100) / 100,
          controllableActual: Math.round(controllableActual * 100) / 100,
          controllableRate: Math.round(controllableRate * 100) / 100,
          recordCount: records.length,
          dateRange: {
            start: records[0].date,
            end: records[records.length - 1].date
          }
        },
        monthlyStats,
        dailyRecords: records.map(r => ({
          date: r.date,
          expectedRevenue: r.expectedRevenue,
          actualRevenue: r.actualRevenue,
          achievementRate: r.expectedRevenue > 0
            ? Math.round((r.actualRevenue / r.expectedRevenue) * 10000) / 100
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('获取电站收益数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电站收益数据失败',
      error: error.message
    });
  }
});

// 获取年度收益汇总
router.get('/station/:stationId/yearly', auth, async (req, res) => {
  try {
    const { stationId } = req.params;

    const yearlyData = await StationRevenue.aggregate([
      { $match: { stationId: parseInt(stationId) } },
      {
        $group: {
          _id: { $year: '$date' },
          stationName: { $first: '$stationName' },
          totalExpected: { $sum: '$expectedRevenue' },
          totalActual: { $sum: '$actualRevenue' },
          recordCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id',
          stationName: 1,
          totalExpected: { $round: ['$totalExpected', 2] },
          totalActual: { $round: ['$totalActual', 2] },
          achievementRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalActual', '$totalExpected'] }, 100] },
              2
            ]
          },
          recordCount: 1
        }
      },
      { $sort: { year: -1 } }
    ]);

    res.json({
      success: true,
      data: yearlyData
    });
  } catch (error) {
    console.error('获取年度收益数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取年度收益数据失败',
      error: error.message
    });
  }
});

// 获取AI vs 普通电站的平均达成率统计
router.get('/achievement-stats', auth, async (req, res) => {
  try {
    const stats = await StationRevenue.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$isAI', false] }, // 将null视为false
          totalExpected: { $sum: '$expectedRevenue' },
          totalActual: { $sum: '$actualRevenue' },
          recordCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          isAI: '$_id',
          averageAchievementRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalActual', '$totalExpected'] }, 100] },
              2
            ]
          },
          totalExpected: { $round: ['$totalExpected', 2] },
          totalActual: { $round: ['$totalActual', 2] },
          recordCount: 1
        }
      }
    ]);

    // 构造返回对象
    const result = {
      aiStations: stats.find(s => s.isAI === true) || { averageAchievementRate: 0, totalExpected: 0, totalActual: 0, recordCount: 0 },
      normalStations: stats.find(s => s.isAI === false) || { averageAchievementRate: 0, totalExpected: 0, totalActual: 0, recordCount: 0 }
    };

    // 计算差额
    result.difference = Math.round((result.aiStations.averageAchievementRate - result.normalStations.averageAchievementRate) * 100) / 100;
    result.hasOptimization = result.difference > 0;

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取达成率统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取达成率统计失败',
      error: error.message
    });
  }
});

module.exports = router;
