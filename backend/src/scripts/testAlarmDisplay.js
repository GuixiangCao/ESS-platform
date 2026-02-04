const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const ChargingStrategy = require('../models/ChargingStrategy');
const dotenv = require('dotenv');

dotenv.config();

async function testAlarmDisplay() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const alarmId = 'e0a39f85-94a4-435c-b53f-413e49370b43';
    const stationId = 205;
    const date = '2026-01-12';

    console.log('═══════════════════════════════════════════════════');
    console.log('问题分析：告警为什么没在充放电周期中显示？');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. 查询告警详情
    const alarm = await Alarm.findOne({ alarmId });
    if (!alarm) {
      console.log('❌ 未找到告警\n');
      return;
    }

    console.log('【1】告警详情:');
    console.log(`告警ID: ${alarm.alarmId}`);
    console.log(`告警名称: ${alarm.alarmName}`);
    console.log(`电站: ${alarm.stationId}`);
    console.log(`startTime (UTC): ${alarm.startTime.toISOString()}`);
    console.log(`endTime (UTC): ${alarm.endTime.toISOString()}`);

    // 转换为UTC+8
    const UTC_OFFSET = 8 * 60 * 60 * 1000;
    const startUTC8 = new Date(alarm.startTime.getTime() + UTC_OFFSET);
    const endUTC8 = new Date(alarm.endTime.getTime() + UTC_OFFSET);
    console.log(`startTime (UTC+8): ${startUTC8.toISOString()} (${startUTC8.getHours()}:${String(startUTC8.getMinutes()).padStart(2, '0')})`);
    console.log(`endTime (UTC+8): ${endUTC8.toISOString()} (${endUTC8.getHours()}:${String(endUTC8.getMinutes()).padStart(2, '0')})`);
    console.log(`持续时间: ${(alarm.endTime - alarm.startTime) / 1000} 秒\n`);

    // 2. 查询充放电策略
    console.log('【2】充放电策略:');
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    const strategies = await ChargingStrategy.find({
      stationId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    console.log(`找到 ${strategies.length} 条充放电策略\n`);

    if (strategies.length > 0) {
      console.log('策略1的时段:');
      strategies[0].timeslots.forEach((slot, idx) => {
        const typeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '空闲';
        console.log(`  ${idx + 1}. ${slot.stime} - ${slot.etime}: ${typeName}, 功率: ${slot.power}kW`);
      });
      console.log('');
    }

    // 3. 判断告警是否在充放电周期中
    console.log('【3】告警与充放电周期的关系:');

    const alarmStartHour = startUTC8.getUTCHours();
    const alarmStartMinute = startUTC8.getUTCMinutes();
    const alarmTimeStr = `${String(alarmStartHour).padStart(2, '0')}:${String(alarmStartMinute).padStart(2, '0')}`;

    console.log(`告警开始时间: ${alarmTimeStr}`);

    if (strategies.length > 0) {
      let foundInPeriod = false;
      for (const strategy of strategies) {
        for (const slot of strategy.timeslots) {
          // 将时间字符串转换为分钟数进行比较
          const [startH, startM] = slot.stime.split(':').map(Number);
          const [endH, endM] = slot.etime.split(':').map(Number);
          const slotStartMinutes = startH * 60 + startM;
          const slotEndMinutes = endH * 60 + endM;
          const alarmMinutes = alarmStartHour * 60 + alarmStartMinute;

          if (alarmMinutes >= slotStartMinutes && alarmMinutes < slotEndMinutes) {
            const typeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '空闲';
            console.log(`✓ 告警发生在 ${slot.stime}-${slot.etime} ${typeName}周期内 (功率: ${slot.power}kW)`);
            foundInPeriod = true;
            break;
          }
        }
        if (foundInPeriod) break;
      }

      if (!foundInPeriod) {
        console.log('✗ 告警不在任何充放电周期内');
      }
    }
    console.log('');

    // 4. 分析可能的原因
    console.log('【4】为什么在SOC详情中看不到告警在充放电周期图表上？\n');
    console.log('可能的原因:');
    console.log('');
    console.log('1. 告警持续时间太短');
    console.log(`   - 实际持续时间: ${(alarm.endTime - alarm.startTime) / 1000} 秒`);
    console.log('   - 在24小时的时间轴上，4秒几乎是一个点，很难看到');
    console.log('');

    console.log('2. 告警和充放电周期是两个独立的可视化');
    console.log('   - 告警显示在 SOC曲线图 上（作为红色区域）');
    console.log('   - 充放电周期显示在 独立的ECharts图表 中');
    console.log('   - 它们不在同一个图表上！');
    console.log('');

    console.log('3. SOC曲线图的X轴是整点（每小时）');
    console.log(`   - 告警发生在 ${alarmTimeStr}，不是整点`);
    console.log('   - ReferenceArea使用整点标签，可能导致显示不准确');
    console.log('');

    console.log('【5】建议解决方案:\n');
    console.log('方案1: 在充放电策略图表上添加告警标记');
    console.log('  - 修改ChargingStrategyChart组件');
    console.log('  - 在时间轴上添加告警指示器（例如红色三角形）');
    console.log('  - 显示告警发生的准确时间');
    console.log('');

    console.log('方案2: 改善SOC曲线图上的告警显示');
    console.log('  - 增加X轴分辨率（例如每15分钟一个刻度）');
    console.log('  - 短时告警使用垂直线而不是区域');
    console.log('  - 添加告警标记点和悬停提示');
    console.log('');

    console.log('方案3: 合并两个图表');
    console.log('  - 将SOC曲线和充放电周期放在同一个图表中');
    console.log('  - 使用双Y轴（左侧：SOC%，右侧：功率）');
    console.log('  - 在同一时间轴上同时显示SOC、充放电周期和告警');
    console.log('');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testAlarmDisplay();
