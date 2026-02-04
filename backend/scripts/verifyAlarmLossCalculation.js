const mongoose = require('mongoose');
const { calculateStationAlarmLosses } = require('../src/services/alarmLossCalculator');

async function verifyCalculation() {
  try {
    console.log('连接到MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到MongoDB\n');

    // 测试电站205在2026年1月的告警损失
    const testCases = [
      { date: '2026-01-06', desc: '修复后应该能查到凌晨的告警' },
      { date: '2026-01-11', desc: '测试日期' },
      { date: '2026-01-15', desc: '测试日期' }
    ];

    console.log('========================================');
    console.log('电站205 - 2026年1月告警损失验证');
    console.log('========================================\n');

    for (const testCase of testCases) {
      console.log(`\n日期: ${testCase.date} (${testCase.desc})`);
      console.log('----------------------------------------');

      const result = await calculateStationAlarmLosses(
        205,
        new Date(testCase.date),
        new Date(testCase.date),
        '330000',
        0,
        1
      );

      console.log(`告警数量: ${result.alarmCount}`);
      console.log(`总损失: ¥${result.totalLoss.toFixed(2)}`);

      if (result.alarmCount > 0) {
        console.log('\n告警详情:');
        result.alarms.slice(0, 5).forEach((alarm, index) => {
          console.log(`  ${index + 1}. ${alarm.alarmName}`);
          console.log(`     ID: ${alarm.alarmId.substring(0, 30)}...`);
          console.log(`     设备: ${alarm.device}`);
          console.log(`     时间: ${new Date(alarm.startTime).toLocaleString('zh-CN', { timeZone: 'UTC' })} UTC`);
          console.log(`     时长: ${alarm.durationHours} 小时`);
          console.log(`     损失: ¥${alarm.loss.toFixed(2)}`);
        });

        if (result.alarmCount > 5) {
          console.log(`  ... 还有 ${result.alarmCount - 5} 条告警`);
        }
      } else {
        console.log('  (无告警)');
      }
    }

    // 计算整个1月的汇总
    console.log('\n\n========================================');
    console.log('电站205 - 2026年1月整月汇总');
    console.log('========================================\n');

    const monthResult = await calculateStationAlarmLosses(
      205,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
      '330000',
      0,
      1
    );

    console.log(`总告警数量: ${monthResult.alarmCount}`);
    console.log(`总损失金额: ¥${monthResult.totalLoss.toFixed(2)}`);
    console.log(`平均每次告警损失: ¥${monthResult.averageLossPerAlarm.toFixed(2)}`);
    console.log(`总故障时长: ${monthResult.summary.totalDurationHours} 小时`);

    console.log('\n损失最高的5次告警:');
    monthResult.alarms.slice(0, 5).forEach((alarm, index) => {
      console.log(`  ${index + 1}. ¥${alarm.loss.toFixed(2)} - ${alarm.alarmName}`);
      console.log(`     时间: ${new Date(alarm.startTime).toLocaleString('zh-CN', { timeZone: 'UTC' })}`);
      console.log(`     时长: ${alarm.durationHours} 小时`);
    });

    // 按设备统计
    const deviceStats = {};
    monthResult.alarms.forEach(alarm => {
      if (!deviceStats[alarm.device]) {
        deviceStats[alarm.device] = {
          count: 0,
          totalLoss: 0
        };
      }
      deviceStats[alarm.device].count++;
      deviceStats[alarm.device].totalLoss += alarm.loss;
    });

    console.log('\n按设备类型统计:');
    Object.entries(deviceStats)
      .sort((a, b) => b[1].totalLoss - a[1].totalLoss)
      .forEach(([device, stats]) => {
        console.log(`  ${device}: ${stats.count}次告警, 总损失¥${stats.totalLoss.toFixed(2)}`);
      });

    console.log('\n✓ 验证完成\n');

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

verifyCalculation();
