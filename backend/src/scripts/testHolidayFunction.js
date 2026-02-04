require('dotenv').config();
const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');

async function testHolidayFunction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试节假日查询功能');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 测试用例
    const testCases = [
      // 2026年元旦测试
      { date: '2026-01-01', expected: true, description: '元旦第1天（法定节假日）' },
      { date: '2026-01-02', expected: true, description: '元旦第2天（法定节假日）' },
      { date: '2026-01-03', expected: true, description: '元旦第3天（法定节假日）' },
      { date: '2026-01-04', expected: false, description: '元旦调休上班日（周日）' },
      { date: '2026-01-05', expected: false, description: '普通工作日（周一）' },

      // 普通周末测试
      { date: '2026-01-10', expected: true, description: '普通周六' },
      { date: '2026-01-11', expected: true, description: '普通周日' },

      // 春节测试
      { date: '2026-01-29', expected: true, description: '春节第1天' },
      { date: '2026-02-04', expected: true, description: '春节第7天' },
      { date: '2026-01-24', expected: false, description: '春节调休上班（周六）' },

      // 劳动节测试
      { date: '2026-05-01', expected: true, description: '劳动节第1天' },
      { date: '2026-05-05', expected: true, description: '劳动节第5天' },
      { date: '2026-04-26', expected: false, description: '劳动节调休上班（周日）' },

      // 国庆节测试
      { date: '2026-10-01', expected: true, description: '国庆节第1天' },
      { date: '2026-10-07', expected: true, description: '国庆节第7天' },
      { date: '2026-10-10', expected: false, description: '国庆节调休上班（周六）' },

      // 2025年数据测试
      { date: '2025-01-01', expected: true, description: '2025年元旦' },
      { date: '2025-10-01', expected: true, description: '2025年国庆节' },
    ];

    console.log('📋 单个日期查询测试:\n');

    let passedCount = 0;
    let failedCount = 0;

    for (const testCase of testCases) {
      const result = await Holiday.isHolidayDate(testCase.date);
      const passed = result === testCase.expected;

      if (passed) {
        passedCount++;
        console.log(`✓ ${testCase.date} - ${testCase.description}`);
        console.log(`  结果: ${result ? '节假日' : '工作日'} ✅\n`);
      } else {
        failedCount++;
        console.log(`✗ ${testCase.date} - ${testCase.description}`);
        console.log(`  预期: ${testCase.expected ? '节假日' : '工作日'}`);
        console.log(`  实际: ${result ? '节假日' : '工作日'} ❌\n`);
      }
    }

    console.log('─'.repeat(60));
    console.log(`\n测试结果: ${passedCount} 通过, ${failedCount} 失败\n`);

    // 批量查询测试
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批量日期查询测试\n');

    const batchDates = [
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04',
      '2026-01-10', '2026-01-11', '2026-01-12'
    ];

    const batchResults = await Holiday.checkHolidayDates(batchDates);

    console.log('查询日期范围: 2026-01-01 到 2026-01-12\n');

    for (const date of batchDates) {
      const isHoliday = batchResults[date];
      const dateObj = new Date(date + 'T00:00:00.000Z');
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = dayNames[dateObj.getDay()];

      console.log(`  ${date} (${dayName}): ${isHoliday ? '✓ 节假日' : '✗ 工作日'}`);
    }

    console.log('\n' + '─'.repeat(60));

    // 查询配置的节假日列表
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2026年节假日配置列表\n');

    const holidays2026 = await Holiday.find({
      year: 2026,
      isHoliday: true
    }).sort({ date: 1 });

    const holidayGroups = {};
    holidays2026.forEach(h => {
      if (!holidayGroups[h.name]) {
        holidayGroups[h.name] = [];
      }
      holidayGroups[h.name].push(h.date);
    });

    for (const [name, dates] of Object.entries(holidayGroups)) {
      console.log(`${name}: ${dates.length}天`);
      const dateStrs = dates.map(d => {
        const dateStr = d.toISOString().split('T')[0];
        return dateStr.substring(5); // 只显示月-日
      });
      console.log(`  ${dateStrs.join(', ')}\n`);
    }

    // 调休工作日
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2026年调休工作日列表\n');

    const adjustments2026 = await Holiday.find({
      year: 2026,
      type: 'workday_adjustment'
    }).sort({ date: 1 });

    adjustments2026.forEach(adj => {
      const dateStr = adj.date.toISOString().split('T')[0];
      console.log(`  ${dateStr} - ${adj.name} (${adj.description})`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log('\n✓ 测试完成');

    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

testHolidayFunction();
