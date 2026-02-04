const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testAPI() {
  try {
    // Connect to database to verify data
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    const SocData = require('../src/models/SocData');

    console.log('\n=== 1. 直接查询数据库 ===');
    const dbRecords = await SocData.find({
      stationId: 287,
      timestamp: {
        $gte: new Date('2025-12-26T02:00:00.000Z'), // 10:00 Beijing
        $lte: new Date('2025-12-26T04:00:00.000Z')  // 12:00 Beijing
      }
    })
      .sort({ timestamp: 1 })
      .limit(10)
      .lean();

    console.log(`找到 ${dbRecords.length} 条记录`);
    console.log('\n前10条记录:');
    console.log('时间(北京)          原始SOC  修正SOC  已修正');
    console.log('─'.repeat(60));

    dbRecords.forEach(record => {
      const bjTime = new Date(record.timestamp.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      const corrected = record.socCorrected !== undefined ? record.socCorrected.toFixed(1) : '---';
      console.log(
        timeStr.padEnd(20),
        (record.soc.toFixed(1) + '%').padEnd(9),
        (corrected + '%').padEnd(9),
        record.isJumpCorrected ? '是' : '否'
      );
    });

    // Now test what the API would return (simulate the controller logic)
    console.log('\n=== 2. 模拟API返回的数据格式 ===');
    const startOfDay = new Date('2025-12-26T16:00:00.000Z');
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const apiRecords = await SocData.find({
      stationId: 287,
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    })
      .sort({ timestamp: 1 })
      .select('timestamp soc socCorrected isJumpCorrected deviceId gatewayId')
      .lean();

    console.log(`API会返回 ${apiRecords.length} 条记录`);

    // Process like the API does
    const processedData = apiRecords.map(record => ({
      time: record.timestamp,
      soc: record.socCorrected !== undefined ? record.socCorrected : record.soc,
      socOriginal: record.soc,
      isJumpCorrected: record.isJumpCorrected || false,
      deviceId: record.deviceId,
      gatewayId: record.gatewayId
    }));

    // Show sample of problematic time range (10:00-12:00 Beijing)
    const problemTimeRecords = processedData.filter(record => {
      const bjTime = new Date(record.time.getTime() + 8*60*60*1000);
      const hour = bjTime.getUTCHours();
      return hour >= 10 && hour < 12;
    });

    console.log(`\n10:00-12:00 时段共 ${problemTimeRecords.length} 条记录`);
    console.log('前20条记录 (API返回格式):');
    console.log('时间(北京)          显示SOC  原始SOC  已修正');
    console.log('─'.repeat(60));

    problemTimeRecords.slice(0, 20).forEach(record => {
      const bjTime = new Date(record.time.getTime() + 8*60*60*1000);
      const timeStr = bjTime.toISOString().replace('T', ' ').substring(0, 19);
      console.log(
        timeStr.padEnd(20),
        (record.soc.toFixed(1) + '%').padEnd(9),
        (record.socOriginal.toFixed(1) + '%').padEnd(9),
        record.isJumpCorrected ? '是' : '否'
      );
    });

    // Check for any jumps in the displayed SOC
    console.log('\n=== 3. 检查修正后的数据是否还有跳变 ===');
    for (let i = 1; i < problemTimeRecords.length; i++) {
      const prev = problemTimeRecords[i - 1];
      const curr = problemTimeRecords[i];
      const diff = Math.abs(curr.soc - prev.soc);

      if (diff > 10) {
        const prevTime = new Date(prev.time.getTime() + 8*60*60*1000).toISOString().substring(11, 19);
        const currTime = new Date(curr.time.getTime() + 8*60*60*1000).toISOString().substring(11, 19);
        console.log(`⚠️  发现跳变: ${prevTime} ${prev.soc.toFixed(1)}% → ${currTime} ${curr.soc.toFixed(1)}% (差值: ${diff.toFixed(1)}%)`);
      }
    }

    console.log('\n✅ API数据格式测试完成');
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testAPI();
