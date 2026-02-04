const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Alarm = require('../src/models/Alarm');
const alarmLossCalculator = require('../src/services/alarmLossCalculator');

async function testSingleAlarm() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    console.log('═'.repeat(100));
    console.log('测试单个告警的时段拆分计算');
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

    // 直接调用 calculateAlarmLoss 函数（不是 calculateStationAlarmLosses）
    console.log('\n⏳ 正在计算损失（使用时段拆分算法）...\n');

    // 需要确保 alarmLossCalculator 导出了 calculateAlarmLoss 函数
    // 如果没有导出，我们需要修改 alarmLossCalculator.js
    const result = await alarmLossCalculator.calculateAlarmLoss(alarm, '330000', 0, 1);

    console.log('═'.repeat(100));
    console.log('✅ 计算结果');
    console.log('═'.repeat(100));
    console.log('总损失:', '¥' + result.loss.toFixed(2));
    console.log('拆分时段数:', result.timeslotCount || '未拆分');
    console.log('\n计算说明:', result.calculationNote);

    if (result.lossDetails && result.lossDetails.length > 0) {
      console.log('\n📊 时段详情:');
      console.log('─'.repeat(100));
      console.log('序号  开始时间              结束时间              时长(h)   类型  功率(kW)  电价   损失(元)');
      console.log('─'.repeat(100));

      result.lossDetails.forEach((detail, index) => {
        const startStr = detail.startTimeStr || detail.time || '';
        const endStr = detail.endTimeStr || '';

        console.log(
          `${(index + 1).toString().padStart(4)}  ` +
          `${startStr.padEnd(20)}  ` +
          `${endStr.padEnd(20)}  ` +
          `${detail.durationHours.toFixed(4).padStart(8)}  ` +
          `${(detail.ctypeName || '').padEnd(4)}  ` +
          `${detail.power.toString().padStart(8)}  ` +
          `${detail.price.toFixed(2).padStart(6)}  ` +
          `${detail.calculatedLoss.toFixed(2).padStart(10)}`
        );
      });

      console.log('─'.repeat(100));
      console.log(`总计: ${result.lossDetails.length} 个时段，合计损失 ¥${result.loss.toFixed(2)}`);
    }

    console.log('\n' + '═'.repeat(100));
    console.log('📈 对比分析:');
    console.log('─'.repeat(100));
    console.log('原计算方法（单时间点）:        ¥3,920.28');
    console.log('新计算方法（时段拆分）:        ¥' + result.loss.toFixed(2));
    console.log('预期值（手动计算）:            ¥9,294.40');

    const diff = result.loss - 9294.40;
    const percentDiff = (diff / 9294.40 * 100).toFixed(2);

    if (Math.abs(diff) < 10) {
      console.log('差异:                          ✅ 符合预期 (差异: ¥' + diff.toFixed(2) + ', ' + percentDiff + '%)');
    } else {
      console.log('差异:                          ⚠️  与预期有差异: ¥' + diff.toFixed(2) + ' (' + percentDiff + '%)');
    }

    console.log('═'.repeat(100));

    await mongoose.connection.close();
  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testSingleAlarm();
