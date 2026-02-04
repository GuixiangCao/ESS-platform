require('dotenv').config();
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const SocData = require('../models/SocData');

async function debugSocQueryV2() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 获取告警
    const alarm = await Alarm.findOne({
      stationId: 231,
      startTime: {
        $gte: new Date('2025-12-22T03:50:00.000Z'),
        $lt: new Date('2025-12-22T04:00:00.000Z')
      }
    });

    if (!alarm) {
      console.log('❌ 未找到告警');
      return;
    }

    console.log('=== 告警信息 ===');
    console.log('gatewayDeviceId:', alarm.gatewayDeviceId);
    console.log('开始时间 (UTC):', alarm.startTime.toISOString());
    console.log('');

    // 模拟alarmLossCalculator.js中的逻辑
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
    const startTimeLocal = new Date(alarm.startTime.getTime() + UTC_OFFSET_MS);
    const alarmDateLocal = new Date(startTimeLocal);
    alarmDateLocal.setUTCHours(0, 0, 0, 0);

    console.log('=== 时间转换 ===');
    console.log('startTimeLocal:', startTimeLocal.toISOString());
    console.log('alarmDateLocal:', alarmDateLocal.toISOString());
    console.log('');

    // 构建15:00的检查时间
    const lastEndHour = 15;
    const lastEndMinute = 0;
    const finalCycleEndTimeLocal = new Date(alarmDateLocal);
    finalCycleEndTimeLocal.setUTCHours(lastEndHour, lastEndMinute, 0, 0);

    console.log('=== 周期结束时间 ===');
    console.log('finalCycleEndTimeLocal:', finalCycleEndTimeLocal.toISOString());
    console.log('理论应该是:', '2025-12-22T15:00:00+08:00 = 2025-12-22T07:00:00.000Z');
    console.log('');

    // 转换为UTC查询
    const checkTimeUTC = new Date(finalCycleEndTimeLocal.getTime() - UTC_OFFSET_MS);
    console.log('=== SOC查询 ===');
    console.log('checkTimeUTC:', checkTimeUTC.toISOString());
    console.log('查询范围:');
    console.log('  从:', new Date(checkTimeUTC.getTime() - 5 * 60 * 1000).toISOString());
    console.log('  到:', new Date(checkTimeUTC.getTime() + 5 * 60 * 1000).toISOString());
    console.log('');

    const socRecord = await SocData.findOne({
      deviceId: alarm.gatewayDeviceId,
      timestamp: {
        $gte: new Date(checkTimeUTC.getTime() - 5 * 60 * 1000),
        $lte: new Date(checkTimeUTC.getTime() + 5 * 60 * 1000)
      }
    }).sort({ timestamp: -1 });

    if (socRecord) {
      const localTime = new Date(socRecord.timestamp.getTime() + UTC_OFFSET_MS);
      console.log('✓ 找到SOC记录:');
      console.log('  timestamp (UTC):', socRecord.timestamp.toISOString());
      console.log('  timestamp (本地):', localTime.toISOString().replace('T', ' ').slice(0, 19));
      console.log('  SOC:', socRecord.soc + '%');
    } else {
      console.log('✗ 未找到SOC记录');
      console.log('');
      console.log('查询所有15:00前后的数据:');
      const target = new Date('2025-12-22T07:00:00.000Z');
      const allRecords = await SocData.find({
        deviceId: alarm.gatewayDeviceId,
        timestamp: {
          $gte: new Date(target.getTime() - 10 * 60 * 1000),
          $lte: new Date(target.getTime() + 10 * 60 * 1000)
        }
      }).sort({ timestamp: 1 });

      console.log(`找到 ${allRecords.length} 条记录:`);
      allRecords.forEach(r => {
        const lt = new Date(r.timestamp.getTime() + UTC_OFFSET_MS);
        console.log(`  ${lt.toISOString().slice(11, 19)} (本地) - SOC: ${r.soc}%`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

debugSocQueryV2();
