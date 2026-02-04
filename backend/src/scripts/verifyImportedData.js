const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function verifyImportedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('验证重新导入的告警数据\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. 总体统计
    console.log('【1】总体统计\n');
    const totalCount = await Alarm.countDocuments();
    console.log(`数据库中共有 ${totalCount} 条告警\n`);

    // 检查唯一性
    const uniqueAlarmIds = await Alarm.distinct('alarmId');
    console.log(`唯一告警ID数: ${uniqueAlarmIds.length}`);
    console.log(`重复记录数: ${totalCount - uniqueAlarmIds.length}\n`);

    // 2. 验证电站205在2026-01-11的数据
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【2】电站205在2026-01-11的告警详情\n');

    const station205Alarms = await Alarm.find({
      stationId: 205,
      startTime: {
        $gte: new Date('2026-01-11T00:00:00.000Z'),
        $lt: new Date('2026-01-12T00:00:00.000Z')
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${station205Alarms.length} 条告警:\n`);

    station205Alarms.forEach((alarm, idx) => {
      console.log(`${idx + 1}. ${alarm.alarmName}`);
      console.log(`   告警ID: ${alarm.alarmId}`);
      console.log(`   startTime (UTC): ${alarm.startTime.toISOString()}`);
      console.log(`   startTime (本地): ${formatLocalTime(alarm.startTime)}`);
      console.log(`   endTime (UTC): ${alarm.endTime.toISOString()}`);
      console.log(`   endTime (本地): ${formatLocalTime(alarm.endTime)}`);
      console.log(`   alarmDate: ${alarm.alarmDate.toISOString()}`);
      console.log(`   持续时间: ${alarm.durationMinutes.toFixed(2)} 分钟`);
      console.log('');
    });

    // 3. 验证被恢复的告警
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【3】验证被恢复的告警\n');

    const restoredAlarm = await Alarm.findOne({
      alarmId: '35917343-fec5-468e-85e8-5fd7ad334533'
    });

    if (restoredAlarm) {
      console.log('✓ 告警已恢复\n');
      console.log(`告警ID: ${restoredAlarm.alarmId}`);
      console.log(`电站: ${restoredAlarm.stationId}`);
      console.log(`设备: ${restoredAlarm.device}`);
      console.log(`告警名称: ${restoredAlarm.alarmName}`);
      console.log(`startTime (UTC): ${restoredAlarm.startTime.toISOString()}`);
      console.log(`startTime (本地UTC+8): ${formatLocalTime(restoredAlarm.startTime)}`);
      console.log(`CSV中的原始时间: 11/1/2026 19:55:38`);
      console.log(`endTime (UTC): ${restoredAlarm.endTime.toISOString()}`);
      console.log(`endTime (本地UTC+8): ${formatLocalTime(restoredAlarm.endTime)}`);
      console.log(`CSV中的原始时间: 11/1/2026 19:55:42`);
      console.log(`持续时间: ${restoredAlarm.durationMinutes.toFixed(2)} 分钟`);
      console.log('');

      // 验证时间格式是否正确
      const expectedStartHour = 19;
      const expectedStartMinute = 55;
      const actualStartHour = restoredAlarm.startTime.getUTCHours();
      const actualStartMinute = restoredAlarm.startTime.getUTCMinutes();

      if (actualStartHour === expectedStartHour && actualStartMinute === expectedStartMinute) {
        console.log('✓ 时间格式正确：CSV中的时间已正确解析为UTC时间戳\n');
      } else {
        console.log(`⚠️  时间格式可能有问题：`);
        console.log(`   期望: ${expectedStartHour}:${expectedStartMinute}`);
        console.log(`   实际: ${actualStartHour}:${actualStartMinute}\n`);
      }
    } else {
      console.log('✗ 告警未找到\n');
    }

    // 4. 按日期统计
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【4】按日期统计（前10天）\n');

    const dateStats = await Alarm.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$alarmDate'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $limit: 10
      }
    ]);

    dateStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} 条`);
    });
    console.log('');

  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 格式化为本地时间显示（UTC+8）
function formatLocalTime(utcDate) {
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  const hour = String(utcDate.getUTCHours()).padStart(2, '0');
  const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
  const second = String(utcDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

verifyImportedData();
