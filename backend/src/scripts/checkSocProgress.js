const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const dotenv = require('dotenv');

dotenv.config();

async function checkProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const count = await SocData.countDocuments();
    const deviceCount = await SocData.distinct('deviceId').then(arr => arr.length);

    console.log('\n当前导入进度:');
    console.log(`  总记录数: ${count.toLocaleString()}`);
    console.log(`  设备数量: ${deviceCount}`);

    if (count > 0) {
      const sample = await SocData.findOne().sort({ createdAt: -1 });
      console.log(`\n最新记录:`);
      console.log(`  设备ID: ${sample.deviceId.substring(0, 20)}...`);
      console.log(`  电站ID: ${sample.stationId || '未知'}`);
      console.log(`  时间: ${sample.timestamp.toISOString()}`);
      console.log(`  SOC: ${sample.soc}%`);

      // 按设备统计
      const deviceStats = await SocData.aggregate([
        {
          $group: {
            _id: '$deviceId',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      console.log(`\n设备记录统计（前5个）:`);
      deviceStats.forEach((stat, index) => {
        console.log(`  ${index + 1}. ${stat._id.substring(0, 20)}...: ${stat.count.toLocaleString()} 条`);
      });
    }

    console.log('');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProgress();
