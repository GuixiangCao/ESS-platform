const mongoose = require('mongoose');

const stationRevenueSchema = new mongoose.Schema({
  stationId: {
    type: Number,
    required: true,
    index: true
  },
  stationName: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'CNY'
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  expectedRevenue: {
    type: Number,
    required: true,
    default: 0
  },
  actualRevenue: {
    type: Number,
    required: true,
    default: 0
  },
  isAI: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'station_revenues'
});

// 创建复合索引，确保每个电站的每个日期只有一条记录
stationRevenueSchema.index({ stationId: 1, date: 1 }, { unique: true });

// 添加虚拟字段：收益达成率
stationRevenueSchema.virtual('achievementRate').get(function() {
  if (this.expectedRevenue === 0) return 0;
  return ((this.actualRevenue / this.expectedRevenue) * 100).toFixed(2);
});

// 添加实例方法
stationRevenueSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.achievementRate = this.achievementRate;
  return obj;
};

const StationRevenue = mongoose.model('StationRevenue', stationRevenueSchema);

module.exports = StationRevenue;
