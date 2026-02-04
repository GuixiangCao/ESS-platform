const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');

async function checkAllStations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    // 查询所有有告警的电站
    const stations = await Alarm.distinct('stationId');
    console.log('数据库中有告警数据的电站:');
    console.log(stations.sort((a, b) => a - b).join(', '));
    console.log('\n共', stations.length, '个电站');

    // 统计各电站的告警数量
    console.log('\n各电站告警数量:');
    for (const stationId of stations.sort((a, b) => a - b)) {
      const count = await Alarm.countDocuments({ stationId });
      console.log(`  电站 ${stationId}: ${count} 个告警`);
    }

    // 检查是否有重叠告警（示例：查找时间间隔<5秒的告警对）
    console.log('\n检查各电站是否存在重叠告警:');
    for (const stationId of stations.sort((a, b) => a - b)) {
      const alarms = await Alarm.find({ stationId })
        .sort({ startTime: 1 })
        .limit(1000)
        .lean();

      let overlapCount = 0;
      for (let i = 0; i < alarms.length - 1; i++) {
        for (let j = i + 1; j < alarms.length; j++) {
          const alarm1 = alarms[i];
          const alarm2 = alarms[j];

          // 检查是否时间重叠
          if (alarm1.endTime > alarm2.startTime && alarm1.startTime < alarm2.endTime) {
            overlapCount++;
            break; // 找到一个重叠就够了
          }

          // 如果alarm2开始时间已经超过alarm1结束时间，可以跳出
          if (alarm2.startTime > alarm1.endTime) {
            break;
          }
        }
      }

      if (overlapCount > 0) {
        console.log(`  电站 ${stationId}: ✅ 发现重叠告警（需要去重）`);
      } else {
        console.log(`  电站 ${stationId}: 无重叠告警`);
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkAllStations();
