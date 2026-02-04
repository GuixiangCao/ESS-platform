const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const StationRevenue = require('../src/models/StationRevenue');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

async function verifyFix() {
  try {
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功\n');

    const stationId = 173;

    // 获取所有记录
    const records = await StationRevenue.find({ stationId }).sort({ date: 1 }).lean();

    console.log('=== 电站173可控收益率计算验证 ===\n');
    console.log(`总记录数: ${records.length}`);

    // 统计有实际收益的天数
    const daysWithRevenue = records.filter(r => r.actualRevenue > 0);
    const daysWithoutRevenue = records.filter(r => r.actualRevenue === 0 || !r.actualRevenue);

    console.log(`\n实际收益 > 0 的天数: ${daysWithRevenue.length}`);
    console.log(`实际收益 = 0 的天数: ${daysWithoutRevenue.length}`);

    // 计算总收益（包含所有天数）
    const totalExpected = records.reduce((sum, r) => sum + r.expectedRevenue, 0);
    const totalActual = records.reduce((sum, r) => sum + r.actualRevenue, 0);

    // 计算可控收益（仅包含实际收益>0的天数）
    const controllableExpected = daysWithRevenue.reduce((sum, r) => sum + r.expectedRevenue, 0);
    const controllableActual = daysWithRevenue.reduce((sum, r) => sum + r.actualRevenue, 0);

    console.log(`\n=== 总收益统计 ===`);
    console.log(`总预期收益: ${totalExpected.toFixed(2)}`);
    console.log(`总实际收益: ${totalActual.toFixed(2)}`);
    console.log(`达成率: ${((totalActual / totalExpected) * 100).toFixed(2)}%`);

    console.log(`\n=== 可控收益统计（排除实际收益=0的天数） ===`);
    console.log(`可控预期收益: ${controllableExpected.toFixed(2)}`);
    console.log(`可控实际收益: ${controllableActual.toFixed(2)}`);
    console.log(`可控收益率: ${((controllableActual / controllableExpected) * 100).toFixed(2)}%`);

    console.log(`\n=== 对比 ===`);
    console.log(`排除的预期收益: ${(totalExpected - controllableExpected).toFixed(2)}`);
    console.log(`排除的实际收益: ${(totalActual - controllableActual).toFixed(2)}`);

    // 列出实际收益为0的天数
    if (daysWithoutRevenue.length > 0 && daysWithoutRevenue.length <= 10) {
      console.log(`\n实际收益为0的日期:`);
      daysWithoutRevenue.forEach(r => {
        console.log(`  ${r.date.toISOString().split('T')[0]}: 预期=${r.expectedRevenue.toFixed(2)}, 实际=${r.actualRevenue}`);
      });
    }

  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

verifyFix();
