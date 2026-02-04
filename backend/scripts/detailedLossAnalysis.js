const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const alarmLossCalculator = require('../src/services/alarmLossCalculator');

async function getDetailedAnalysis() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const stationId = 287;
    const date = '2025-12-26';

    console.log('═'.repeat(80));
    console.log(`电站 ${stationId} - ${date} 损失分析详情`);
    console.log('═'.repeat(80));

    // 1. 获取总体损失数据
    const result = await alarmLossCalculator.calculateStationAlarmLosses(
      stationId,
      date,
      date,
      undefined,
      undefined,
      undefined
    );

    console.log('\n📊 总体统计');
    console.log('─'.repeat(80));
    console.log(`总告警数:        ${result.alarmCount} 个`);
    console.log(`工作日告警:      ${result.workdayAlarmCount} 个`);
    console.log(`节假日告警:      ${result.holidayAlarmCount} 个`);
    console.log(`\n💰 损失统计（已去重）`);
    console.log(`总损失:          ¥${result.totalLoss.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log(`工作日损失:      ¥${result.summary.workdayLoss.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

    // 2. 按设备分类统计
    const deviceStats = {};
    result.alarms.forEach(alarm => {
      const device = alarm.device || 'unknown';
      if (!deviceStats[device]) {
        deviceStats[device] = {
          count: 0,
          totalLoss: 0,
          totalDuration: 0,
          alarms: []
        };
      }
      deviceStats[device].count++;
      deviceStats[device].totalLoss += alarm.loss || 0;
      deviceStats[device].totalDuration += alarm.durationMinutes || 0;
      deviceStats[device].alarms.push(alarm);
    });

    console.log('\n\n📋 按设备分类统计');
    console.log('─'.repeat(80));
    console.log('设备类型    告警数量    单独计算损失      平均损失/次    总时长(小时)');
    console.log('─'.repeat(80));

    const deviceOrder = ['lc', 'pcs', 'cluster', 'meter', 'highMeter', 'ac', 'ems'];
    deviceOrder.forEach(device => {
      if (deviceStats[device]) {
        const stat = deviceStats[device];
        const avgLoss = stat.totalLoss / stat.count;
        const totalHours = stat.totalDuration / 60;
        console.log(
          `${device.padEnd(12)}` +
          `${stat.count.toString().padEnd(12)}` +
          `¥${stat.totalLoss.toFixed(2).padEnd(18)}` +
          `¥${avgLoss.toFixed(2).padEnd(15)}` +
          `${totalHours.toFixed(2)}`
        );
      }
    });

    // 3. 损失Top 10告警
    console.log('\n\n🔝 损失最大的10个告警');
    console.log('─'.repeat(80));
    console.log('序号  设备  开始时间(北京)        结束时间(北京)        时长(分)   损失(元)');
    console.log('─'.repeat(80));

    const topAlarms = [...result.alarms]
      .sort((a, b) => (b.loss || 0) - (a.loss || 0))
      .slice(0, 10);

    topAlarms.forEach((alarm, index) => {
      const start = new Date(alarm.startTime);
      const end = new Date(alarm.endTime);
      const startBJ = new Date(start.getTime() + 8*60*60*1000).toISOString().replace('T', ' ').substring(0, 19);
      const endBJ = new Date(end.getTime() + 8*60*60*1000).toISOString().replace('T', ' ').substring(0, 19);

      console.log(
        `${(index + 1).toString().padEnd(6)}` +
        `${alarm.device.padEnd(6)}` +
        `${startBJ}  ` +
        `${endBJ}  ` +
        `${alarm.durationMinutes.toFixed(2).padEnd(11)}` +
        `${(alarm.loss || 0).toFixed(2)}`
      );
    });

    // 4. 重叠告警分析
    console.log('\n\n🔄 重叠告警分析（10:00时段示例）');
    console.log('─'.repeat(80));

    // 找出10:00-11:00时段的告警
    const targetTime = new Date('2025-12-26T02:00:00.000Z'); // 10:00 Beijing
    const targetTimeEnd = new Date('2025-12-26T03:00:00.000Z'); // 11:00 Beijing

    const overlappingAlarms = result.alarms.filter(alarm => {
      const start = new Date(alarm.startTime);
      const end = new Date(alarm.endTime);
      return start >= targetTime && start < targetTimeEnd;
    });

    console.log(`该时段告警数: ${overlappingAlarms.length} 个`);
    console.log(`单独计算损失总和: ¥${overlappingAlarms.reduce((sum, a) => sum + (a.loss || 0), 0).toFixed(2)}`);
    console.log('\n告警列表:');
    console.log('设备  告警ID(前8位)  开始时间      结束时间      损失(元)');
    console.log('─'.repeat(80));

    overlappingAlarms
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .forEach(alarm => {
        const start = new Date(alarm.startTime);
        const end = new Date(alarm.endTime);
        const startBJ = new Date(start.getTime() + 8*60*60*1000).toISOString().substring(11, 19);
        const endBJ = new Date(end.getTime() + 8*60*60*1000).toISOString().substring(11, 19);

        console.log(
          `${alarm.device.padEnd(6)}` +
          `${alarm.alarmId.substring(0, 8).padEnd(16)}` +
          `${startBJ}  ` +
          `${endBJ}  ` +
          `${(alarm.loss || 0).toFixed(2)}`
        );
      });

    console.log('\n说明: 以上告警存在时间重叠，实际损失已进行去重处理');

    // 5. 时间分布分析
    console.log('\n\n⏰ 告警时间分布（按小时统计）');
    console.log('─'.repeat(80));

    const hourlyStats = {};
    result.alarms.forEach(alarm => {
      const start = new Date(alarm.startTime);
      const bjHour = (start.getUTCHours() + 8) % 24;
      if (!hourlyStats[bjHour]) {
        hourlyStats[bjHour] = { count: 0, totalLoss: 0 };
      }
      hourlyStats[bjHour].count++;
      hourlyStats[bjHour].totalLoss += alarm.loss || 0;
    });

    console.log('时段        告警数量    单独计算损失');
    console.log('─'.repeat(80));
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyStats[hour]) {
        const stat = hourlyStats[hour];
        console.log(
          `${hour.toString().padStart(2, '0')}:00-${(hour+1).toString().padStart(2, '0')}:00  ` +
          `${stat.count.toString().padEnd(12)}` +
          `¥${stat.totalLoss.toFixed(2)}`
        );
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ 以上"单独计算损失"为参考值，实际总损失已对时间重叠的告警进行去重处理');
    console.log('✅ 去重后的实际总损失: ¥' + result.totalLoss.toFixed(2));
    console.log('═'.repeat(80) + '\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('分析失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

getDetailedAnalysis();
