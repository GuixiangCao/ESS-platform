const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const SocData = require('../src/models/SocData');

async function checkDeviceMixing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    console.log('\n=== 检查10:00-10:05时段的设备混合情况 ===\n');

    const startTime = new Date('2025-12-26T02:00:00.000Z'); // 10:00 Beijing
    const endTime = new Date('2025-12-26T02:05:00.000Z');   // 10:05 Beijing

    const records = await SocData.find({
      stationId: 287,
      timestamp: { $gte: startTime, $lte: endTime }
    })
      .sort({ timestamp: 1 })
      .lean();

    console.log(`找到 ${records.length} 条记录\n`);
    console.log('时间(北京)          设备ID(后6位)  原始SOC  修正SOC  gatewayId');
    console.log('─'.repeat(80));

    records.forEach(record => {
      const bjTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      const deviceShort = record.deviceId.substring(record.deviceId.length - 6);
      const corrected = record.socCorrected !== undefined ? record.socCorrected.toFixed(1) : '---';

      console.log(
        timeStr.padEnd(20),
        deviceShort.padEnd(15),
        (record.soc.toFixed(1) + '%').padEnd(9),
        (corrected + '%').padEnd(9),
        record.gatewayId || 'N/A'
      );
    });

    // 统计各设备的SOC范围
    console.log('\n=== 各设备的SOC范围 ===\n');

    const deviceStats = new Map();
    records.forEach(record => {
      if (!deviceStats.has(record.deviceId)) {
        deviceStats.set(record.deviceId, {
          deviceId: record.deviceId,
          gatewayId: record.gatewayId,
          count: 0,
          minSoc: Infinity,
          maxSoc: -Infinity,
          minCorrected: Infinity,
          maxCorrected: -Infinity
        });
      }

      const stats = deviceStats.get(record.deviceId);
      stats.count++;
      stats.minSoc = Math.min(stats.minSoc, record.soc);
      stats.maxSoc = Math.max(stats.maxSoc, record.soc);

      const corrected = record.socCorrected !== undefined ? record.socCorrected : record.soc;
      stats.minCorrected = Math.min(stats.minCorrected, corrected);
      stats.maxCorrected = Math.max(stats.maxCorrected, corrected);
    });

    Array.from(deviceStats.values()).forEach(stats => {
      console.log(`设备: ${stats.deviceId}`);
      console.log(`  网关: ${stats.gatewayId}`);
      console.log(`  记录数: ${stats.count}`);
      console.log(`  原始SOC范围: ${stats.minSoc.toFixed(1)}% - ${stats.maxSoc.toFixed(1)}%`);
      console.log(`  修正SOC范围: ${stats.minCorrected.toFixed(1)}% - ${stats.maxCorrected.toFixed(1)}%`);
      console.log('');
    });

    await mongoose.connection.close();

  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkDeviceMixing();
