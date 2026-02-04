const mongoose = require('mongoose');

const ResellerSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // 联系信息
  contactPerson: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  address: {
    type: String,
    default: ''
  },
  
  // 关联管理员账户
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 层级关系
  parentResellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reseller',
    default: null,
    index: true
  },
  hierarchyLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  path: {
    type: String,
    default: '',
    index: true
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // 统计信息
  deviceCount: {
    type: Number,
    default: 0
  },
  staffCount: {
    type: Number,
    default: 0
  },
  subResellerCount: {
    type: Number,
    default: 0
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

// 更新时间戳
ResellerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 更新层级路径
ResellerSchema.pre('save', async function(next) {
  if (this.isModified('parentResellerId')) {
    if (this.parentResellerId) {
      const parent = await this.constructor.findById(this.parentResellerId);
      if (parent) {
        this.hierarchyLevel = parent.hierarchyLevel + 1;
        this.path = parent.path ? `${parent.path}/${parent._id}` : `${parent._id}`;
      }
    } else {
      this.hierarchyLevel = 0;
      this.path = '';
    }
  }
  next();
});

// 实例方法：获取所有祖先
ResellerSchema.methods.getAncestors = async function() {
  if (!this.path) return [];

  const ancestorIds = this.path.split('/').filter(id => id);
  return await this.constructor.find({
    _id: { $in: ancestorIds }
  }).sort({ hierarchyLevel: 1 });
};

// 实例方法：获取直接子经销商
ResellerSchema.methods.getChildren = async function() {
  return await this.constructor.find({
    parentResellerId: this._id
  });
};

// 实例方法：获取所有后代
ResellerSchema.methods.getDescendants = async function() {
  const pathRegex = new RegExp(`^${this.path}/${this._id}`);
  return await this.constructor.find({
    path: pathRegex
  }).sort({ hierarchyLevel: 1, name: 1 });
};

// 静态方法：获取顶级经销商
ResellerSchema.statics.getTopLevel = function() {
  return this.find({
    parentResellerId: null
  });
};

// 静态方法：构建层级树
ResellerSchema.statics.buildTree = async function(parentId = null) {
  const resellers = await this.find({
    parentResellerId: parentId
  }).populate('adminId', 'username email');

  const tree = [];
  for (const reseller of resellers) {
    const node = reseller.toObject();
    node.children = await this.buildTree(reseller._id);
    tree.push(node);
  }

  return tree;
};

module.exports = mongoose.model('Reseller', ResellerSchema);
