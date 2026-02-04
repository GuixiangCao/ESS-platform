const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');
const { mergeTimeIntervals } = require('../src/services/alarmLossCalculator');

async function testMerge() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    // Get the two overlapping alarms
    const alarm1 = await Alarm.findOne({ alarmId: 'b6bf2379-b8c1-4c53-a5dd-c3888976bfe0' }).lean();
    const alarm2 = await Alarm.findOne({ alarmId: '1ce261a8-64a1-439d-929a-46a0746de343' }).lean();

    console.log('测试时间区间合并:\n');
    console.log('告警1:', alarm1.alarmId);
    console.log('开始:', alarm1.startTime);
    console.log('结束:', alarm1.endTime);
    console.log('设备:', alarm1.device);
    console.log('stationId:', alarm1.stationId);
    console.log('gatewayDeviceId:', alarm1.gatewayDeviceId);
    console.log();

    console.log('告警2:', alarm2.alarmId);
    console.log('开始:', alarm2.startTime);
    console.log('结束:', alarm2.endTime);
    console.log('设备:', alarm2.device);
    console.log('stationId:', alarm2.stationId);
    console.log('gatewayDeviceId:', alarm2.gatewayDeviceId);
    console.log();

    // Create intervals
    const intervals = [alarm1, alarm2].map(alarm => ({
      start: new Date(alarm.startTime),
      end: new Date(alarm.endTime),
      alarmId: alarm.alarmId,
      device: alarm.device
    }));

    console.log('原始区间:');
    intervals.forEach(i => {
      console.log(`  ${i.alarmId}: ${i.start.toISOString()} - ${i.end.toISOString()}`);
    });

    // Test mergeTimeIntervals
    console.log('\n调用mergeTimeIntervals...');

    // Need to define the merge function here since it's not exported
    function mergeTimeIntervals(intervals) {
      if (!intervals || intervals.length === 0) return [];

      const sorted = intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
      const merged = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];

        if (current.start.getTime() <= last.end.getTime() + 1000) {
          last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
          if (!last.alarmIds) last.alarmIds = [last.alarmId];
          last.alarmIds.push(current.alarmId);
        } else {
          merged.push(current);
        }
      }

      return merged;
    }

    const merged = mergeTimeIntervals(intervals);

    console.log('\n合并后的区间:');
    merged.forEach((m, i) => {
      console.log(`\n[${i+1}] 合并区间:`);
      console.log(`  开始: ${m.start.toISOString()}`);
      console.log(`  结束: ${m.end.toISOString()}`);
      console.log(`  时长: ${((m.end - m.start) / 1000 / 60).toFixed(2)} 分钟`);
      console.log(`  包含告警:`, m.alarmIds || [m.alarmId]);
    });

    // Now test if calculateAlarmLoss would work with a merged alarm
    console.log('\n\n准备用合并后的告警计算损失...');
    const mergedAlarm = {
      ...alarm1,  // Use alarm1 as template
      startTime: merged[0].start,
      endTime: merged[0].end,
      durationMinutes: (merged[0].end - merged[0].start) / 1000 / 60
    };

    console.log('\n合并后的告警对象:');
    console.log('  alarmId:', mergedAlarm.alarmId);
    console.log('  stationId:', mergedAlarm.stationId);
    console.log('  gatewayDeviceId:', mergedAlarm.gatewayDeviceId);
    console.log('  device:', mergedAlarm.device);
    console.log('  startTime:', mergedAlarm.startTime);
    console.log('  endTime:', mergedAlarm.endTime);
    console.log('  durationMinutes:', mergedAlarm.durationMinutes);

    // Try calling calculateAlarmLoss
    const calculateAlarmLoss = require('../src/services/alarmLossCalculator').calculateAlarmLoss;

    console.log('\n调用 calculateAlarmLoss...');
    const result = await calculateAlarmLoss(mergedAlarm, '330000', 0, 1);

    console.log('\n结果:');
    console.log('  loss:', result.loss);
    console.log('  reason:', result.reason);
    if (result.lossDetails) {
      console.log('  lossDetails:', result.lossDetails.length, '条');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testMerge();
