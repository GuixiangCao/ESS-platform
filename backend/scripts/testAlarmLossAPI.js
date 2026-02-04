const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const alarmLossCalculator = require('../src/services/alarmLossCalculator');

async function testAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    console.log('调用 calculateStationAlarmLosses API...\n');

    // 正确的参数传递方式（分别传参，不是对象）
    let result;
    try {
      result = await alarmLossCalculator.calculateStationAlarmLosses(
        287,              // stationId
        '2025-12-26',     // startDate
        '2025-12-26',     // endDate
        undefined,        // regionId (will use default '330000')
        undefined,        // userType (will use default 0)
        undefined         // voltageType (will use default 1)
      );
    } catch (apiError) {
      console.error('API 调用失败:', apiError.message);
      console.error(apiError.stack);
      await mongoose.connection.close();
      process.exit(1);
    }

    if (!result) {
      console.error('API 返回 undefined');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('API 返回结果：');
    console.log('─'.repeat(80));
    console.log('总告警数:', result.alarmCount);
    console.log('工作日告警数:', result.workdayAlarmCount);
    console.log('节假日告警数:', result.holidayAlarmCount);
    console.log('总损失 (totalLoss):', result.totalLoss, '元');
    console.log('工作日损失 (workdayLoss):', result.summary?.workdayLoss, '元');
    console.log('\n告警详情（前5个）：');
    console.log('─'.repeat(80));

    result.alarms.slice(0, 5).forEach((alarm, i) => {
      console.log(`\n[${i + 1}] 告警ID: ${alarm.alarmId}`);
      console.log(`    设备: ${alarm.device}`);
      console.log(`    开始: ${alarm.startTime}`);
      console.log(`    结束: ${alarm.endTime}`);
      console.log(`    时长: ${alarm.durationMinutes?.toFixed(2)} 分钟`);
      console.log(`    是否节假日: ${alarm.isHoliday ? '是' : '否'}`);
      console.log(`    功率: ${alarm.power} kW`);
      console.log(`    损失: ${alarm.loss} 元`);
    });

    // Check the two specific alarms
    const alarm1 = result.alarms.find(a => a.alarmId === 'b6bf2379-b8c1-4c53-a5dd-c3888976bfe0');
    const alarm2 = result.alarms.find(a => a.alarmId === '1ce261a8-64a1-439d-929a-46a0746de343');

    console.log('\n\n用户提到的两个重叠告警：');
    console.log('─'.repeat(80));

    if (alarm1) {
      console.log('\n告警1:', alarm1.alarmId);
      console.log('开始时间:', alarm1.startTime);
      console.log('结束时间:', alarm1.endTime);
      console.log('时长:', alarm1.durationMinutes?.toFixed(2), '分钟');
      console.log('功率:', alarm1.power, 'kW');
      console.log('损失:', alarm1.loss, '元');
      console.log('是否节假日:', alarm1.isHoliday ? '是' : '否');
    }

    if (alarm2) {
      console.log('\n告警2:', alarm2.alarmId);
      console.log('开始时间:', alarm2.startTime);
      console.log('结束时间:', alarm2.endTime);
      console.log('时长:', alarm2.durationMinutes?.toFixed(2), '分钟');
      console.log('功率:', alarm2.power, 'kW');
      console.log('损失:', alarm2.loss, '元');
      console.log('是否节假日:', alarm2.isHoliday ? '是' : '否');
    }

    if (alarm1 && alarm2) {
      const individualSum = (alarm1.loss || 0) + (alarm2.loss || 0);
      console.log('\n两个告警单独损失总和:', individualSum.toFixed(2), '元');
      console.log('实际总损失 (去重后):', result.totalLoss, '元');
      console.log('差异:', (individualSum - result.totalLoss).toFixed(2), '元');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testAPI();
