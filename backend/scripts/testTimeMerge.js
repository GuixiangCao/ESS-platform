const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Alarm = require('../src/models/Alarm');

/**
 * 测试时间合并逻辑
 * 查找287电站在特定日期下，同一网关的多个告警是否正确合并
 */
async function testTimeMerge() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    // 查找287电站指定日期的告警
    const testDate = '2026-01-06';
    const startTime = new Date(testDate + 'T00:00:00.000Z');
    const endTime = new Date(testDate + 'T23:59:59.999Z');

    const alarms = await Alarm.find({
      stationId: 287,
      startTime: { $gte: startTime, $lte: endTime }
    }).sort({ startTime: 1 });

    console.log(`电站287在${testDate}的告警数量:`, alarms.length);
    console.log('');

    if (alarms.length === 0) {
      console.log('没有找到告警数据');
      await mongoose.connection.close();
      return;
    }

    // 按网关分组
    const alarmsByGateway = {};
    alarms.forEach(alarm => {
      const gateway = alarm.device || 'unknown';
      if (!alarmsByGateway[gateway]) {
        alarmsByGateway[gateway] = [];
      }
      alarmsByGateway[gateway].push(alarm);
    });

    console.log('按网关分组的告警:');
    for (const [gateway, gatewayAlarms] of Object.entries(alarmsByGateway)) {
      console.log(`\n网关: ${gateway} (${gatewayAlarms.length}个告警)`);
      console.log('─'.repeat(80));

      // 显示原始告警时间
      gatewayAlarms.forEach((alarm, index) => {
        console.log(`告警 ${index + 1}:`);
        console.log(`  ID: ${alarm.alarmId}`);
        console.log(`  名称: ${alarm.alarmName}`);
        console.log(`  开始: ${alarm.startTime.toISOString()}`);
        console.log(`  结束: ${alarm.endTime.toISOString()}`);
        console.log(`  时长: ${alarm.durationMinutes} 分钟`);
      });

      // 检测重叠
      console.log('\\n时间重叠检测:');
      for (let i = 0; i < gatewayAlarms.length - 1; i++) {
        for (let j = i + 1; j < gatewayAlarms.length; j++) {
          const alarm1 = gatewayAlarms[i];
          const alarm2 = gatewayAlarms[j];

          const start1 = alarm1.startTime.getTime();
          const end1 = alarm1.endTime.getTime();
          const start2 = alarm2.startTime.getTime();
          const end2 = alarm2.endTime.getTime();

          // 检查是否重叠
          if (start1 <= end2 && start2 <= end1) {
            const overlapStart = Math.max(start1, start2);
            const overlapEnd = Math.min(end1, end2);
            const overlapMinutes = (overlapEnd - overlapStart) / 1000 / 60;

            console.log(`  ⚠️  告警${i + 1}和告警${j + 1}存在重叠!`);
            console.log(`      重叠时长: ${overlapMinutes.toFixed(2)} 分钟`);
          }
        }
      }

      // 模拟合并逻辑
      const intervals = gatewayAlarms.map(alarm => ({
        start: alarm.startTime,
        end: alarm.endTime
      })).sort((a, b) => a.start.getTime() - b.start.getTime());

      const merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const last = merged[merged.length - 1];

        if (current.start.getTime() <= last.end.getTime() + 1000) {
          last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
        } else {
          merged.push(current);
        }
      }

      const totalOriginalMinutes = gatewayAlarms.reduce((sum, a) => sum + a.durationMinutes, 0);
      const totalMergedMinutes = merged.reduce((sum, interval) => {
        return sum + (interval.end.getTime() - interval.start.getTime()) / 1000 / 60;
      }, 0);

      console.log('\\n合并结果:');
      console.log(`  原始告警总时长: ${totalOriginalMinutes.toFixed(2)} 分钟`);
      console.log(`  合并后实际时长: ${totalMergedMinutes.toFixed(2)} 分钟`);
      console.log(`  节省重复计算: ${(totalOriginalMinutes - totalMergedMinutes).toFixed(2)} 分钟`);

      if (merged.length !== intervals.length) {
        console.log(`  合并后区间数: ${merged.length}个 (原始: ${intervals.length}个)`);
        merged.forEach((interval, idx) => {
          console.log(`  区间${idx + 1}: ${interval.start.toISOString()} - ${interval.end.toISOString()}`);
        });
      }
    }

    await mongoose.connection.close();
    console.log('\\n数据库连接已关闭');

  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testTimeMerge();
