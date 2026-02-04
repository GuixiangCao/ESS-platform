const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const dotenv = require('dotenv');

dotenv.config();

async function testDirectQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('测试直接按UTC查询（数据实际含义是UTC+8）\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 测试日期：2026-01-13
    const dateStr = '2026-01-13';
    console.log(`查询日期: ${dateStr}`);
    console.log(`说明: CSV文件虽然标注+0000，但实际含义是UTC+8时间\n`);

    // 直接按UTC时间查询
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    console.log('查询范围:');
    console.log(`  开始时间: ${startOfDay.toISOString()}`);
    console.log(`  结束时间: ${endOfDay.toISOString()}`);
    console.log('');

    const count = await SocData.countDocuments({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log(`查询结果:`);
    console.log(`  总记录数: ${count.toLocaleString()}`);

    if (count > 0) {
      const firstRecord = await SocData.findOne({
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: 1 });

      const lastRecord = await SocData.findOne({
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: -1 });

      console.log(`  第一条记录: ${firstRecord.timestamp.toISOString()}`);
      console.log(`  最后一条记录: ${lastRecord.timestamp.toISOString()}`);
      console.log('');

      console.log('✓ 查询成功！直接按UTC查询可以获取到数据');
    } else {
      console.log('');
      console.log('⚠️  没有找到数据');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭\n');
  }
}

testDirectQuery();
