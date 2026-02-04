const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const dotenv = require('dotenv');
const StationGateway = require('../models/StationGateway');

// Load environment variables
dotenv.config();

// CSV 文件路径
const CSV_FILE = path.join(__dirname, '../../../国内生产环境电站.csv');

async function importDeviceMapping() {
  try {
    // 连接到 MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 检查文件是否存在
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ CSV 文件不存在: ${CSV_FILE}`);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('导入设备映射数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deviceMappings = [];

    // 读取 CSV 文件
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (row) => {
          deviceMappings.push({
            deviceId: row.device_id?.trim(),
            deviceName: row.device_name?.trim().toLowerCase(), // gatewayId
            deviceModel: row.device_model?.trim(),
            stationName: row.name?.trim(),
            stationId: parseInt(row.station_id)
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`✓ 读取到 ${deviceMappings.length} 条设备映射记录\n`);

    let updated = 0;
    let notFound = 0;
    let failed = 0;

    // 更新 StationGateway 记录
    for (const mapping of deviceMappings) {
      if (!mapping.deviceId || !mapping.deviceName) {
        console.log(`⚠️  跳过无效记录: ${JSON.stringify(mapping)}`);
        failed++;
        continue;
      }

      try {
        // 查找现有的网关记录
        const gateway = await StationGateway.findOne({
          gatewayId: mapping.deviceName
        });

        if (gateway) {
          // 更新 deviceId 和 deviceModel
          gateway.deviceId = mapping.deviceId;
          gateway.deviceModel = mapping.deviceModel;
          await gateway.save();

          console.log(`✓ 更新: 电站 ${gateway.stationId} - 网关 ${gateway.gatewayId} -> 设备 ${mapping.deviceId}`);
          updated++;
        } else {
          console.log(`⚠️  未找到网关: ${mapping.deviceName} (电站 ${mapping.stationId})`);
          notFound++;
        }
      } catch (error) {
        console.error(`❌ 更新失败: ${mapping.deviceName}`, error.message);
        failed++;
      }
    }

    console.log('\n��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('导入完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✓ 成功更新: ${updated} 条`);
    console.log(`⚠️  未找到网关: ${notFound} 条`);
    console.log(`❌ 失败: ${failed} 条`);
    console.log(`📊 总计: ${deviceMappings.length} 条\n`);

    // 显示更新后的示例数据
    console.log('前 5 条更新后的记录:');
    const samples = await StationGateway.find({ deviceId: { $exists: true } })
      .limit(5)
      .lean();

    samples.forEach((gateway, index) => {
      console.log(`\n${index + 1}. 电站 ${gateway.stationId} - ${gateway.stationName}`);
      console.log(`   网关 ID: ${gateway.gatewayId}`);
      console.log(`   设备 ID: ${gateway.deviceId}`);
      console.log(`   设备型号: ${gateway.deviceModel}`);
    });

    // 统计数据
    const totalWithDevice = await StationGateway.countDocuments({
      deviceId: { $exists: true, $ne: null }
    });
    const totalGateways = await StationGateway.countDocuments();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('数据库统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`总网关数: ${totalGateways}`);
    console.log(`已关联设备 ID: ${totalWithDevice}`);
    console.log(`未关联设备 ID: ${totalGateways - totalWithDevice}\n`);

  } catch (error) {
    console.error('❌ 导入失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

importDeviceMapping();
