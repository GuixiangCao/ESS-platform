const ElectricityPrice = require('../models/ElectricityPrice');

// 获取所有电价记录（支持分页和过滤）
exports.getAllPrices = async (req, res) => {
  try {
    const {
      regionId,
      userType,
      voltageType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (regionId) query.regionId = regionId;
    if (userType !== undefined) query.userType = parseInt(userType);
    if (voltageType !== undefined) query.voltageType = parseInt(voltageType);

    if (startDate && endDate) {
      query.startDate = { $lte: new Date(endDate) };
      query.endDate = { $gte: new Date(startDate) };
    } else if (startDate) {
      query.endDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startDate = { $lte: new Date(endDate) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const prices = await ElectricityPrice.find(query)
      .sort({ startDate: -1, voltageType: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ElectricityPrice.countDocuments(query);

    res.json({
      success: true,
      data: prices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取电价列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 根据日期和条件查询电价
exports.getPriceByDate = async (req, res) => {
  try {
    const {
      regionId = '330000',
      date,
      userType = 0,
      voltageType = 3
    } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供查询日期'
      });
    }

    const queryDate = new Date(date);
    const price = await ElectricityPrice.findPriceByDate(
      regionId,
      queryDate,
      parseInt(userType),
      parseInt(voltageType)
    );

    if (!price) {
      return res.status(404).json({
        success: false,
        message: '未找到匹配的电价数据'
      });
    }

    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error('查询电价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取特定时刻的电价
exports.getPriceAtTime = async (req, res) => {
  try {
    const {
      regionId = '330000',
      datetime,
      userType = 0,
      voltageType = 3
    } = req.query;

    if (!datetime) {
      return res.status(400).json({
        success: false,
        message: '请提供查询时间'
      });
    }

    const queryDate = new Date(datetime);
    const price = await ElectricityPrice.findPriceByDate(
      regionId,
      queryDate,
      parseInt(userType),
      parseInt(voltageType)
    );

    if (!price) {
      return res.status(404).json({
        success: false,
        message: '未找到匹配的电价数据'
      });
    }

    // 计算当前时间对应的分钟数 (0-1440)
    const hours = queryDate.getHours();
    const minutes = queryDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const currentPrice = price.getPriceAtTime(timeInMinutes);

    res.json({
      success: true,
      data: {
        priceInfo: price,
        currentPrice: currentPrice,
        timeInMinutes: timeInMinutes,
        queryTime: datetime
      }
    });
  } catch (error) {
    console.error('查询时段电价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取电价统计信息
exports.getPriceStats = async (req, res) => {
  try {
    const { regionId = '330000' } = req.query;

    const stats = await ElectricityPrice.aggregate([
      { $match: { regionId } },
      {
        $group: {
          _id: {
            userType: '$userType',
            voltageType: '$voltageType'
          },
          avgPeak: { $avg: '$peak' },
          maxPeak: { $max: '$peak' },
          minPeak: { $min: '$peak' },
          avgOffPeak: { $avg: '$offPeak' },
          maxOffPeak: { $max: '$offPeak' },
          minOffPeak: { $min: '$offPeak' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.userType': 1, '_id.voltageType': 1 } }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取电价统计失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取单个电价记录详情
exports.getPriceById = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await ElectricityPrice.findById(id);

    if (!price) {
      return res.status(404).json({
        success: false,
        message: '电价记录不存在'
      });
    }

    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error('获取电价详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取可用的地区、用户类型、电压类型列表
exports.getAvailableOptions = async (req, res) => {
  try {
    const regions = await ElectricityPrice.distinct('regionId');
    const userTypes = await ElectricityPrice.distinct('userType');
    const voltageTypes = await ElectricityPrice.distinct('voltageType');

    res.json({
      success: true,
      data: {
        regions,
        userTypes,
        voltageTypes: voltageTypes.sort((a, b) => a - b)
      }
    });
  } catch (error) {
    console.error('获取选项列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取全天电价曲线数据
exports.getDailyPriceCurve = async (req, res) => {
  try {
    const {
      regionId = '330000',
      date,
      userType = 0,
      voltageType = 3
    } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供查询日期'
      });
    }

    const queryDate = new Date(date);
    const price = await ElectricityPrice.findPriceByDate(
      regionId,
      queryDate,
      parseInt(userType),
      parseInt(voltageType)
    );

    if (!price) {
      return res.status(404).json({
        success: false,
        message: '未找到匹配的电价数据'
      });
    }

    // 生成全天24小时的电价曲线数据（每小时一个数据点）
    const curveData = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeInMinutes = hour * 60;
      const currentPrice = price.getPriceAtTime(timeInMinutes);

      curveData.push({
        hour: hour,
        time: `${String(hour).padStart(2, '0')}:00`,
        price: currentPrice,
        timeInMinutes: timeInMinutes
      });
    }

    // 获取电价时段信息
    const priceTypeMap = {
      1: '尖峰',
      2: '高峰',
      3: '平峰',
      4: '低谷',
      5: '深谷'
    };

    const segments = (price.timingPrice || []).map(seg => ({
      type: seg.type,
      typeName: priceTypeMap[seg.type],
      startTime: seg.startTime,
      endTime: seg.endTime,
      startHour: Math.floor(seg.startTime / 60),
      endHour: Math.floor(seg.endTime / 60),
      price: {
        1: price.sharp,
        2: price.peak,
        3: price.shoulder,
        4: price.offPeak,
        5: price.deepValley
      }[seg.type]
    }));

    res.json({
      success: true,
      data: {
        curveData,
        segments,
        priceInfo: {
          sharp: price.sharp,
          peak: price.peak,
          shoulder: price.shoulder,
          offPeak: price.offPeak,
          deepValley: price.deepValley
        }
      }
    });
  } catch (error) {
    console.error('获取电价曲线失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
