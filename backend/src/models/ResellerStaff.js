const mongoose = require('mongoose');

const ResellerStaffSchema = new mongoose.Schema({
  // 员工信息
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  
  // 个人信息
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  
  // 所属经销商
  resellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reseller',
    required: true
  },
  
  // 创建者（经销商管理员）
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 角色权限
  role: {
    type: String,
    enum: ['technician', 'supervisor', 'manager'],
    default: 'technician'
  },
  
  // 权限管理
  permissions: {
    canViewDevices: { type: Boolean, default: true },
    canEditDevices: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
    canManagePermissions: { type: Boolean, default: false }
  },
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
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

ResellerStaffSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ResellerStaff', ResellerStaffSchema);
