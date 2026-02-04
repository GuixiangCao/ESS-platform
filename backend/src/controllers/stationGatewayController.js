const StationGateway = require('../models/StationGateway');

// 获取所有电站网关映射
exports.getAllStationGateways = async (req, res) => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'stationId',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    // 搜索过滤
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { stationName: regex },
        { gatewayId: regex },
        { stationId: isNaN(search) ? undefined : parseInt(search) }
      ].filter(condition => condition.stationId !== undefined || condition.stationName || condition.gatewayId);
    }

    // 状态过滤
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const stationGateways = await StationGateway.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await StationGateway.countDocuments(query);

    res.json({
      success: true,
      data: stationGateways,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取电站网关列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 根据电站 ID 获取所有网关信息
exports.getByStationId = async (req, res) => {
  try {
    const { stationId } = req.params;

    const stationGateways = await StationGateway.findByStationId(parseInt(stationId));

    if (!stationGateways || stationGateways.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该电站的网关信息'
      });
    }

    res.json({
      success: true,
      data: stationGateways,
      count: stationGateways.length
    });
  } catch (error) {
    console.error('查询电站网关失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 根据网关 ID 获取电站信息
exports.getByGatewayId = async (req, res) => {
  try {
    const { gatewayId } = req.params;

    const stationGateway = await StationGateway.findByGatewayId(gatewayId);

    if (!stationGateway) {
      return res.status(404).json({
        success: false,
        message: '未找到该网关对应的电站信息'
      });
    }

    res.json({
      success: true,
      data: stationGateway
    });
  } catch (error) {
    console.error('查询网关对应电站失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 搜索电站
exports.searchStations = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少需要 2 个字符'
      });
    }

    const results = await StationGateway.searchStations(keyword);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('搜索电站失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建或更新电站网关映射
exports.createOrUpdateStationGateway = async (req, res) => {
  try {
    const { stationId, stationName, gatewayId, ...otherFields } = req.body;

    // 验证必填字段
    if (!stationId || !stationName || !gatewayId) {
      return res.status(400).json({
        success: false,
        message: '电站 ID、电站名称和网关 ID 为必填项'
      });
    }

    // 查找是否已存在
    let stationGateway = await StationGateway.findOne({ stationId });

    if (stationGateway) {
      // 更新现有记录
      stationGateway.stationName = stationName;
      stationGateway.gatewayId = gatewayId.toLowerCase();
      Object.assign(stationGateway, otherFields);
      await stationGateway.save();

      res.json({
        success: true,
        message: '电站网关信息已更新',
        data: stationGateway
      });
    } else {
      // 创建新记录
      stationGateway = new StationGateway({
        stationId,
        stationName,
        gatewayId: gatewayId.toLowerCase(),
        ...otherFields
      });
      await stationGateway.save();

      res.status(201).json({
        success: true,
        message: '电站网关信息已创建',
        data: stationGateway
      });
    }
  } catch (error) {
    console.error('创建/更新电站网关失败:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '电站 ID 或网关 ID 已存在'
      });
    }

    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 批量创建或更新电站网关映射
exports.batchCreateOrUpdate = async (req, res) => {
  try {
    const { stations } = req.body;

    if (!Array.isArray(stations) || stations.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的电站列表'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const station of stations) {
      try {
        const { stationId, stationName, gatewayId, ...otherFields } = station;

        if (!stationId || !stationName || !gatewayId) {
          results.failed++;
          results.errors.push({
            station,
            error: '缺少必填字段'
          });
          continue;
        }

        const existing = await StationGateway.findOne({ stationId });

        if (existing) {
          existing.stationName = stationName;
          existing.gatewayId = gatewayId.toLowerCase();
          Object.assign(existing, otherFields);
          await existing.save();
          results.updated++;
        } else {
          await StationGateway.create({
            stationId,
            stationName,
            gatewayId: gatewayId.toLowerCase(),
            ...otherFields
          });
          results.created++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          station,
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
    console.error('批量创建/更新电站网关失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 删除电站网关映射（软删除）
exports.deleteStationGateway = async (req, res) => {
  try {
    const { stationId } = req.params;

    const stationGateway = await StationGateway.findOne({ stationId: parseInt(stationId) });

    if (!stationGateway) {
      return res.status(404).json({
        success: false,
        message: '未找到该电站'
      });
    }

    stationGateway.isActive = false;
    await stationGateway.save();

    res.json({
      success: true,
      message: '电站网关映射已删除'
    });
  } catch (error) {
    console.error('删除电站网关失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取统计信息
exports.getStatistics = async (req, res) => {
  try {
    const total = await StationGateway.countDocuments({ isActive: true });
    const inactive = await StationGateway.countDocuments({ isActive: false });

    // 按地区统计（如果有位置信息）
    const byProvince = await StationGateway.aggregate([
      { $match: { isActive: true, 'location.province': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$location.province',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        active: total,
        inactive,
        byProvince
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
