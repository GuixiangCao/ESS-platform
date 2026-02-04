require('dotenv').config();
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const SocData = require('../models/SocData');
const ChargingStrategy = require('../models/ChargingStrategy');

async function debugAlarm() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    // 获取一个告警示例
    const alarm = await Alarm.findOne({
      stationId: 231,
      startTime: { $gte: new Date('2025-11-09') }
    });

    if (!alarm) {
      console.log('未找到告警');
      return;
    }

    console.log('=== 告警详情 ===');
    console.log('告警ID:', alarm.alarmId);
    console.log('开始时间:', alarm.startTime);
    console.log('结束时间:', alarm.endTime);
    console.log('gatewayDeviceId:', alarm.gatewayDeviceId || '❌ 未配置');
    console.log('');

    // 检查充放电策略
    const alarmDate = new Date(alarm.startTime);
    alarmDate.setHours(0, 0, 0, 0);

    const strategy = await ChargingStrategy.findOne({
      stationId: 231,
      date: alarmDate,
      isActive: true
    });

    console.log('=== 充放电策略 ===');
    if (strategy) {
      console.log('策略日期:', strategy.date);
      console.log('时段数量:', strategy.timeslots?.length || 0);
      if (strategy.timeslots && strategy.timeslots.length > 0) {
        strategy.timeslots.forEach((slot, i) => {
          console.log(`时段${i+1}: ${slot.stime}-${slot.etime}, 类型:${slot.ctype}, 功率:${slot.power}kW`);
        });
      }
    } else {
      console.log('❌ 未找到充放电策略');
    }
    console.log('');

    // 检查SOC数据
    if (alarm.gatewayDeviceId) {
      const socCount = await SocData.countDocuments({
        gatewayId: alarm.gatewayDeviceId.toLowerCase()
      });
      console.log('=== SOC数据 ===');
      console.log('该设备SOC记录数:', socCount);

      if (socCount > 0) {
        const sample = await SocData.findOne({
          gatewayId: alarm.gatewayDeviceId.toLowerCase()
        }).sort({ timestamp: -1 });
        console.log('最新SOC记录:', sample.timestamp, 'SOC:', sample.soc + '%');
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
    await mongoose.connection.close();
  }
}

debugAlarm();
