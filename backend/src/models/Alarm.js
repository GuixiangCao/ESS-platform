const mongoose = require('mongoose');

const alarmSchema = new mongoose.Schema({
  // 告警发生日期
  alarmDate: {
    type: Date,
    required: true,
    index: true
  },
  // 电站ID
  stationId: {
    type: Number,
    required: true,
    index: true
  },
  // 告警ID
  alarmId: {
    type: String,
    required: true,
    unique: true
  },
  // 网关设备ID（告警来源）
  gatewayDeviceId: {
    type: String,
    default: null,
    index: true
  },
  // 告警设备
  device: {
    type: String,
    required: true,
    enum: ['lc', 'pcs', 'cluster', 'meter', 'highMeter', 'ac', 'ems'],
    index: true
  },
  // 告警名称
  alarmName: {
    type: String,
    required: true,
    index: true
  },
  // 告警开始时间
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  // 告警结束时间
  endTime: {
    type: Date,
    required: true
  },
  // 告警持续时间（秒）
  duration: {
    type: Number,
    default: function() {
      return Math.floor((this.endTime - this.startTime) / 1000);
    }
  },
  // 告警持续时间（分钟）
  durationMinutes: {
    type: Number,
    default: function() {
      return Math.floor((this.endTime - this.startTime) / 60000);
    }
  },
  // 告警持续时间（小时，高精度）
  durationHours: {
    type: Number,
    default: null
  },
  // 告警损失金额（元，保留3位小数）
  alarmLoss: {
    type: Number,
    default: 0,
    min: 0
  },
  // 损失计算详情
  lossDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // 告警严重程度（可选，用于未来扩展）
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'warning'
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  collection: 'alarms'
});

// 复合索引：用于按电站和日期查询
alarmSchema.index({ stationId: 1, alarmDate: 1 });
alarmSchema.index({ stationId: 1, startTime: 1 });

// Pre-save hook: 自动设置alarmDate为UTC+8日期
alarmSchema.pre('save', function(next) {
  if (this.startTime) {
    // 将UTC时间转换为UTC+8时间
    const utcTime = new Date(this.startTime);
    const utc8Time = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);

    // 提取UTC+8日期（年-月-日），设置为UTC的00:00:00
    const year = utc8Time.getUTCFullYear();
    const month = utc8Time.getUTCMonth();
    const day = utc8Time.getUTCDate();

    this.alarmDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  next();
});

// 虚拟字段：获取格式化的持续时间
alarmSchema.virtual('durationFormatted').get(function() {
  const minutes = this.durationMinutes;
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}小时${mins}分钟`;
});

// 静态方法：按电站ID和日期范围查询告警
alarmSchema.statics.findByStationAndDateRange = function(stationId, startDate, endDate) {
  return this.find({
    stationId,
    alarmDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ startTime: -1 });
};

// 静态方法：统计告警类型分布
alarmSchema.statics.getAlarmStatsByStation = async function(stationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        stationId: parseInt(stationId),
        alarmDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          device: '$device',
          alarmName: '$alarmName'
        },
        count: { $sum: 1 },
        totalDuration: { $sum: '$durationMinutes' },
        avgDuration: { $avg: '$durationMinutes' },
        maxDuration: { $max: '$durationMinutes' },
        firstOccurrence: { $min: '$startTime' },
        lastOccurrence: { $max: '$startTime' }
      }
    },
    {
      $project: {
        _id: 0,
        device: '$_id.device',
        alarmName: '$_id.alarmName',
        count: 1,
        totalDuration: { $round: ['$totalDuration', 2] },
        avgDuration: { $round: ['$avgDuration', 2] },
        maxDuration: { $round: ['$maxDuration', 2] },
        firstOccurrence: 1,
        lastOccurrence: 1
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 静态方法：按设备类型统计
alarmSchema.statics.getDeviceStats = async function(stationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        stationId: parseInt(stationId),
        alarmDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 },
        totalDuration: { $sum: '$durationMinutes' },
        avgDuration: { $avg: '$durationMinutes' }
      }
    },
    {
      $project: {
        _id: 0,
        device: '$_id',
        count: 1,
        totalDuration: { $round: ['$totalDuration', 2] },
        avgDuration: { $round: ['$avgDuration', 2] }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Alarm', alarmSchema);
