require('dotenv').config();
const mongoose = require('mongoose');
const { calculateAlarmLoss } = require('../services/alarmLossCalculator');
const Alarm = require('../models/Alarm');

async function showDetailedCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('电站231 - 2025-12-22 (本地时间) 原时间损失计算详解');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 获取2025-12-22的告警（UTC时间）
    const alarms = await Alarm.find({
      stationId: 231,
      startTime: {
        $gte: new Date('2025-12-22T00:00:00.000Z'),
        $lt: new Date('2025-12-23T00:00:00.000Z')
      }
    }).sort({ startTime: 1 });

    console.log(`找到 ${alarms.length} 条告警\n`);

    let totalTimeLoss = 0;

    for (let i = 0; i < alarms.length; i++) {
      const alarm = alarms[i];

      console.log(`\n📍 告警 ${i + 1}/${alarms.length}`);
      console.log('='.repeat(80));

      // 计算损失
      const lossData = await calculateAlarmLoss(alarm);

      // 显示基本信息
      const localStartTime = new Date(alarm.startTime.getTime() + 8*60*60*1000);
      const localEndTime = new Date(alarm.endTime.getTime() + 8*60*60*1000);

      console.log(`告警ID: ${alarm.alarmId}`);
      console.log(`设备: ${alarm.device}`);
      console.log(`告警名称: ${alarm.alarmName || '未知'}`);
      console.log(`\n⏰ 时间信息:`);
      console.log(`  开始时间 (本地): ${localStartTime.toISOString().replace('T', ' ').replace('Z', ' +0800')}`);
      console.log(`  结束时间 (本地): ${localEndTime.toISOString().replace('T', ' ').replace('Z', ' +0800')}`);
      console.log(`  持续时长: ${alarm.durationMinutes.toFixed(2)} 分钟 = ${lossData.durationHours} 小时`);

      if (lossData.lossDetails && lossData.lossDetails.length > 0) {
        const detail = lossData.lossDetails[0];
        console.log(`\n💡 损失计算信息:`);
        console.log(`  故障时刻: ${detail.time}`);
        console.log(`  所在周期: ${detail.ctypeName}`);
        console.log(`  功率: ${detail.power} kW`);
        console.log(`  电价: ¥${detail.price}/kWh`);

        console.log(`\n📐 时间损失计算公式:`);
        console.log(`  ┌─────────────────────────────────────────────────────┐`);
        console.log(`  │ 时间损失 = 持续时长 × 功率 × 电价                  │`);
        console.log(`  └─────────────────────────────────────────────────────┘`);
        console.log(`  `);
        console.log(`  时间损失 = ${lossData.durationHours} 小时 × ${detail.power} kW × ¥${detail.price}/kWh`);
        console.log(`  时间损失 = ¥${lossData.timeLoss}`);

        totalTimeLoss += lossData.timeLoss || 0;
      } else {
        console.log(`\n⚠️  ${lossData.calculationNote || '无法计算损失'}`);
        console.log(`  时间损失: ¥0.00`);
      }

      if (lossData.socTargetLoss > 0) {
        console.log(`\n🔋 SOC目标损失 (新增):`);
        console.log(`  ${lossData.socTargetDetails?.socTargetNote || ''}`);
        console.log(`  SOC目标损失 = ¥${lossData.socTargetLoss}`);
      }

      console.log(`\n💰 本条告警总损失:`);
      console.log(`  时间损失: ¥${lossData.timeLoss || 0}`);
      console.log(`  SOC目标损失: ¥${lossData.socTargetLoss || 0}`);
      console.log(`  ─────────────────────`);
      console.log(`  总计: ¥${lossData.loss || 0}`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n💵 2025-12-22 全天汇总:`);
    console.log(`  原时间损失总计: ¥${totalTimeLoss.toFixed(2)}`);
    console.log('');

    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

showDetailedCalculation();
