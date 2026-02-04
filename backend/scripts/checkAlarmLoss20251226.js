const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');

async function checkAlarmData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    // Check the two specific alarms mentioned by user
    const alarmIds = [
      'b6bf2379-b8c1-4c53-a5dd-c3888976bfe0',
      '1ce261a8-64a1-439d-929a-46a0746de343'
    ];

    console.log('查询这两个具体告警的详细信息：\n');

    for (const alarmId of alarmIds) {
      const alarm = await Alarm.findOne({ alarmId }).lean();

      if (alarm) {
        console.log('告警ID:', alarmId);
        console.log('开始时间:', alarm.startTime);
        console.log('结束时间:', alarm.endTime || '进行中');
        console.log('设备:', alarm.device);
        console.log('功率:', alarm.power);
        console.log('持续时长(分钟):', alarm.durationMinutes);
        console.log('计算损失:', alarm.loss);
        console.log('---\n');
      } else {
        console.log('未找到告警:', alarmId, '\n');
      }
    }

    // Check all alarms on 2025-12-26
    const startDate = new Date('2025-12-26T00:00:00.000Z');
    const endDate = new Date('2025-12-26T23:59:59.999Z');

    const allAlarms = await Alarm.find({
      stationId: 287,
      startTime: { $gte: startDate, $lte: endDate }
    }).lean();

    console.log('\n2025-12-26 所有告警统计：');
    console.log('总告警数:', allAlarms.length);
    console.log('有损失数据的告警:', allAlarms.filter(a => a.loss > 0).length);
    console.log('损失为0或undefined的告警:', allAlarms.filter(a => !a.loss || a.loss === 0).length);

    const totalIndividualLoss = allAlarms.reduce((sum, a) => sum + (a.loss || 0), 0);
    console.log('所有告警单独损失总和:', totalIndividualLoss.toFixed(2), '元');

    // Check a few sample alarms with their details
    console.log('\n前5个告警详细信息：');
    allAlarms.slice(0, 5).forEach((alarm, i) => {
      console.log(`\n[${i + 1}] 告警ID: ${alarm.alarmId}`);
      console.log(`    设备: ${alarm.device}`);
      console.log(`    开始: ${alarm.startTime}`);
      console.log(`    结束: ${alarm.endTime || '进行中'}`);
      console.log(`    时长: ${alarm.durationMinutes} 分钟`);
      console.log(`    功率: ${alarm.power} kW`);
      console.log(`    损失: ${alarm.loss || 0} 元`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkAlarmData();
