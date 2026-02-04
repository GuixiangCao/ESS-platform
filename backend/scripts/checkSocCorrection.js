const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const SocData = require('../src/models/SocData');

async function checkCorrection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const startTime = new Date('2025-12-26T02:20:00.000Z'); // 10:20 Beijing
    const endTime = new Date('2025-12-26T02:35:00.000Z');   // 10:35 Beijing

    const data = await SocData.find({
      stationId: 287,
      timestamp: { $gte: startTime, $lte: endTime }
    }).sort({ timestamp: 1 }).limit(30);

    console.log('\n检查2025-12-26 10:20-10:35 (北京时间) 的SOC数据:');
    console.log('找到', data.length, '条记录\n');
    console.log('时间(北京)          设备ID        原始SOC  修正SOC  是否修正');
    console.log('─'.repeat(70));

    data.forEach(record => {
      const bjTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      const hasCorrected = record.socCorrected !== undefined;
      const correctedSoc = hasCorrected ? record.socCorrected.toFixed(1) + '%' : '---';

      console.log(
        timeStr.padEnd(20),
        record.deviceId.substring(0, 12).padEnd(14),
        (record.soc.toFixed(1) + '%').padEnd(9),
        correctedSoc.padEnd(9),
        record.isJumpCorrected ? '是' : '否'
      );
    });

    // 统计修正情况
    const totalCount = await SocData.countDocuments({
      stationId: 287,
      dataDate: new Date('2025-12-26T00:00:00.000Z')
    });

    const correctedCount = await SocData.countDocuments({
      stationId: 287,
      dataDate: new Date('2025-12-26T00:00:00.000Z'),
      isJumpCorrected: true
    });

    console.log('\n2025-12-26 整天统计:');
    console.log('  总记录数:', totalCount);
    console.log('  已修正数:', correctedCount);
    console.log('  修正比例:', totalCount > 0 ? ((correctedCount / totalCount) * 100).toFixed(2) + '%' : '0%');

    await mongoose.connection.close();
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkCorrection();
