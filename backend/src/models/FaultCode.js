const mongoose = require('mongoose');

/**
 * 故障代码模型
 * 用于存储PCS和其他设备的故障代码映射关系
 */
const faultCodeSchema = new mongoose.Schema({
  // 故障分类（如：PCS自身故障、电池故障、环境安全故障等）
  category: {
    type: String,
    required: true,
    index: true
  },
  // 英文代码（唯一标识）
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // 中文描述
  description: {
    type: String,
    required: true
  },
  // 严重程度（根据故障类型推断）
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'warning'
  },
  // 设备类型
  deviceType: {
    type: String,
    enum: ['pcs', 'battery', 'ac', 'ems', 'system', 'unknown'],
    default: 'unknown'
  }
}, {
  timestamps: true
});

// 复合索引
faultCodeSchema.index({ category: 1, code: 1 });
faultCodeSchema.index({ deviceType: 1, severity: 1 });

/**
 * 根据代码查找故障信息
 */
faultCodeSchema.statics.findByCode = async function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

/**
 * 根据分类查找所有故障
 */
faultCodeSchema.statics.findByCategory = async function(category) {
  return this.find({ category }).sort({ code: 1 });
};

/**
 * 获取所有故障分类
 */
faultCodeSchema.statics.getCategories = async function() {
  return this.distinct('category');
};

/**
 * 根据严重程度统计
 */
faultCodeSchema.statics.getStatsBySeverity = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
        categories: { $addToSet: '$category' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('FaultCode', faultCodeSchema);
