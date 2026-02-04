const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['holiday', 'weekend', 'workday_adjustment'], // 法定节假日、周末、调休工作日
    required: true
  },
  isHoliday: {
    type: Boolean,
    required: true,
    default: true
  },
  description: String
}, {
  timestamps: true
});

// 复合索引：年份 + 是否节假日
holidaySchema.index({ year: 1, isHoliday: 1 });

// 静态方法：检查某个日期是否为节假日（包括周末，排除调休工作日）
holidaySchema.statics.isHolidayDate = async function(date) {
  // 将日期字符串转换为UTC日期对象（数据库存储格式）
  let dateObj;
  if (typeof date === 'string') {
    // 如果是字符串格式 'YYYY-MM-DD'，转换为UTC日期
    dateObj = new Date(date + 'T00:00:00.000Z');
  } else {
    dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);
  }

  // 检查是否在节假日配置中
  const holiday = await this.findOne({ date: dateObj });

  if (holiday) {
    return holiday.isHoliday;
  }

  // 如果没有配置，默认检查是否为周六日（使用UTC日期）
  const dayOfWeek = dateObj.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0=周日, 6=周六
};

// 静态方法：批量检查日期是否为节假日
holidaySchema.statics.checkHolidayDates = async function(dates) {
  const result = {};

  // 查询所有日期的节假日配置
  const startDate = new Date(Math.min(...dates.map(d => new Date(d))));
  const endDate = new Date(Math.max(...dates.map(d => new Date(d))));
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const holidays = await this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const holidayMap = new Map();
  holidays.forEach(h => {
    const dateKey = h.date.toISOString().split('T')[0];
    holidayMap.set(dateKey, h.isHoliday);
  });

  // 检查每个日期
  dates.forEach(date => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const dateKey = dateObj.toISOString().split('T')[0];

    if (holidayMap.has(dateKey)) {
      result[dateKey] = holidayMap.get(dateKey);
    } else {
      // 默认检查是否为周六日
      const dayOfWeek = dateObj.getDay();
      result[dateKey] = dayOfWeek === 0 || dayOfWeek === 6;
    }
  });

  return result;
};

module.exports = mongoose.model('Holiday', holidaySchema);
