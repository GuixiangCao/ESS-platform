const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  // 权限编码
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  
  // 权限名称
  name: {
    type: String,
    required: true
  },
  
  // 权限描述
  description: {
    type: String,
    default: ''
  },
  
  // 权限类别
  category: {
    type: String,
    enum: ['reseller', 'device', 'staff', 'report', 'system'],
    required: true
  },
  
  // 权限级别
  level: {
    type: String,
    enum: ['view', 'create', 'edit', 'delete', 'manage'],
    required: true
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Permission', PermissionSchema);
