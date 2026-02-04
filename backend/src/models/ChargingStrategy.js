const mongoose = require('mongoose');

// 时间段策略子文档
const timeslotSchema = new mongoose.Schema({
  stime: {
    type: String,
    required: true,
    // 开始时间 (HH:MM 格式)
  },
  etime: {
    type: String,
    required: true,
    // 结束时间 (HH:MM 格式)
  },
  ctype: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    // 充放电类型: 1=充电, 2=放电, 3=空闲/待机
  },
  power: {
    type: Number,
    required: true,
    // 功率 (kW)
  },
  sdtime: {
    type: Number,
    default: 5,
    // 调度时间/延迟时间 (分钟)
  }
}, { _id: false });

// 充放电策略主文档
const chargingStrategySchema = new mongoose.Schema({
  stationId: {
    type: Number,
    required: true,
    index: true,
    // 电站 ID
  },
  date: {
    type: Date,
    required: true,
    index: true,
    // 策略生效日期
  },
  gatewayId: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    // 网关 ID
  },
  timeslots: {
    type: [timeslotSchema],
    required: true,
    validate: {
      validator: function(timeslots) {
        return timeslots && timeslots.length > 0;
      },
      message: '至少需要一个时间段策略'
    },
    // 时间段策略数组
  },
  isActive: {
    type: Boolean,
    default: true,
    // 是否启用
  }
}, {
  timestamps: true,
  collection: 'charging_strategies'
});

// 复合索引：确保同一电站、同一日期、同一网关的策略唯一
chargingStrategySchema.index({ stationId: 1, date: 1, gatewayId: 1 }, { unique: true });

// 静态方法：通过电站 ID 查询策略
chargingStrategySchema.statics.findByStationId = function(stationId, options = {}) {
  const query = { stationId, isActive: true };

  // 如果提供了日期范围
  if (options.startDate || options.endDate) {
    query.date = {};
    if (options.startDate) query.date.$gte = new Date(options.startDate);
    if (options.endDate) query.date.$lte = new Date(options.endDate);
  }

  return this.find(query).sort({ date: -1 });
};

// 静态方法：通过网关 ID 查询策略
chargingStrategySchema.statics.findByGatewayId = function(gatewayId, options = {}) {
  const query = {
    gatewayId: gatewayId.toLowerCase(),
    isActive: true
  };

  if (options.startDate || options.endDate) {
    query.date = {};
    if (options.startDate) query.date.$gte = new Date(options.startDate);
    if (options.endDate) query.date.$lte = new Date(options.endDate);
  }

  return this.find(query).sort({ date: -1 });
};

// 静态方法：获取指定日期的策略
chargingStrategySchema.statics.findByDate = function(stationId, date) {
  // 使用日期范围查询而不是精确匹配，避免时区问题
  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1);

  return this.findOne({
    stationId,
    date: {
      $gte: startOfDay,
      $lt: endOfDay
    },
    isActive: true
  });
};

// 实例方法：获取充电类型的描述
chargingStrategySchema.methods.getCtypeDescription = function(ctype) {
  const descriptions = {
    1: '充电',
    2: '放电',
    3: '空闲'
  };
  return descriptions[ctype] || '未知';
};

// 实例方法：计算总充电时长（小时）
chargingStrategySchema.methods.getTotalChargingHours = function() {
  return this.timeslots
    .filter(slot => slot.ctype === 1)
    .reduce((total, slot) => {
      const [sHour, sMin] = slot.stime.split(':').map(Number);
      const [eHour, eMin] = slot.etime.split(':').map(Number);
      const hours = (eHour * 60 + eMin - sHour * 60 - sMin) / 60;
      return total + hours;
    }, 0);
};

// 实例方法：计算总放电时长（小时）
chargingStrategySchema.methods.getTotalDischargingHours = function() {
  return this.timeslots
    .filter(slot => slot.ctype === 2)
    .reduce((total, slot) => {
      const [sHour, sMin] = slot.stime.split(':').map(Number);
      const [eHour, eMin] = slot.etime.split(':').map(Number);
      const hours = (eHour * 60 + eMin - sHour * 60 - sMin) / 60;
      return total + hours;
    }, 0);
};

const ChargingStrategy = mongoose.model('ChargingStrategy', chargingStrategySchema);

module.exports = ChargingStrategy;
