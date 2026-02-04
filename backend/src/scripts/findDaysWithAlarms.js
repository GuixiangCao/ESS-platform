const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function findDaysWithAlarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('查找电站173有故障数据的日期\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询电站173的所有故障，按日期分组
    const alarmsByDate = await Alarm.aggregate([
      {
        $match: { stationId: 173 }
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$startTime'
            }
          }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 20 }
    ]);

    console.log('前20个有故障数据的日期:\n');
    alarmsByDate.forEach(day => {
      console.log(`  ${day._id}: ${day.count} 条故障`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

findDaysWithAlarms();
