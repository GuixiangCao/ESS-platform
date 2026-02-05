const mongoose = require('mongoose');

const outageReasonHistorySchema = new mongoose.Schema({
  reasonType: String,
  reasonNote: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const unplannedOutageReasonSchema = new mongoose.Schema({
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
  reasonType: {
    type: String,
    enum: [
      'power_grid_outage',        // 电网停电
      'equipment_maintenance',    // 设备维护
      'weather_conditions',       // 天气原因
      'policy_restriction',       // 政策限制
      'manual_shutdown',          // 人工停机
      'communication_failure',    // 通讯故障
      'fire',                     // 火灾
      'other'                     // 其他
    ],
    default: 'other'
  },
  reasonNote: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  history: [outageReasonHistorySchema]
}, {
  timestamps: true
});

// 复合索引：确保每个电站每天只有一条记录
unplannedOutageReasonSchema.index({ stationId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UnplannedOutageReason', unplannedOutageReasonSchema);
