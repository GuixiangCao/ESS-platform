const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const StationGateway = require('../src/models/StationGateway');

async function importCapacity() {
  try {
    // 连接数据库
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功');

    const csvFilePath = path.join(__dirname, '../../Data_Source/capacity.csv');

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV 文件不存在: ${csvFilePath}`);
    }

    console.log(`读取 CSV 文件: ${csvFilePath}\n`);

    const results = [];
    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // 读取 CSV 文件
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`读取到 ${rows.length} 条记录\n`);

    // 处理每一行
    for (const row of rows) {
      const { gatewayId, installedCapacity } = row;

      if (!gatewayId) {
        console.log(`⚠️  跳过：gatewayId 为空`);
        errorCount++;
        continue;
      }

      const capacity = parseFloat(installedCapacity);

      if (isNaN(capacity)) {
        console.log(`⚠️  跳过 ${gatewayId}: installedCapacity 无效 (${installedCapacity})`);
        errorCount++;
        continue;
      }

      try {
        // 查找并更新网关
        // 注意：CSV 中的 gatewayId 对应数据库中的 deviceId 字段
        const gateway = await StationGateway.findOneAndUpdate(
          { deviceId: gatewayId },
          { capacity: capacity },
          { new: true }
        );

        if (gateway) {
          console.log(`✅ ${gatewayId}: 更新成功，capacity = ${capacity} kW (网关: ${gateway.gatewayId})`);
          successCount++;
        } else {
          console.log(`❌ ${gatewayId}: 未找到该设备`);
          notFoundCount++;
        }
      } catch (error) {
        console.log(`❌ ${gatewayId}: 更新失败 - ${error.message}`);
        errorCount++;
      }
    }

    // 打印统计信息
    console.log('\n================================');
    console.log('导入完成');
    console.log('================================');
    console.log(`总记录数: ${rows.length}`);
    console.log(`✅ 成功: ${successCount}`);
    console.log(`❌ 未找到: ${notFoundCount}`);
    console.log(`⚠️  错误: ${errorCount}`);
    console.log('================================\n');

  } catch (error) {
    console.error('导入失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

// 运行导入
importCapacity();
