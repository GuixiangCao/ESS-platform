const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');
const alarmLossCalculator = require('../src/services/alarmLossCalculator');

async function testIntegration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    console.log('═'.repeat(100));
    console.log('测试时段拆分算法集成');
    console.log('═'.repeat(100));

    // 测试跨天告警 986a3968-343b-4487-91f3-9db727fafc87
    const targetAlarmId = '986a3968-343b-4487-91f3-9db727fafc87';
    const alarm = await Alarm.findOne({ alarmId: targetAlarmId }).lean();

    if (!alarm) {
      console.log('❌ 未找到测试告警:', targetAlarmId);
      return;
    }

    console.log('\n📋 测试告警信息:');
    console.log('─'.repeat(100));
    console.log('告警ID:', alarm.alarmId);
    console.log('设备:', alarm.device);
    console.log('告警名称:', alarm.alarmName);
    console.log('开始时间(UTC):', alarm.startTime);
    console.log('结束时间(UTC):', alarm.endTime);

    const UTC_OFFSET = 8 * 60 * 60 * 1000;
    const startBJ = new Date(alarm.startTime.getTime() + UTC_OFFSET);
    const endBJ = new Date(alarm.endTime.getTime() + UTC_OFFSET);
    console.log('开始时间(北京):', startBJ.toISOString().replace('T', ' ').substring(0, 19));
    console.log('结束时间(北京):', endBJ.toISOString().replace('T', ' ').substring(0, 19));
    console.log('持续时长:', alarm.durationMinutes, '分钟 (', (alarm.durationMinutes / 60).toFixed(2), '小时)');

    // 调用新的计算函数
    console.log('\n⏳ 正在计算损失（使用时段拆分算法）...\n');

    const result = await alarmLossCalculator.calculateStationAlarmLosses(
      alarm.stationId,
      '2025-12-26',
      '2025-12-28',
      '330000',
      0,
      1
    );

    // 找到目标告警的计算结果
    const calculatedAlarm = result.alarms.find(a => a.alarmId === targetAlarmId);

    if (!calculatedAlarm) {
      console.log('❌ 未找到告警的计算结果');
      return;
    }

    console.log('═'.repeat(100));
    console.log('✅ 计算结果');
    console.log('═'.repeat(100));
    console.log('总损失:', '¥' + calculatedAlarm.loss.toFixed(2));
    console.log('拆分时段数:', calculatedAlarm.timeslotCount || '未拆分');
    console.log('\n计算说明:', calculatedAlarm.calculationNote);

    if (calculatedAlarm.lossDetails && calculatedAlarm.lossDetails.length > 0) {
      console.log('\n📊 时段详情:');
      console.log('─'.repeat(100));
      console.log('序号  开始时间            结束时间            时长(h)   类型  功率(kW)  电价   损失(元)');
      console.log('─'.repeat(100));

      calculatedAlarm.lossDetails.forEach((detail, index) => {
        console.log(
          `${(index + 1).toString().padStart(4)}  ` +
          `${detail.startTimeStr || detail.time}  ` +
          `${detail.endTimeStr || ''}  `.padEnd(24) +
          `${detail.durationHours.toFixed(4).padStart(8)}  ` +
          `${detail.ctypeName.padEnd(4)}  ` +
          `${detail.power.toString().padStart(8)}  ` +
          `${detail.price.toFixed(2).padStart(6)}  ` +
          `${detail.calculatedLoss.toFixed(2).padStart(10)}`
        );
      });
    }

    console.log('\n' + '═'.repeat(100));
    console.log('📈 对比分析:');
    console.log('─'.repeat(100));
    console.log('原计算方法（单时间点）:        ¥3,920.28');
    console.log('新计算方法（时段拆分）:        ¥' + calculatedAlarm.loss.toFixed(2));
    console.log('预期值（手动计算）:            ¥9,294.40');
    console.log('差异:                          ' +
      (calculatedAlarm.loss >= 9200 && calculatedAlarm.loss <= 9300 ?
        '✅ 符合预期' :
        '⚠️  与预期有差异: ¥' + (calculatedAlarm.loss - 9294.40).toFixed(2))
    );
    console.log('═'.repeat(100));

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testIntegration();
