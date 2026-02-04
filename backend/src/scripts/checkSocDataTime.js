const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const StationGateway = require('../models/StationGateway');
const dotenv = require('dotenv');

dotenv.config();

async function checkSocDataTime() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 使用电站173（德业龙山2号）作为示例
    const stationId = 173;
    const dateStr = '2026-01-13';

    console.log(`检查电站 ${stationId} 在 ${dateStr} 的SOC数据时间范围\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查找该电站的所有设备
    const devices = await StationGateway.find({ stationId });
    console.log(`电站设备数: ${devices.length}\n`);

    if (devices.length === 0) {
      console.log('该电站没有设备');
      return;
    }

    const deviceIds = devices.map(d => d.deviceId);

    // 构建查询范围
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    console.log('查询范围:');
    console.log(`  开始: ${startOfDay.toISOString()}`);
    console.log(`  结束: ${endOfDay.toISOString()}\n`);

    // 查询每个设备的第一条和最后一条记录
    for (const device of devices.slice(0, 5)) { // 只显示前5个设备
      const firstRecord = await SocData.findOne({
        deviceId: device.deviceId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: 1 });

      const lastRecord = await SocData.findOne({
        deviceId: device.deviceId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: -1 });

      const count = await SocData.countDocuments({
        deviceId: device.deviceId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      });

      console.log(`设备: ${device.deviceName || device.deviceId.substring(0, 30)}`);
      console.log(`  数据点数: ${count}`);

      if (firstRecord) {
        const firstTime = new Date(firstRecord.timestamp);
        console.log(`  第一条: ${firstTime.toISOString()} (${firstTime.getHours()}:${String(firstTime.getMinutes()).padStart(2, '0')})`);
        console.log(`  SOC值: ${firstRecord.soc}%`);
      } else {
        console.log(`  第一条: 无数据`);
      }

      if (lastRecord) {
        const lastTime = new Date(lastRecord.timestamp);
        console.log(`  最后一条: ${lastTime.toISOString()} (${lastTime.getHours()}:${String(lastTime.getMinutes()).padStart(2, '0')})`);
        console.log(`  SOC值: ${lastRecord.soc}%`);
      } else {
        console.log(`  最后一条: 无数据`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询所有设备的数据，按小时统计
    console.log('按小时统计数据分布:\n');

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(dateStr + `T${String(hour).padStart(2, '0')}:00:00Z`);
      const hourEnd = new Date(dateStr + `T${String(hour).padStart(2, '0')}:59:59.999Z`);

      const count = await SocData.countDocuments({
        deviceId: { $in: deviceIds },
        timestamp: { $gte: hourStart, $lte: hourEnd }
      });

      const bar = '█'.repeat(Math.ceil(count / 1000));
      console.log(`${String(hour).padStart(2, '0')}:00 | ${String(count).padStart(6)} 条 | ${bar}`);
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭\n');
  }
}

checkSocDataTime();
