const mongoose = require('mongoose');
const Alarm = require('../src/models/Alarm');
const { calculateAlarmLoss } = require('../src/services/alarmLossCalculator');

async function testSpecificAlarm() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ess-platform');

    const alarm = await Alarm.findOne({ alarmId: 'e0a39f85-94a4-435c-b53f-413e49370b43' });

    if (!alarm) {
      console.log('未找到告警');
      process.exit(1);
    }

    console.log('测试告警损失计算（高精度）');
    console.log('='.repeat(50));
    console.log('告警信息:');
    console.log('  ID:', alarm.alarmId);
    console.log('  持续分钟:', alarm.durationMinutes);
    console.log('');

    // 重新计算损失
    const lossData = await calculateAlarmLoss(alarm);

    console.log('计算结果:');
    console.log('  持续小时（高精度）:', lossData.durationHours);
    console.log('  损失金额（高精度）:', lossData.loss, '元');
    console.log('  损失详情数量:', lossData.lossDetails ? lossData.lossDetails.length : 0);
    console.log('');

    if (lossData.lossDetails && lossData.lossDetails.length > 0) {
      console.log('损失详情:');
      lossData.lossDetails.forEach((detail, i) => {
        console.log(`  ${i+1}. 时间: ${detail.time}, 功率: ${detail.power}kW, 电价: ${detail.price}元/kWh, 类型: ${detail.ctypeName}`);
      });
    }

    // 更新数据库
    alarm.durationHours = lossData.durationHours;
    alarm.alarmLoss = lossData.loss;
    alarm.lossDetails = lossData.lossDetails;
    await alarm.save();

    console.log('');
    console.log('✓ 已更新数据库');

    // 验证
    const updated = await Alarm.findOne({ alarmId: 'e0a39f85-94a4-435c-b53f-413e49370b43' });
    console.log('');
    console.log('数据库中的值:');
    console.log('  durationHours:', updated.durationHours, '(类型:', typeof updated.durationHours + ')');
    console.log('  alarmLoss: ¥' + updated.alarmLoss, '(类型:', typeof updated.alarmLoss + ')');
    console.log('  lossDetails:', updated.lossDetails ? JSON.stringify(updated.lossDetails, null, 2) : '无');

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

testSpecificAlarm();
