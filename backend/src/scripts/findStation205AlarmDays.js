const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function findStation205AlarmDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('查找电站205 (喜尔美) 有故障数据的日期\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询电站205的所有故障，按日期分组
    const alarmsByDate = await Alarm.aggregate([
      {
        $match: { stationId: 205 }
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
      { $sort: { _id: 1 } }
    ]);

    console.log(`电站205总共有故障数据的日期: ${alarmsByDate.length} 天\n`);

    console.log('前30个有故障数据的日期:\n');
    alarmsByDate.slice(0, 30).forEach(day => {
      console.log(`  ${day._id}: ${day.count} 条故障`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 统计总数
    const totalCount = await Alarm.countDocuments({ stationId: 205 });
    console.log(`电站205总故障数: ${totalCount} 条\n`);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

findStation205AlarmDays();
