const XLSX = require('xlsx');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const StationGateway = require('../models/StationGateway');

// Load environment variables
dotenv.config();

// Excel 文件路径
const EXCEL_FILE_PATH = path.join(__dirname, '../../../电站网关对应表.xlsx');

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
    console.log('\n开始导入电站网关对应表...\n');
    console.log(`Excel 文件路径: ${EXCEL_FILE_PATH}`);

    // 连接数据库
    await connectDB();

    // 读取 Excel 文件
    console.log('读取 Excel 文件...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✓ 读取完成，共 ${data.length} 条记录\n`);

    if (data.length === 0) {
      console.log('⚠️  没有数据可导入');
      return;
    }

    // 清空现有数据（可选）
    console.log('清空现有电站网关数据...');
    await StationGateway.deleteMany({});
    console.log('✓ 现有数据已清空\n');

    // 处理数据
    const stationGateways = [];
    let errorCount = 0;

    console.log('处理数据...');
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // 获取字段（支持不同的列名格式）
        const stationId = row['电站ID'] || row['stationId'] || row['station_id'];
        const stationName = row['电站名称'] || row['stationName'] || row['station_name'];
        const gatewayId = row['gateway_id'] || row['gatewayId'] || row['网关ID'];

        // 验证必填字段
        if (!stationId || !stationName || !gatewayId) {
          console.warn(`⚠️  第 ${i + 1} 行: 缺少必填字段，跳过`);
          console.warn(`   数据:`, JSON.stringify(row));
          errorCount++;
          continue;
        }

        // 创建记录
        stationGateways.push({
          stationId: parseInt(stationId),
          stationName: String(stationName).trim(),
          gatewayId: String(gatewayId).toLowerCase().trim(),
          isActive: true
        });

      } catch (error) {
        console.error(`⚠️  第 ${i + 1} 行处理错误:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n处理完成: 成功 ${stationGateways.length} 条，错误 ${errorCount} 条\n`);

    // 批量插入数据库
    if (stationGateways.length > 0) {
      console.log('正在插入数据到数据库...');
      console.log(`准备插入 ${stationGateways.length} 条记录\n`);

      try {
        const result = await StationGateway.insertMany(stationGateways, { ordered: false });
        console.log(`✓ 已插入 ${result.length} 条记录\n`);
      } catch (error) {
        // 处理重复键错误
        if (error.code === 11000 || error.name === 'MongoBulkWriteError') {
          console.warn('⚠️  检测到批量写入错误\n');

          // Log detailed error information
          if (error.writeErrors && error.writeErrors.length > 0) {
            console.log(`失败的记录 (${error.writeErrors.length} 个):`);
            error.writeErrors.forEach((err, idx) => {
              const failedDoc = stationGateways[err.index];
              console.log(`  ${idx + 1}. Station ${failedDoc.stationId}: ${failedDoc.gatewayId}`);
              console.log(`     错误代码: ${err.code}`);
              console.log(`     错误信息: ${err.err ? err.err.errmsg : err.errmsg || 'Unknown error'}`);
            });
            console.log('');
          }

          // Calculate successful insertions
          const totalAttempted = stationGateways.length;
          const failedCount = error.writeErrors ? error.writeErrors.length : 0;
          const successCount = totalAttempted - failedCount;
          console.log(`✓ 成功插入 ${successCount} 条记录 (失败 ${failedCount} 条)\n`);
        } else {
          console.error('未预期的错误:');
          console.error('Error name:', error.name);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          throw error;
        }
      }

      // 显示统计信息
      const totalCount = await StationGateway.countDocuments({ isActive: true });
      console.log('✓ 导入完成！');
      console.log(`  - 数据库中共有 ${totalCount} 个电站网关映射\n`);

      // 显示前 5 条记录示例
      console.log('前 5 条记录示例:');
      const samples = await StationGateway.find({ isActive: true })
        .sort({ stationId: 1 })
        .limit(5);

      samples.forEach((station, index) => {
        console.log(`${index + 1}. 电站 ${station.stationId} - ${station.stationName}`);
        console.log(`   网关: ${station.gatewayId} (格式化: ${station.getFormattedGatewayId()})`);
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
