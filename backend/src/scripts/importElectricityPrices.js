const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ElectricityPrice = require('../models/ElectricityPrice');

// Load environment variables
dotenv.config();

// CSV 文件路径
const CSV_FILE_PATH = path.join(__dirname, '../../../浙江电价.csv');

// 解析日期字符串 (格式: "1/1/2023" 或 "31/12/2023")
function parseDate(dateStr) {
  if (!dateStr || dateStr === '-1') return null;

  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // 月份从 0 开始
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return null;
  } catch (error) {
    console.error(`无法解析日期: ${dateStr}`, error);
    return null;
  }
}

// 解析分时电价 JSON
function parseTimingPrice(timingPriceStr) {
  if (!timingPriceStr || timingPriceStr === '-1') return [];

  try {
    // CSV 中的双引号被转义为 ""，需要替换为单个 "
    const jsonStr = timingPriceStr.replace(/""/g, '"');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('无法解析分时电价 JSON:', error);
    return [];
  }
}

// 解析数字字段
function parseNumber(value) {
  if (!value || value === '-1' || value === '') return -1;
  const num = parseFloat(value);
  return isNaN(num) ? -1 : num;
}

// 数据库连接
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('⚠️  MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// 导入数据
async function importData() {
  try {
    console.log('\n开始导入浙江电价数据...\n');
    console.log(`CSV 文件路径: ${CSV_FILE_PATH}`);

    // 检查文件是否存在
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV 文件不存在: ${CSV_FILE_PATH}`);
    }

    // 连接数据库
    await connectDB();

    // 清空现有数据（可选）
    console.log('清空现有电价数据...');
    await ElectricityPrice.deleteMany({});
    console.log('✓ 现有数据已清空\n');

    const results = [];
    let lineNumber = 0;
    let errorCount = 0;

    // 读取并解析 CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;

          try {
            const startDate = parseDate(row.start_date);
            const endDate = parseDate(row.end_date);

            if (!startDate || !endDate) {
              console.warn(`⚠️  第 ${lineNumber} 行: 日期解析失败，跳过`);
              errorCount++;
              return;
            }

            const priceData = {
              regionId: row.region_id || '330000',
              startDate,
              endDate,
              userType: parseInt(row.user_type) || 0,
              priceType: parseInt(row.price_type) || 0,
              voltageType: parseInt(row.voltage_type) || 1,
              timingPrice: parseTimingPrice(row.timing_price),
              sharp: parseNumber(row.sharp),
              peak: parseNumber(row.peak),
              shoulder: parseNumber(row.shoulder),
              offPeak: parseNumber(row.off_peak),
              deepValley: parseNumber(row.deep_valley),
              maxDemand: parseNumber(row.max_demand),
              recordType: parseInt(row.record_type) || 1,
              transformerCapacity: parseNumber(row.transformer_capacity),
              originalId: row.id
            };

            results.push(priceData);
          } catch (error) {
            console.error(`⚠️  第 ${lineNumber} 行解析错误:`, error.message);
            errorCount++;
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    console.log(`\n读取完成: 共 ${lineNumber} 行，成功解析 ${results.length} 条，错误 ${errorCount} 条\n`);

    // 批量插入数据库
    if (results.length > 0) {
      console.log('正在批量插入数据到数据库...');

      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        try {
          await ElectricityPrice.insertMany(batch, { ordered: false });
          inserted += batch.length;
          console.log(`✓ 已插入 ${inserted}/${results.length} 条记录`);
        } catch (error) {
          // 处理重复键错误
          if (error.code === 11000) {
            console.warn(`⚠️  批次 ${i}-${i + batchSize}: 部分记录重复，已跳过`);
            inserted += batch.length;
          } else {
            console.error(`⚠️  批次 ${i}-${i + batchSize} 插入失败:`, error.message);
          }
        }
      }

      console.log(`\n✓ 导入完成！`);
      console.log(`  - 总记录数: ${results.length}`);
      console.log(`  - 成功插入: ${inserted}`);
      console.log(`  - 解析错误: ${errorCount}\n`);

      // 显示统计信息
      const stats = await ElectricityPrice.aggregate([
        {
          $group: {
            _id: {
              userType: '$userType',
              voltageType: '$voltageType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.userType': 1, '_id.voltageType': 1 } }
      ]);

      console.log('数据库统计:');
      stats.forEach(stat => {
        const userTypeLabel = stat._id.userType === 0 ? '工商业' : '居民';
        console.log(`  ${userTypeLabel} - 电压等级 ${stat._id.voltageType}: ${stat.count} 条记录`);
      });

    } else {
      console.log('⚠️  没有有效数据可导入');
    }

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');
  }
}

// 运行导入
importData();
