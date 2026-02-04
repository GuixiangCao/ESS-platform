const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['inverter', 'battery', 'charger', 'monitor', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    default: ''
  },
  
  // 规格参数
  specs: {
    model: String,
    manufacturer: String,
    power: String,        // 功率
    voltage: String,      // 电压
    capacity: String      // 容量
  },
  
  // 所有者信息
  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 当前分配的经销商
  assignedReseller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reseller',
    default: null
  },

  // 分配路径（记录从顶级经销商到当前经销商的路径）
  assignmentPath: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Reseller',
    default: []
  },

  // 分配历史
  assignmentHistory: [{
    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reseller'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 设备状态
  status: {
    type: String,
    enum: ['available', 'assigned', 'inactive', 'maintenance'],
    default: 'available'
  },
  
  // 库存管理
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

DeviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Device', DeviceSchema);
