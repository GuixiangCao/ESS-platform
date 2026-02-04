require('dotenv').config();
const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');

// 2026年中国法定节假日配置
const holidays2026 = [
  // 元旦：1月1日-3日放假
  { date: '2026-01-01', name: '元旦', type: 'holiday', isHoliday: true },
  { date: '2026-01-02', name: '元旦', type: 'holiday', isHoliday: true },
  { date: '2026-01-03', name: '元旦', type: 'holiday', isHoliday: true },
  { date: '2026-01-04', name: '元旦调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },

  // 春节：1月29日-2月4日放假
  { date: '2026-01-29', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-01-30', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-01-31', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-02-01', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-02-02', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-02-03', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-02-04', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2026-01-24', name: '春节调休', type: 'workday_adjustment', isHoliday: false, description: '周六调休上班' },
  { date: '2026-02-08', name: '春节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },

  // 清明节：4月4日-6日放假
  { date: '2026-04-04', name: '清明节', type: 'holiday', isHoliday: true },
  { date: '2026-04-05', name: '清明节', type: 'holiday', isHoliday: true },
  { date: '2026-04-06', name: '清明节', type: 'holiday', isHoliday: true },

  // 劳动节：5月1日-5日放假
  { date: '2026-05-01', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2026-05-02', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2026-05-03', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2026-05-04', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2026-05-05', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2026-04-26', name: '劳动节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },
  { date: '2026-05-09', name: '劳动节调休', type: 'workday_adjustment', isHoliday: false, description: '周六调休上班' },

  // 端午节：6月25日-27日放假
  { date: '2026-06-25', name: '端午节', type: 'holiday', isHoliday: true },
  { date: '2026-06-26', name: '端午节', type: 'holiday', isHoliday: true },
  { date: '2026-06-27', name: '端午节', type: 'holiday', isHoliday: true },
  { date: '2026-06-28', name: '端午节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },

  // 中秋节：9月26日-27日放假
  { date: '2026-09-26', name: '中秋节', type: 'holiday', isHoliday: true },
  { date: '2026-09-27', name: '中秋节', type: 'holiday', isHoliday: true },

  // 国庆节：10月1日-7日放假
  { date: '2026-10-01', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-02', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-03', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-04', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-05', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-06', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-10-07', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2026-09-20', name: '中秋国庆调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },
  { date: '2026-10-10', name: '中秋国庆调休', type: 'workday_adjustment', isHoliday: false, description: '周六调休上班' }
];

// 2025年中国法定节假日配置（历史数据）
const holidays2025 = [
  // 元旦：1月1日放假
  { date: '2025-01-01', name: '元旦', type: 'holiday', isHoliday: true },

  // 春节：1月28日-2月3日放假
  { date: '2025-01-28', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-01-29', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-01-30', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-01-31', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-02-01', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-02-02', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-02-03', name: '春节', type: 'holiday', isHoliday: true },
  { date: '2025-01-26', name: '春节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },
  { date: '2025-02-08', name: '春节调休', type: 'workday_adjustment', isHoliday: false, description: '周六调休上班' },

  // 清明节：4月4日-6日放假
  { date: '2025-04-04', name: '清明节', type: 'holiday', isHoliday: true },
  { date: '2025-04-05', name: '清明节', type: 'holiday', isHoliday: true },
  { date: '2025-04-06', name: '清明节', type: 'holiday', isHoliday: true },

  // 劳动节：5月1日-5日放假
  { date: '2025-05-01', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2025-05-02', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2025-05-03', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2025-05-04', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2025-05-05', name: '劳动节', type: 'holiday', isHoliday: true },
  { date: '2025-04-27', name: '劳动节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },

  // 端午节：5月31日-6月2日放假
  { date: '2025-05-31', name: '端午节', type: 'holiday', isHoliday: true },
  { date: '2025-06-01', name: '端午节', type: 'holiday', isHoliday: true },
  { date: '2025-06-02', name: '端午节', type: 'holiday', isHoliday: true },

  // 中秋节：10月6日放假（与国庆节连休）
  { date: '2025-10-06', name: '中秋节', type: 'holiday', isHoliday: true },

  // 国庆节：10月1日-7日放假
  { date: '2025-10-01', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-10-02', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-10-03', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-10-04', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-10-05', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-10-07', name: '国庆节', type: 'holiday', isHoliday: true },
  { date: '2025-09-28', name: '国庆节调休', type: 'workday_adjustment', isHoliday: false, description: '周日调休上班' },
  { date: '2025-10-11', name: '国庆节调休', type: 'workday_adjustment', isHoliday: false, description: '周六调休上班' }
];

async function initHolidays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('初始化中国法定节假日配置');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 清空现有数据
    const deleteResult = await Holiday.deleteMany({});
    console.log(`🗑️  清空现有节假日数据: ${deleteResult.deletedCount} 条\n`);

    // 合并所有年份的节假日数据
    const allHolidays = [...holidays2025, ...holidays2026].map(h => ({
      ...h,
      date: new Date(h.date + 'T00:00:00.000Z'),
      year: new Date(h.date).getFullYear()
    }));

    // 批量插入
    const insertResult = await Holiday.insertMany(allHolidays);
    console.log(`✓ 成功插入 ${insertResult.length} 条节假日数据\n`);

    // 统计信息
    console.log('📊 统计信息:');
    const stats2025 = await Holiday.countDocuments({ year: 2025, isHoliday: true });
    const stats2026 = await Holiday.countDocuments({ year: 2026, isHoliday: true });
    const adjustments2025 = await Holiday.countDocuments({ year: 2025, type: 'workday_adjustment' });
    const adjustments2026 = await Holiday.countDocuments({ year: 2026, type: 'workday_adjustment' });

    console.log(`  2025年: ${stats2025} 天节假日, ${adjustments2025} 天调休工作日`);
    console.log(`  2026年: ${stats2026} 天节假日, ${adjustments2026} 天调休工作日\n`);

    // 测试查询
    console.log('🔍 测试节假日查询:\n');

    // 测试2026年元旦
    const isHoliday0101 = await Holiday.isHolidayDate('2026-01-01');
    const isHoliday0104 = await Holiday.isHolidayDate('2026-01-04');
    console.log(`  2026-01-01 (元旦): ${isHoliday0101 ? '✓ 节假日' : '✗ 工作日'}`);
    console.log(`  2026-01-04 (周日调休): ${isHoliday0104 ? '✓ 节假日' : '✓ 工作日 (调休)'}`);

    // 测试普通周末
    const isHoliday0110 = await Holiday.isHolidayDate('2026-01-10'); // 周六
    const isHoliday0112 = await Holiday.isHolidayDate('2026-01-12'); // 周一
    console.log(`  2026-01-10 (周六): ${isHoliday0110 ? '✓ 节假日' : '✗ 工作日'}`);
    console.log(`  2026-01-12 (周一): ${isHoliday0112 ? '✓ 节假日' : '✓ 工作日'}`);

    console.log('\n' + '─'.repeat(60));
    console.log('✓ 节假日配置初始化完成\n');

    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

initHolidays();
