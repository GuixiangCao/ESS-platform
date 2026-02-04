const mongoose = require('mongoose');

const timingPriceSchema = new mongoose.Schema({
  type: {
    type: Number,
    required: true,
    // 1: 尖峰, 2: 高峰, 3: 平峰, 4: 低谷, 5: 深谷
  },
  startTime: {
    type: Number,
    required: true,
    // 分钟数 (0-1440)
  },
  endTime: {
    type: Number,
    required: true,
    // 分钟数 (0-1440)
  }
}, { _id: false });

const electricityPriceSchema = new mongoose.Schema({
  regionId: {
    type: String,
    required: true,
    index: true,
    // 地区代码，如 330000 为浙江省
  },
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
    index: true,
  },
  userType: {
    type: Number,
    required: true,
    enum: [0, 1],
    // 0: 工商业用户, 1: 居民用户
  },
  priceType: {
    type: Number,
    required: true,
    enum: [0, 1],
    // 0: 临时价格, 1: 长期价格
  },
  voltageType: {
    type: Number,
    required: true,
    // 电压等级: 1, 2, 3, 5, 6, 8, 10 等
  },
  timingPrice: {
    type: [timingPriceSchema],
    default: [],
    // 分时电价时段配置
  },
  sharp: {
    type: Number,
    default: -1,
    // 尖峰电价 (元/kWh), -1 表示不适用
  },
  peak: {
    type: Number,
    default: -1,
    // 高峰电价 (元/kWh), -1 表示不适用
  },
  shoulder: {
    type: Number,
    default: -1,
    // 平峰电价 (元/kWh), -1 表示不适用
  },
  offPeak: {
    type: Number,
    default: -1,
    // 低谷电价 (元/kWh), -1 表示不适用
  },
  deepValley: {
    type: Number,
    default: -1,
    // 深谷电价 (元/kWh), -1 表示不适用
  },
  maxDemand: {
    type: Number,
    default: -1,
    // 最大需量 (元/kW), -1 表示不适用
  },
  recordType: {
    type: Number,
    default: 1,
    // 记录类型
  },
  transformerCapacity: {
    type: Number,
    default: -1,
    // 变压器容量 (kVA), -1 表示不适用
  },
  originalId: {
    type: String,
    unique: true,
    sparse: true,
    // 原始 CSV 中的 ID
  }
}, {
  timestamps: true,
  collection: 'electricity_prices'
});

// 复合索引优化查询
electricityPriceSchema.index({ regionId: 1, userType: 1, voltageType: 1, startDate: 1 });
electricityPriceSchema.index({ regionId: 1, startDate: 1, endDate: 1 });

// 静态方法：查找特定日期的电价
electricityPriceSchema.statics.findPriceByDate = function(regionId, date, userType, voltageType) {
  return this.findOne({
    regionId,
    userType,
    voltageType,
    startDate: { $lte: date },
    endDate: { $gte: date }
  }).sort({ priceType: -1, createdAt: -1 });
};

// 静态方法：获取时段电价
electricityPriceSchema.methods.getPriceAtTime = function(timeInMinutes) {
  if (!this.timingPrice || this.timingPrice.length === 0) {
    return this.peak > 0 ? this.peak : null;
  }

  const segment = this.timingPrice.find(seg =>
    timeInMinutes >= seg.startTime && timeInMinutes < seg.endTime
  );

  if (!segment) return null;

  const priceMap = {
    1: this.sharp,      // 尖峰
    2: this.peak,       // 高峰
    3: this.shoulder,   // 平峰
    4: this.offPeak,    // 低谷
    5: this.deepValley  // 深谷
  };

  return priceMap[segment.type] > 0 ? priceMap[segment.type] : null;
};

const ElectricityPrice = mongoose.model('ElectricityPrice', electricityPriceSchema);

module.exports = ElectricityPrice;
