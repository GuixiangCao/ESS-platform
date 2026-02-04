const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ChargingStrategy = require('../models/ChargingStrategy');

// Load environment variables
dotenv.config();

// CSV 文件路径
const CSV_FILE_PATH = path.join(__dirname, '../../../电站充放电策略.csv');

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

// 解析日期（DD/M/YYYY 或 D/M/YYYY 格式）
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 月份从0开始
    const year = parseInt(parts[2]);

    return new Date(year, month, day);
  } catch (error) {
    console.error('日期解析错误:', dateStr, error.message);
    return null;
  }
}

// 解析时间段策略 JSON
function parseTimeslots(timeslotsJson) {
  if (!timeslotsJson) return [];

  try {
    // CSV中的双引号被转义为两个双引号，需要处理
    const jsonStr = timeslotsJson.replace(/""/g, '"');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('时间段策略解析错误:', error.message);
    return [];
  }
}

// 导入数据
async function importData() {
  try {
    console.log('\n开始导入充放电策略数据...\n');
    console.log(`CSV 文件路径: ${CSV_FILE_PATH}`);

    // 连接数据库
    await connectDB();

    // 清空现有数据（可选）
    const shouldClearData = process.argv.includes('--clear');
    if (shouldClearData) {
      console.log('清空现有充放电策略数据...');
      await ChargingStrategy.deleteMany({});
      console.log('✓ 现有数据已清空\n');
    }

    const strategies = [];
    let errorCount = 0;
    let lineNumber = 0;

    // 读取 CSV 文件
    console.log('读取 CSV 文件...');

    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;

          try {
            // 获取字段
            const stationId = row.station_id || row.stationId;
            const dateStr = row.date;
            const gatewayId = row.gateway_id || row.gatewayId;
            const timeslotsJson = row.timeslots_json || row.timeslotsJson;

            // 验证必填字段
            if (!stationId || !dateStr || !gatewayId || !timeslotsJson) {
              console.warn(`⚠️  第 ${lineNumber} 行: 缺少必填字段，跳过`);
              errorCount++;
              return;
            }

            // 解析日期
            const date = parseDate(dateStr);
            if (!date) {
              console.warn(`⚠️  第 ${lineNumber} 行: 日期格式错误 (${dateStr})，跳过`);
              errorCount++;
              return;
            }

            // 解析时间段策略
            const timeslots = parseTimeslots(timeslotsJson);
            if (timeslots.length === 0) {
              console.warn(`⚠️  第 ${lineNumber} 行: 时间段策略解析失败，跳过`);
              errorCount++;
              return;
            }

            // 创建记录
            strategies.push({
              stationId: parseInt(stationId),
              date,
              gatewayId: String(gatewayId).toLowerCase().trim(),
              timeslots,
              isActive: true
            });

          } catch (error) {
            console.error(`⚠️  第 ${lineNumber} 行处理错误:`, error.message);
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

    console.log(`✓ CSV 读取完成\n`);
    console.log(`处理结果: 成功 ${strategies.length} 条，错误 ${errorCount} 条\n`);

    // 批量插入数据库
    if (strategies.length > 0) {
      console.log('正在插入数据到数据库...');
      console.log(`准备插入 ${strategies.length} 条记录\n`);

      // 分批插入（每批500条）
      const batchSize = 500;
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < strategies.length; i += batchSize) {
        const batch = strategies.slice(i, i + batchSize);

        try {
          const result = await ChargingStrategy.insertMany(batch, { ordered: false });
          inserted += result.length;
          console.log(`  批次 ${Math.floor(i / batchSize) + 1}: 已插入 ${result.length} 条记录`);
        } catch (error) {
          // 处理重复键错误
          if (error.code === 11000 || error.name === 'MongoBulkWriteError') {
            const totalAttempted = batch.length;
            const failedCount = error.writeErrors ? error.writeErrors.length : 0;
            const successCount = totalAttempted - failedCount;

            inserted += successCount;
            failed += failedCount;

            console.log(`  批次 ${Math.floor(i / batchSize) + 1}: 成功 ${successCount} 条，重复 ${failedCount} 条`);

            if (error.writeErrors && error.writeErrors.length > 0 && failedCount <= 5) {
              error.writeErrors.forEach((err, idx) => {
                const failedDoc = batch[err.index];
                console.log(`    - 重复: Station ${failedDoc.stationId}, Date ${failedDoc.date.toISOString().split('T')[0]}, Gateway ${failedDoc.gatewayId}`);
              });
            }
          } else {
            console.error('未预期的错误:', error.message);
            throw error;
          }
        }
      }

      console.log(`\n✓ 插入完成: 成功 ${inserted} 条，失败/重复 ${failed} 条\n`);

      // 显示统计信息
      const totalCount = await ChargingStrategy.countDocuments({ isActive: true });
      console.log('✓ 导入完成！');
      console.log(`  - 数据库中共有 ${totalCount} 条充放电策略\n`);

      // 显示前 5 条记录示例
      console.log('前 5 条记录示例:');
      const samples = await ChargingStrategy.find({ isActive: true })
        .sort({ stationId: 1, date: 1 })
        .limit(5);

      samples.forEach((strategy, index) => {
        console.log(`${index + 1}. 电站 ${strategy.stationId} - ${strategy.date.toISOString().split('T')[0]}`);
        console.log(`   网关: ${strategy.gatewayId}`);
        console.log(`   时间段数量: ${strategy.timeslots.length}`);
        console.log(`   充电时长: ${strategy.getTotalChargingHours().toFixed(2)} 小时`);
        console.log(`   放电时长: ${strategy.getTotalDischargingHours().toFixed(2)} 小时`);
      });

    } else {
      console.log('⚠️  没有有效数据可导入');
    }

  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    console.error(error.stack);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');
  }
}

// 运行导入
importData();
