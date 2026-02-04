const ChargingStrategy = require('../models/ChargingStrategy');

// 获取所有充放电策略（分页、过滤、排序）
exports.getAllStrategies = async (req, res) => {
  try {
    const {
      search,
      stationId,
      gatewayId,
      startDate,
      endDate,
      ctype,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // 状态过滤
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 电站ID过滤
    if (stationId) {
      query.stationId = parseInt(stationId);
    }

    // 网关ID过滤
    if (gatewayId) {
      query.gatewayId = new RegExp(gatewayId, 'i');
    }

    // 日期范围过滤
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // 充放电类型过滤
    if (ctype) {
      query['timeslots.ctype'] = parseInt(ctype);
    }

    // 搜索过滤
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { gatewayId: regex },
        { stationId: isNaN(search) ? undefined : parseInt(search) }
      ].filter(condition => condition.stationId !== undefined || condition.gatewayId);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const strategies = await ChargingStrategy.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ChargingStrategy.countDocuments(query);

    res.json({
      success: true,
      data: strategies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取充放电策略列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 根据电站 ID 获取策略
exports.getByStationId = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    const strategies = await ChargingStrategy.findByStationId(
      parseInt(stationId),
      { startDate, endDate }
    );

    if (!strategies || strategies.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该电站的充放电策略'
      });
    }

    res.json({
      success: true,
      data: strategies,
      count: strategies.length
    });
  } catch (error) {
    console.error('查询电站充放电策略失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 根据网关 ID 获取策略
exports.getByGatewayId = async (req, res) => {
  try {
    const { gatewayId } = req.params;
    const { startDate, endDate } = req.query;

    const strategies = await ChargingStrategy.findByGatewayId(
      gatewayId,
      { startDate, endDate }
    );

    if (!strategies || strategies.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该网关的充放电策略'
      });
    }

    res.json({
      success: true,
      data: strategies,
      count: strategies.length
    });
  } catch (error) {
    console.error('查询网关充放电策略失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取指定日期的策略
exports.getByDate = async (req, res) => {
  try {
    const { stationId, date } = req.params;

    const strategy = await ChargingStrategy.findByDate(
      parseInt(stationId),
      date
    );

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: '未找到该日期的充放电策略'
      });
    }

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('查询指定日期充放电策略失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建或更新充放电策略
exports.createOrUpdateStrategy = async (req, res) => {
  try {
    const { stationId, date, gatewayId, timeslots, ...otherFields } = req.body;

    // 验证必填字段
    if (!stationId || !date || !gatewayId || !timeslots) {
      return res.status(400).json({
        success: false,
        message: '电站 ID、日期、网关 ID 和时间段策略为必填项'
      });
    }

    // 验证 timeslots 格式
    if (!Array.isArray(timeslots) || timeslots.length === 0) {
      return res.status(400).json({
        success: false,
        message: '时间段策略必须是非空数组'
      });
    }

    // 查找是否已存在
    const existingStrategy = await ChargingStrategy.findOne({
      stationId,
      date: new Date(date),
      gatewayId: gatewayId.toLowerCase()
    });

    if (existingStrategy) {
      // 更新现有策略
      existingStrategy.timeslots = timeslots;
      Object.assign(existingStrategy, otherFields);
      await existingStrategy.save();

      res.json({
        success: true,
        message: '充放电策略已更新',
        data: existingStrategy
      });
    } else {
      // 创建新策略
      const newStrategy = new ChargingStrategy({
        stationId,
        date: new Date(date),
        gatewayId: gatewayId.toLowerCase(),
        timeslots,
        ...otherFields
      });
      await newStrategy.save();

      res.status(201).json({
        success: true,
        message: '充放电策略已创建',
        data: newStrategy
      });
    }
  } catch (error) {
    console.error('创建/更新充放电策略失败:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '该电站在该日期的策略已存在'
      });
    }

    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 批量创建或更新充放电策略
exports.batchCreateOrUpdate = async (req, res) => {
  try {
    const { strategies } = req.body;

    if (!Array.isArray(strategies) || strategies.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的策略列表'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const strategy of strategies) {
      try {
        const { stationId, date, gatewayId, timeslots, ...otherFields } = strategy;

        if (!stationId || !date || !gatewayId || !timeslots) {
          results.failed++;
          results.errors.push({
            strategy,
            error: '缺少必填字段'
          });
          continue;
        }

        const existing = await ChargingStrategy.findOne({
          stationId,
          date: new Date(date),
          gatewayId: gatewayId.toLowerCase()
        });

        if (existing) {
          existing.timeslots = timeslots;
          Object.assign(existing, otherFields);
          await existing.save();
          results.updated++;
        } else {
          await ChargingStrategy.create({
            stationId,
            date: new Date(date),
            gatewayId: gatewayId.toLowerCase(),
            timeslots,
            ...otherFields
          });
          results.created++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          strategy,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: '批量操作完成',
      results
    });
  } catch (error) {
    console.error('批量创建/更新充放电策略失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 删除充放电策略（软删除）
exports.deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await ChargingStrategy.findById(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: '未找到该充放电策略'
      });
    }

    strategy.isActive = false;
    await strategy.save();

    res.json({
      success: true,
      message: '充放电策略已删除'
    });
  } catch (error) {
    console.error('删除充放电策略失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取统计信息
exports.getStatistics = async (req, res) => {
  try {
    const total = await ChargingStrategy.countDocuments({ isActive: true });
    const inactive = await ChargingStrategy.countDocuments({ isActive: false });

    // 按电站统计
    const byStation = await ChargingStrategy.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$stationId',
          count: { $sum: 1 },
          latestDate: { $max: '$date' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 按充放电类型统计
    const byCtype = await ChargingStrategy.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$timeslots' },
      {
        $group: {
          _id: '$timeslots.ctype',
          count: { $sum: 1 },
          avgPower: { $avg: '$timeslots.power' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        active: total,
        inactive,
        byStation,
        byCtype
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 统计各电站各网关每天的充放电时长
exports.getDailyChargingStats = async (req, res) => {
  try {
    const { stationId, gatewayId, startDate, endDate, page = 1, limit = 100 } = req.query;

    // 构建匹配条件
    const matchCondition = { isActive: true };
    if (stationId) matchCondition.stationId = parseInt(stationId);
    if (gatewayId) matchCondition.gatewayId = gatewayId.toLowerCase();
    if (startDate || endDate) {
      matchCondition.date = {};
      if (startDate) matchCondition.date.$gte = new Date(startDate);
      if (endDate) matchCondition.date.$lte = new Date(endDate);
    }

    // 聚合统计
    const stats = await ChargingStrategy.aggregate([
      { $match: matchCondition },
      { $unwind: '$timeslots' },
      {
        $addFields: {
          // 计算每个时间段的时长（小时）
          duration: {
            $divide: [
              {
                $subtract: [
                  {
                    $add: [
                      { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 0] } }, 60] },
                      { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 1] } }
                    ]
                  },
                  {
                    $add: [
                      { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 0] } }, 60] },
                      { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 1] } }
                    ]
                  }
                ]
              },
              60
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            stationId: '$stationId',
            gatewayId: '$gatewayId',
            date: '$date',
            ctype: '$timeslots.ctype'
          },
          totalHours: { $sum: '$duration' },
          avgPower: { $avg: '$timeslots.power' },
          maxPower: { $max: '$timeslots.power' },
          slotCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            stationId: '$_id.stationId',
            gatewayId: '$_id.gatewayId',
            date: '$_id.date'
          },
          chargingHours: {
            $sum: {
              $cond: [{ $eq: ['$_id.ctype', 1] }, '$totalHours', 0]
            }
          },
          dischargingHours: {
            $sum: {
              $cond: [{ $eq: ['$_id.ctype', 2] }, '$totalHours', 0]
            }
          },
          idleHours: {
            $sum: {
              $cond: [{ $eq: ['$_id.ctype', 3] }, '$totalHours', 0]
            }
          },
          chargingAvgPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 1] }, '$avgPower', null]
            }
          },
          dischargingAvgPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 2] }, '$avgPower', null]
            }
          },
          chargingMaxPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 1] }, '$maxPower', null]
            }
          },
          dischargingMaxPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 2] }, '$maxPower', null]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          stationId: '$_id.stationId',
          gatewayId: '$_id.gatewayId',
          date: '$_id.date',
          chargingHours: { $round: ['$chargingHours', 2] },
          dischargingHours: { $round: ['$dischargingHours', 2] },
          idleHours: { $round: ['$idleHours', 2] },
          chargingAvgPower: { $round: ['$chargingAvgPower', 2] },
          dischargingAvgPower: { $round: ['$dischargingAvgPower', 2] },
          chargingMaxPower: '$chargingMaxPower',
          dischargingMaxPower: '$dischargingMaxPower',
          totalHours: {
            $round: [
              { $add: ['$chargingHours', '$dischargingHours', '$idleHours'] },
              2
            ]
          }
        }
      },
      { $sort: { stationId: 1, gatewayId: 1, date: -1 } }
    ]);

    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedStats = stats.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.length,
        pages: Math.ceil(stats.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取每日充放电统计失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
