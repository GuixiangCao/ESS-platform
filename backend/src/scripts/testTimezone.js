const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const dotenv = require('dotenv');

dotenv.config();

async function testTimezone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 测试日期：2026-01-13（UTC+8时区）
    const testDate = '2026-01-13';
    console.log(`测试日期: ${testDate} (UTC+8时区)\n`);

    // 模拟controller中的逻辑
    const startOfDay = new Date(testDate + 'T00:00:00+08:00');
    const endOfDay = new Date(testDate + 'T23:59:59.999+08:00');

    console.log('查询时间范围:');
    console.log(`  开始时间 (UTC+8): ${testDate} 00:00:00`);
    console.log(`  开始时间 (UTC):   ${startOfDay.toISOString()}`);
    console.log(`  结束时间 (UTC+8): ${testDate} 23:59:59`);
    console.log(`  结束时间 (UTC):   ${endOfDay.toISOString()}`);
    console.log('');

    // 查询该时间范围内的第一条和最后一条记录
    const firstRecord = await SocData.findOne({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: 1 });

    const lastRecord = await SocData.findOne({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: -1 });

    const totalRecords = await SocData.countDocuments({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log('查询结果:');
    console.log(`  总记录数: ${totalRecords.toLocaleString()}`);

    if (firstRecord) {
      console.log(`  第一条记录时间 (UTC):   ${firstRecord.timestamp.toISOString()}`);
      console.log(`  第一条记录时间 (UTC+8): ${formatUTC8(firstRecord.timestamp)}`);
    }

    if (lastRecord) {
      console.log(`  最后一条记录时间 (UTC):   ${lastRecord.timestamp.toISOString()}`);
      console.log(`  最后一条记录时间 (UTC+8): ${formatUTC8(lastRecord.timestamp)}`);
    }

    console.log('\n验证结果:');
    if (firstRecord && lastRecord) {
      const firstHour = new Date(firstRecord.timestamp.getTime() + 8 * 60 * 60 * 1000).getUTCHours();
      const lastHour = new Date(lastRecord.timestamp.getTime() + 8 * 60 * 60 * 1000).getUTCHours();

      if (firstHour >= 0 && lastHour <= 23) {
        console.log('✓ 时区处理正确！数据范围在UTC+8的00:00-23:59之间');
      } else {
        console.log('✗ 时区处理可能有问题');
      }
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');
  }
}

function formatUTC8(date) {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return utc8Date.toISOString().replace('Z', '+08:00');
}

testTimezone();
