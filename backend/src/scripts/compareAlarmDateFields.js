const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function compareAlarmDateFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log(`对比电站 ${stationId} 在 ${dateStr} 的告警数据\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 方法1：使用 alarmDate 查询（损失分析页面使用的方法）
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const alarmsByAlarmDate = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`方法1：使用 alarmDate 查询 (损失分析页面)`);
    console.log(`  查询条件: alarmDate >= ${startOfDay.toISOString()}`);
    console.log(`            alarmDate < ${endOfDay.toISOString()}`);
    console.log(`  结果: ${alarmsByAlarmDate.length} 条\n`);

    // 方法2：使用 startTime 查询（SOC详情页面使用的方法）
    const startOfDayUTC = new Date(dateStr + 'T00:00:00Z');
    const endOfDayUTC = new Date(dateStr + 'T23:59:59.999Z');

    const alarmsByStartTime = await Alarm.find({
      stationId: parseInt(stationId),
      startTime: { $gte: startOfDayUTC, $lte: endOfDayUTC }
    }).sort({ startTime: 1 });

    console.log(`方法2：使用 startTime 查询 (SOC详情页面)`);
    console.log(`  查询条件: startTime >= ${startOfDayUTC.toISOString()}`);
    console.log(`            startTime <= ${endOfDayUTC.toISOString()}`);
    console.log(`  结果: ${alarmsByStartTime.length} 条\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 显示使用 alarmDate 查询到的告警详情
    if (alarmsByAlarmDate.length > 0) {
      console.log('使用 alarmDate 查询到的告警详情:\n');
      alarmsByAlarmDate.forEach((alarm, idx) => {
        console.log(`${idx + 1}. ${alarm.alarmName}`);
        console.log(`   设备: ${alarm.device}`);
        console.log(`   alarmDate: ${alarm.alarmDate.toISOString()}`);
        console.log(`   startTime: ${alarm.startTime.toISOString()}`);
        console.log(`   endTime: ${alarm.endTime.toISOString()}`);
        console.log(`   持续时间: ${alarm.durationMinutes} 分钟`);
        console.log('');
      });
    }

    // 显示使用 startTime 查询到的告警详情
    if (alarmsByStartTime.length > 0) {
      console.log('使用 startTime 查询到的告警详情:\n');
      alarmsByStartTime.forEach((alarm, idx) => {
        console.log(`${idx + 1}. ${alarm.alarmName}`);
        console.log(`   设备: ${alarm.device}`);
        console.log(`   alarmDate: ${alarm.alarmDate.toISOString()}`);
        console.log(`   startTime: ${alarm.startTime.toISOString()}`);
        console.log(`   endTime: ${alarm.endTime.toISOString()}`);
        console.log(`   持续时间: ${alarm.durationMinutes} 分钟`);
        console.log('');
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('结论:');
    console.log(`  alarmDate 查询: ${alarmsByAlarmDate.length} 条`);
    console.log(`  startTime 查询: ${alarmsByStartTime.length} 条`);
    if (alarmsByAlarmDate.length !== alarmsByStartTime.length) {
      console.log('\n  ⚠️ 两种查询方法返回了不同数量的告警!');
      console.log('  这说明 alarmDate 和 startTime 字段存储的日期不一致');
    } else if (alarmsByAlarmDate.length === 0) {
      console.log('\n  两种方法都没有查询到数据');
    } else {
      console.log('\n  ✓ 两种方法查询结果一致');
    }
    console.log('');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

compareAlarmDateFields();
