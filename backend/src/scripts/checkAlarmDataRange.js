const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function checkAlarmDataRange() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 统计总故障数
    const totalCount = await Alarm.countDocuments();
    console.log(`数据库中总故障记录数: ${totalCount}\n`);

    if (totalCount > 0) {
      // 查找第一条和最后一条记录
      const firstAlarm = await Alarm.findOne().sort({ startTime: 1 });
      const lastAlarm = await Alarm.findOne().sort({ startTime: -1 });

      console.log('故障数据时间范围:');
      console.log(`  最早: ${firstAlarm.startTime.toISOString()}`);
      console.log(`  最晚: ${lastAlarm.startTime.toISOString()}\n`);

      // 统计各电站的故障数
      const stationStats = await Alarm.aggregate([
        {
          $group: {
            _id: '$stationId',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      console.log('各电站故障数量 (前10):');
      stationStats.forEach(stat => {
        console.log(`  电站 ${stat._id}: ${stat.count} 条`);
      });
      console.log('');

      // 查询电站173的故障数据
      const station173Count = await Alarm.countDocuments({ stationId: 173 });
      console.log(`电站173总故障数: ${station173Count}\n`);

      if (station173Count > 0) {
        const station173First = await Alarm.findOne({ stationId: 173 }).sort({ startTime: 1 });
        const station173Last = await Alarm.findOne({ stationId: 173 }).sort({ startTime: -1 });

        console.log('电站173故障时间范围:');
        console.log(`  最早: ${station173First.startTime.toISOString()}`);
        console.log(`  最晚: ${station173Last.startTime.toISOString()}\n`);

        // 查询电站173的前5条故障记录
        const recentAlarms = await Alarm.find({ stationId: 173 })
          .sort({ startTime: -1 })
          .limit(5);

        console.log('电站173最近5条故障:');
        recentAlarms.forEach((alarm, idx) => {
          console.log(`${idx + 1}. ${alarm.alarmName}`);
          console.log(`   时间: ${alarm.startTime.toISOString()}`);
          console.log(`   设备: ${alarm.device}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

checkAlarmDataRange();
