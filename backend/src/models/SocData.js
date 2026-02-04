const mongoose = require('mongoose');

const socDataSchema = new mongoose.Schema({
  // 设备ID
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  // 网关ID（MAC地址）
  gatewayId: {
    type: String,
    index: true
  },
  // 电站ID
  stationId: {
    type: Number,
    index: true
  },
  // 时间戳
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  // SOC值（电量百分比 0-100）
  soc: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  // 修正后的SOC值（用于平滑异常跳变）
  socCorrected: {
    type: Number,
    min: 0,
    max: 100
  },
  // 是否经过跳变修正
  isJumpCorrected: {
    type: Boolean,
    default: false
  },
  // 数据日期（用于快速查询某天的数据）
  dataDate: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'soc_data'
});

// 复合索引优化查询
socDataSchema.index({ deviceId: 1, timestamp: 1 });
socDataSchema.index({ stationId: 1, dataDate: 1 });
socDataSchema.index({ gatewayId: 1, timestamp: 1 });

// 静态方法：按设备ID和时间范围查询
socDataSchema.statics.findByDevice = function(deviceId, startDate, endDate) {
  return this.find({
    deviceId,
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ timestamp: 1 });
};

// 静态方法：按电站ID和日期查询
socDataSchema.statics.findByStation = function(stationId, startDate, endDate) {
  return this.find({
    stationId,
    dataDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ timestamp: 1 });
};

// 静态方法：获取设备在特定时间的SOC
socDataSchema.statics.getSocAtTime = async function(deviceId, targetTime) {
  const record = await this.findOne({
    deviceId,
    timestamp: { $lte: new Date(targetTime) }
  }).sort({ timestamp: -1 });

  return record ? record.soc : null;
};

const SocData = mongoose.model('SocData', socDataSchema);

module.exports = SocData;
