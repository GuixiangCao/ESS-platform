const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const StationRevenue = require('../src/models/StationRevenue');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess_revenue';

async function diagnoseStation173() {
  try {
    console.log('连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功\n');

    const stationId = 173;

    // 1. 查看所有记录
    console.log('=== 电站173的所有收益记录 ===');
    const allRecords = await StationRevenue.find({ stationId }).sort({ date: 1 }).lean();

    console.log(`总记录数: ${allRecords.length}\n`);

    if (allRecords.length > 0) {
      console.log('字段检查 (前3条记录):');
      allRecords.slice(0, 3).forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  日期: ${record.date.toISOString().split('T')[0]}`);
        console.log(`  预期收益: ${record.expectedRevenue}`);
        console.log(`  实际收益: ${record.actualRevenue}`);
        console.log(`  可控预期收益: ${record.controllableExpected !== undefined ? record.controllableExpected : 'undefined'}`);
        console.log(`  可控实际收益: ${record.controllableActual !== undefined ? record.controllableActual : 'undefined'}`);
      });
    }

    // 2. 统计汇总数据
    console.log('\n\n=== 汇总统计 ===');
    const totalExpected = allRecords.reduce((sum, r) => sum + (r.expectedRevenue || 0), 0);
    const totalActual = allRecords.reduce((sum, r) => sum + (r.actualRevenue || 0), 0);
    const totalControllableExpected = allRecords.reduce((sum, r) => sum + (r.controllableExpected || 0), 0);
    const totalControllableActual = allRecords.reduce((sum, r) => sum + (r.controllableActual || 0), 0);

    console.log(`总预期收益: ${totalExpected.toFixed(2)}`);
    console.log(`总实际收益: ${totalActual.toFixed(2)}`);
    console.log(`总可控预期收益: ${totalControllableExpected.toFixed(2)}`);
    console.log(`总可控实际收益: ${totalControllableActual.toFixed(2)}`);

    const achievementRate = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;
    const controllableRate = totalControllableExpected > 0 ? (totalControllableActual / totalControllableExpected) * 100 : 0;

    console.log(`\n达成率: ${achievementRate.toFixed(2)}%`);
    console.log(`可控收益率: ${controllableRate.toFixed(2)}%`);

    // 3. 检查哪些记录有可控收益数据
    const recordsWithControllable = allRecords.filter(r =>
      r.controllableExpected !== undefined && r.controllableExpected !== null
    );
    const recordsWithoutControllable = allRecords.filter(r =>
      r.controllableExpected === undefined || r.controllableExpected === null
    );

    console.log(`\n有可控收益数据的记录: ${recordsWithControllable.length}`);
    console.log(`没有可控收益数据的记录: ${recordsWithoutControllable.length}`);

    if (recordsWithoutControllable.length > 0) {
      console.log('\n没有可控收益数据的日期:');
      recordsWithoutControllable.forEach(r => {
        console.log(`  - ${r.date.toISOString().split('T')[0]}`);
      });
    }

    // 4. 模拟列表API的查询（使用聚合）
    console.log('\n\n=== 模拟列表API查询（聚合） ===');
    const listApiResult = await StationRevenue.aggregate([
      { $match: { stationId: 173 } },
      {
        $group: {
          _id: '$stationId',
          stationName: { $first: '$stationName' },
          isAI: { $first: '$isAI' },
          totalExpected: { $sum: '$expectedRevenue' },
          totalActual: { $sum: '$actualRevenue' },
          controllableExpected: { $sum: { $ifNull: ['$controllableExpected', 0] } },
          controllableActual: { $sum: { $ifNull: ['$controllableActual', 0] } },
          recordCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          stationId: '$_id',
          stationName: 1,
          isAI: 1,
          totalExpected: { $round: ['$totalExpected', 2] },
          totalActual: { $round: ['$totalActual', 2] },
          achievementRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalActual', '$totalExpected'] }, 100] },
              2
            ]
          },
          controllableExpected: { $round: ['$controllableExpected', 2] },
          controllableActual: { $round: ['$controllableActual', 2] },
          controllableRate: {
            $round: [
              {
                $cond: [
                  { $gt: ['$controllableExpected', 0] },
                  { $multiply: [{ $divide: ['$controllableActual', '$controllableExpected'] }, 100] },
                  0
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    if (listApiResult.length > 0) {
      const result = listApiResult[0];
      console.log('列表API结果:');
      console.log(`  电站ID: ${result.stationId}`);
      console.log(`  电站名称: ${result.stationName}`);
      console.log(`  总预期收益: ${result.totalExpected}`);
      console.log(`  总实际收益: ${result.totalActual}`);
      console.log(`  达成率: ${result.achievementRate}%`);
      console.log(`  可控预期收益: ${result.controllableExpected}`);
      console.log(`  可控实际收益: ${result.controllableActual}`);
      console.log(`  可控收益率: ${result.controllableRate}%`);
    }

    // 5. 检查数据库索引和集合信息
    console.log('\n\n=== 数据库集合信息 ===');
    const collStats = await mongoose.connection.db.collection('station_revenues').stats();
    console.log(`文档总数: ${collStats.count}`);
    console.log(`平均文档大小: ${collStats.avgObjSize} 字节`);

  } catch (error) {
    console.error('诊断失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

diagnoseStation173();
