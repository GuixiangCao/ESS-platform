const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const StationGateway = require('../src/models/StationGateway');

/**
 * 从国内生产环境电站.csv导入网关数据到StationGateway表
 */
async function importGateways() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    const csvFilePath = path.join(__dirname, '../../国内生产环境电站.csv');

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV文件不存在: ${csvFilePath}`);
    }

    console.log(`读取CSV文件: ${csvFilePath}\n`);

    const gateways = [];

    // 读取CSV文件
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // CSV列: device_id, device_name, device_model, name, station_id
          if (row.device_id && row.station_id) {
            gateways.push({
              deviceId: row.device_id.trim(),
              gatewayId: row.device_name.trim(),
              deviceModel: row.device_model?.trim() || 'm0000001',
              stationName: row.name?.trim() || '',
              stationId: parseInt(row.station_id)
            });
          }
        })
        .on('end', () => {
          console.log(`CSV读取完成，共 ${gateways.length} 条记录\n`);
          resolve();
        })
        .on('error', reject);
    });

    // 按电站ID分组统计
    const stationGroups = {};
    gateways.forEach(gw => {
      if (!stationGroups[gw.stationId]) {
        stationGroups[gw.stationId] = {
          stationName: gw.stationName,
          count: 0,
          gateways: []
        };
      }
      stationGroups[gw.stationId].count++;
      stationGroups[gw.stationId].gateways.push(gw);
    });

    console.log('电站网关数量统计:');
    Object.keys(stationGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(stationId => {
      const group = stationGroups[stationId];
      console.log(`  电站 ${stationId} - ${group.stationName}: ${group.count} 个网关`);
    });

    console.log('\n开始导入网关数据...\n');

    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    for (const gateway of gateways) {
      try {
        // 检查是否已存在（通过deviceId查找）
        const existing = await StationGateway.findOne({ deviceId: gateway.deviceId });

        if (existing) {
          // 更新现有记录
          await StationGateway.updateOne(
            { deviceId: gateway.deviceId },
            {
              $set: {
                gatewayId: gateway.gatewayId,
                deviceModel: gateway.deviceModel,
                stationName: gateway.stationName,
                stationId: gateway.stationId
              }
            }
          );
          console.log(`✅ 更新: 电站${gateway.stationId} - ${gateway.gatewayId}`);
          updateCount++;
        } else {
          // 插入新记录
          await StationGateway.create({
            deviceId: gateway.deviceId,
            gatewayId: gateway.gatewayId,
            deviceModel: gateway.deviceModel,
            stationName: gateway.stationName,
            stationId: gateway.stationId,
            // 如果有capacity可以设置，否则默认为null
            capacity: null
          });
          console.log(`✅ 新增: 电站${gateway.stationId} - ${gateway.gatewayId}`);
          insertCount++;
        }
      } catch (error) {
        console.error(`❌ 导入失败: ${gateway.gatewayId} - ${error.message}`);
        skipCount++;
      }
    }

    console.log('\n=====================================');
    console.log('导入完成！');
    console.log('=====================================');
    console.log(`新增记录: ${insertCount}`);
    console.log(`更新记录: ${updateCount}`);
    console.log(`跳过记录: ${skipCount}`);
    console.log(`总处理数: ${gateways.length}`);
    console.log('=====================================\n');

    // 验证287电站的数据
    console.log('验证电站287的导入结果...');
    const station287Gateways = await StationGateway.find({ stationId: 287 });
    console.log(`电站287的网关数量: ${station287Gateways.length}`);
    station287Gateways.forEach(gw => {
      console.log(`  - ${gw.gatewayId} (deviceId: ${gw.deviceId})`);
    });

  } catch (error) {
    console.error('导入失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行导入
importGateways();
