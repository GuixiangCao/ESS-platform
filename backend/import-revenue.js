const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const StationRevenue = require('./src/models/StationRevenue');

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform';

// CSV 文件路径
const CSV_FILE_PATH = path.join(__dirname, '../国内电站收益-260114.csv');

// 主函数
async function importRevenueData() {
  try {
    console.log('🔄 开始连接 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    console.log(`📂 读取 CSV 文件: ${CSV_FILE_PATH}`);

    const records = [];
    let lineCount = 0;

    // 读取 CSV 文件
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          lineCount++;

          // 解析日期格式 (YYYY-MM-DD)
          const dateParts = row['日期'].split('-');
          const date = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
          );

          records.push({
            stationId: parseInt(row['电站id']),
            stationName: row['电站名称'],
            currency: row['货币单位'],
            date: date,
            expectedRevenue: parseFloat(row['预期收益']),
            actualRevenue: parseFloat(row['实际收益'])
          });
        })
        .on('end', () => {
          console.log(`✅ CSV 读取完成，共 ${lineCount} 条记录`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ CSV 读取失败:', error);
          reject(error);
        });
    });

    console.log('🔄 开始写入数据库...');

    // 使用 bulkWrite 进行批量插入，遇到重复数据时更新
    const bulkOps = records.map(record => ({
      updateOne: {
        filter: {
          stationId: record.stationId,
          date: record.date
        },
        update: { $set: record },
        upsert: true
      }
    }));

    const result = await StationRevenue.bulkWrite(bulkOps);

    console.log('\n📊 导入结果统计:');
    console.log(`   - 新增记录: ${result.upsertedCount}`);
    console.log(`   - 更新记录: ${result.modifiedCount}`);
    console.log(`   - 匹配记录: ${result.matchedCount}`);
    console.log(`   - 总处理数: ${records.length}`);

    // 验证导入结果
    const totalCount = await StationRevenue.countDocuments();
    const stationCount = await StationRevenue.distinct('stationId');
    const dateRange = await StationRevenue.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      }
    ]);

    console.log('\n📈 数据库验证:');
    console.log(`   - 数据库总记录数: ${totalCount}`);
    console.log(`   - 电站数量: ${stationCount.length}`);
    if (dateRange.length > 0) {
      console.log(`   - 日期范围: ${dateRange[0].minDate.toISOString().split('T')[0]} ~ ${dateRange[0].maxDate.toISOString().split('T')[0]}`);
    }

    // 显示部分电站统计
    console.log('\n🏢 电站列表:');
    const stations = await StationRevenue.aggregate([
      {
        $group: {
          _id: { stationId: '$stationId', stationName: '$stationName' },
          recordCount: { $sum: 1 },
          totalExpected: { $sum: '$expectedRevenue' },
          totalActual: { $sum: '$actualRevenue' }
        }
      },
      { $sort: { '_id.stationId': 1 } },
      { $limit: 10 }
    ]);

    stations.forEach(station => {
      const achievementRate = ((station.totalActual / station.totalExpected) * 100).toFixed(2);
      console.log(`   ${station._id.stationId}. ${station._id.stationName}: ${station.recordCount} 条记录, 达成率 ${achievementRate}%`);
    });

    console.log('\n✅ 数据导入成功！');

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB 连接已关闭');
  }
}

// 执行导入
importRevenueData()
  .then(() => {
    console.log('\n🎉 所有操作完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 程序异常退出:', error.message);
    process.exit(1);
  });
