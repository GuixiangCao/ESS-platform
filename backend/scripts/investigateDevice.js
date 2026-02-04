const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const SocData = require('../src/models/SocData');

async function investigateDevice8145ed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const deviceId = 'a9eb66ce67f747c88033a55bec8145ed';

    console.log(`\n=== 调查设备 ${deviceId} 为何被错误修正 ===\n`);

    // 查询该设备在10:00前后的数据
    const startTime = new Date('2025-12-26T01:55:00.000Z'); // 09:55 Beijing
    const endTime = new Date('2025-12-26T02:10:00.000Z');   // 10:10 Beijing

    const records = await SocData.find({
      deviceId,
      timestamp: { $gte: startTime, $lte: endTime }
    })
      .sort({ timestamp: 1 })
      .lean();

    console.log(`找到 ${records.length} 条记录\n`);
    console.log('时间(北京)          原始SOC  修正SOC  已修正  与前一点时间差  与前一点SOC差');
    console.log('─'.repeat(90));

    let prevRecord = null;
    records.forEach((record, i) => {
      const bjTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      const corrected = record.socCorrected !== undefined ? record.socCorrected.toFixed(1) : '---';

      let timeDiffStr = '---';
      let socDiffStr = '---';

      if (prevRecord) {
        const timeDiff = record.timestamp.getTime() - prevRecord.timestamp.getTime();
        const timeDiffMin = (timeDiff / 1000 / 60).toFixed(1);
        timeDiffStr = `${timeDiffMin}分钟`;

        // 关键：检查是与原始值比较还是修正值比较
        const prevCorrected = prevRecord.socCorrected !== undefined ? prevRecord.socCorrected : prevRecord.soc;
        const socDiff = Math.abs(record.soc - prevCorrected);
        socDiffStr = socDiff.toFixed(1) + '%';

        // 标记异常
        if (timeDiff <= 10 * 60 * 1000 && socDiff > 10) {
          socDiffStr += ' ⚠️跳变';
        }
      }

      console.log(
        timeStr.padEnd(20),
        (record.soc.toFixed(1) + '%').padEnd(9),
        (corrected + '%').padEnd(9),
        (record.isJumpCorrected ? '是' : '否').padEnd(8),
        timeDiffStr.padEnd(14),
        socDiffStr
      );

      prevRecord = record;
    });

    // 查找该设备在更早时间的SOC值（看看是否有大的跳变）
    console.log('\n=== 查找10:00之前的最后几条记录 ===\n');

    const beforeRecords = await SocData.find({
      deviceId,
      timestamp: { $lt: new Date('2025-12-26T02:00:00.000Z') } // 10:00 Beijing之前
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    console.log('时间(北京)          原始SOC  修正SOC');
    console.log('─'.repeat(50));

    beforeRecords.reverse().forEach(record => {
      const bjTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      const corrected = record.socCorrected !== undefined ? record.socCorrected.toFixed(1) : '---';

      console.log(
        timeStr.padEnd(20),
        (record.soc.toFixed(1) + '%').padEnd(9),
        (corrected + '%')
      );
    });

    await mongoose.connection.close();

  } catch (error) {
    console.error('调查失败:', error);
    process.exit(1);
  }
}

investigateDevice8145ed();
