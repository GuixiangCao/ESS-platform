require('dotenv').config();
const mongoose = require('mongoose');
const SocData = require('../models/SocData');

async function checkDeviceSocData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 从截图看，这是喜尔美厨具站，日期是2025-12-29
    const stationId = 231; // 假设是231站
    const targetDate = '2025-12-29';

    // 红色设备ID（部分）- 从截图看是 9351094114fb4aaEfjCH...
    const deviceIdPattern = '9351094114fb4aa';

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`检查设备 ${deviceIdPattern}* 在 ${targetDate} 的SOC数据`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查找匹配的设备ID
    const sampleRecord = await SocData.findOne({
      deviceId: { $regex: `^${deviceIdPattern}`, $options: 'i' }
    });

    if (!sampleRecord) {
      console.log('❌ 未找到匹配的设备');
      await mongoose.connection.close();
      return;
    }

    const fullDeviceId = sampleRecord.deviceId;
    console.log(`✓ 找到设备ID: ${fullDeviceId}\n`);

    // 查询该日期的所有SOC数据
    const startDate = new Date(`${targetDate}T00:00:00.000Z`);
    const endDate = new Date(`${targetDate}T23:59:59.999Z`);

    const socRecords = await SocData.find({
      deviceId: fullDeviceId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ timestamp: 1 });

    console.log(`📊 查询到 ${socRecords.length} 条SOC记录\n`);

    if (socRecords.length === 0) {
      console.log('❌ 该设备在此日期没有SOC数据');
      await mongoose.connection.close();
      return;
    }

    // 分析数据时间间隔
    console.log('⏱️  数据时间分布分析:\n');

    let prevTimestamp = null;
    let maxGap = 0;
    let maxGapStart = null;
    let maxGapEnd = null;
    const gaps = [];

    socRecords.forEach((record, index) => {
      const UTC_OFFSET = 8 * 60 * 60 * 1000;
      const localTime = new Date(record.timestamp.getTime() + UTC_OFFSET);
      const timeStr = localTime.toISOString().replace('T', ' ').substring(0, 19);

      if (prevTimestamp) {
        const gapMinutes = (record.timestamp - prevTimestamp) / (1000 * 60);

        // 如果间隔超过10分钟，认为是异常间隔
        if (gapMinutes > 10) {
          gaps.push({
            start: new Date(prevTimestamp.getTime() + UTC_OFFSET).toISOString().replace('T', ' ').substring(0, 19),
            end: timeStr,
            gapMinutes: gapMinutes.toFixed(1)
          });

          if (gapMinutes > maxGap) {
            maxGap = gapMinutes;
            maxGapStart = prevTimestamp;
            maxGapEnd = record.timestamp;
          }
        }
      }

      // 显示前5条和后5条
      if (index < 5 || index >= socRecords.length - 5) {
        console.log(`  [${index + 1}/${socRecords.length}] ${timeStr} | SOC: ${record.soc}%`);
      } else if (index === 5) {
        console.log('  ...');
      }

      prevTimestamp = record.timestamp;
    });

    console.log('\n🔍 数据间隔异常分析:\n');

    if (gaps.length === 0) {
      console.log('  ✓ 数据连续，无明显间隔');
    } else {
      console.log(`  ⚠️  发现 ${gaps.length} 个超过10分钟的数据间隔:\n`);
      gaps.forEach((gap, index) => {
        console.log(`  ${index + 1}. ${gap.start} → ${gap.end}`);
        console.log(`     间隔: ${gap.gapMinutes} 分钟 (${(gap.gapMinutes / 60).toFixed(1)} 小时)\n`);
      });

      if (maxGap > 0) {
        const UTC_OFFSET = 8 * 60 * 60 * 1000;
        const maxGapStartLocal = new Date(maxGapStart.getTime() + UTC_OFFSET);
        const maxGapEndLocal = new Date(maxGapEnd.getTime() + UTC_OFFSET);

        console.log(`  📍 最大数据间隔:`);
        console.log(`     开始: ${maxGapStartLocal.toISOString().replace('T', ' ').substring(0, 19)}`);
        console.log(`     结束: ${maxGapEndLocal.toISOString().replace('T', ' ').substring(0, 19)}`);
        console.log(`     间隔: ${maxGap.toFixed(1)} 分钟 (${(maxGap / 60).toFixed(1)} 小时)`);
      }
    }

    console.log('\n💡 结论:');
    if (gaps.length > 0) {
      console.log('   曲线显示不全的原因是该设备在部分时间段没有上报SOC数据');
      console.log('   可能原因:');
      console.log('   1. 设备在该时间段离线或故障');
      console.log('   2. 数据传输中断');
      console.log('   3. 设备重启或维护');
    } else {
      console.log('   数据完整，曲线应该连续显示');
    }

    console.log('\n' + '─'.repeat(60));
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

checkDeviceSocData();
