const mongoose = require('mongoose');

const stationGatewaySchema = new mongoose.Schema({
  stationId: {
    type: Number,
    required: true,
    index: true,
    // 电站 ID（可以有多个网关，所以不设置 unique）
  },
  stationName: {
    type: String,
    required: true,
    index: true,
    // 电站名称
  },
  gatewayId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    // 网关 ID (MAC 地址格式，每个网关唯一)
  },
  deviceId: {
    type: String,
    index: true,
    // 设备 ID (UUID 格式，对应 device_name)
  },
  deviceModel: {
    type: String,
    // 设备型号
  },
  isActive: {
    type: Boolean,
    default: true,
    // 是否启用
  },
  location: {
    province: String,
    city: String,
    address: String,
    // 位置信息（可选）
  },
  capacity: {
    type: Number,
    // 装机容量 (kW)
  },
  commissionDate: {
    type: Date,
    // 投运日期
  },
  notes: {
    type: String,
    // 备注
  }
}, {
  timestamps: true,
  collection: 'station_gateways'
});

// 复合索引
stationGatewaySchema.index({ stationName: 1, isActive: 1 });
stationGatewaySchema.index({ gatewayId: 1, isActive: 1 });

// 静态方法：通过电站 ID 查找所有网关
stationGatewaySchema.statics.findByStationId = function(stationId) {
  return this.find({ stationId, isActive: true });
};

// 静态方法：通过网关 ID 查找
stationGatewaySchema.statics.findByGatewayId = function(gatewayId) {
  return this.findOne({
    gatewayId: gatewayId.toLowerCase(),
    isActive: true
  });
};

// 静态方法：搜索电站
stationGatewaySchema.statics.searchStations = function(keyword) {
  const regex = new RegExp(keyword, 'i');
  return this.find({
    $or: [
      { stationName: regex },
      { gatewayId: regex }
    ],
    isActive: true
  });
};

// 实例方法：格式化网关 ID
stationGatewaySchema.methods.getFormattedGatewayId = function() {
  // 将 00149751c2ee 格式化为 00:14:97:51:c2:ee
  const id = this.gatewayId;
  if (id && id.length === 12) {
    return id.match(/.{1,2}/g).join(':');
  }
  return id;
};

const StationGateway = mongoose.model('StationGateway', stationGatewaySchema);

module.exports = StationGateway;
