const mongoose = require('mongoose');
const Alarm = require('../src/models/Alarm');
const { calculateAlarmLoss } = require('../src/services/alarmLossCalculator');

async function recalculateAlarmLoss() {
  try {
    console.log('连接到MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到MongoDB\n');

    // 查找所有未计算损失的告警（alarmLoss为undefined或null）
    console.log('查找未计算损失的告警...');
    const alarmsToRecalculate = await Alarm.find({
      $or: [
        { alarmLoss: { $exists: false } },
        { alarmLoss: null },
        { durationHours: { $exists: false } }
      ],
      endTime: { $exists: true, $ne: null } // 只处理已结束的告警
    });

    console.log(`✓ 找到 ${alarmsToRecalculate.length} 条需要重新计算的告警\n`);

    if (alarmsToRecalculate.length === 0) {
      console.log('没有需要重新计算的告警');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    let totalLoss = 0;

    for (let i = 0; i < alarmsToRecalculate.length; i++) {
      const alarm = alarmsToRecalculate[i];

      try {
        // 调用损失计算函数
        const lossData = await calculateAlarmLoss(alarm);

        // 更新告警记录
        alarm.durationHours = lossData.durationHours;
        alarm.alarmLoss = lossData.loss;
        alarm.lossDetails = lossData.lossDetails;

        await alarm.save();

        successCount++;
        totalLoss += lossData.loss;

        if ((i + 1) % 100 === 0 || (i + 1) === alarmsToRecalculate.length) {
          console.log(`进度: ${i + 1}/${alarmsToRecalculate.length} 完成: ${successCount}, 失败: ${errorCount}, 累计损失: ¥${totalLoss.toFixed(2)}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`告警 ${alarm.alarmId} 计算失败:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log('重新计算完成');
    console.log('========================================');
    console.log(`总计: ${alarmsToRecalculate.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${errorCount}`);
    console.log(`累计损失: ¥${totalLoss.toFixed(2)}`);
    console.log('');

    // 显示特定告警的结果
    const specificAlarm = await Alarm.findOne({ alarmId: 'e0a39f85-94a4-435c-b53f-413e49370b43' });
    if (specificAlarm) {
      console.log('特定告警 (e0a39f85-94a4-435c-b53f-413e49370b43) 结果:');
      console.log(`  持续时长: ${specificAlarm.durationHours || 0} 小时`);
      console.log(`  告警损失: ¥${specificAlarm.alarmLoss || 0}`);
      console.log(`  损失详情: ${specificAlarm.lossDetails ? specificAlarm.lossDetails.length + '条' : '无'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

recalculateAlarmLoss();
