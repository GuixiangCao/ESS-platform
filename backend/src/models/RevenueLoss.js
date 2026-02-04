const mongoose = require('mongoose');

const revenueLossSchema = new mongoose.Schema({
  stationId: {
    type: Number,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  lossType: {
    type: String,
    required: true,
    enum: ['planned_shutdown', 'equipment_failure', 'external_factors'],
    index: true
  },
  lossAmount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  // 详细原因
  reason: {
    type: String,
    default: ''
  },
  // 持续时间（小时）
  duration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'revenue_losses'
});

// 创建复合索引
revenueLossSchema.index({ stationId: 1, date: 1 });
revenueLossSchema.index({ lossType: 1, date: 1 });

// 静态方法：获取电站的损失统计
revenueLossSchema.statics.getLossStatsByStation = async function(stationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        stationId: parseInt(stationId),
        ...(startDate && endDate ? {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        } : {})
      }
    },
    {
      $group: {
        _id: '$lossType',
        totalLoss: { $sum: '$lossAmount' },
        count: { $sum: 1 },
        avgLoss: { $avg: '$lossAmount' },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
};

// 静态方法：获取每日损失详情
revenueLossSchema.statics.getDailyLossDetails = async function(stationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        stationId: parseInt(stationId),
        ...(startDate && endDate ? {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        } : {})
      }
    },
    {
      $group: {
        _id: {
          date: '$date',
          lossType: '$lossType'
        },
        totalLoss: { $sum: '$lossAmount' },
        records: {
          $push: {
            description: '$description',
            reason: '$reason',
            lossAmount: '$lossAmount',
            duration: '$duration'
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        losses: {
          $push: {
            lossType: '$_id.lossType',
            totalLoss: '$totalLoss',
            records: '$records'
          }
        },
        totalDailyLoss: { $sum: '$totalLoss' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const RevenueLoss = mongoose.model('RevenueLoss', revenueLossSchema);

module.exports = RevenueLoss;
