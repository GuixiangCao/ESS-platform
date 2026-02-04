const mongoose = require('mongoose');
const Alarm = require('../src/models/Alarm');
const ChargingStrategy = require('../src/models/ChargingStrategy');
const ElectricityPrice = require('../src/models/ElectricityPrice');

async function debugAlarmLoss() {
  try {
    console.log('连接到MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到MongoDB\n');

    const alarmId = 'e0a39f85-94a4-435c-b53f-413e49370b43';

    // 1. 查询告警信息
    console.log('========================================');
    console.log('查询告警信息');
    console.log('========================================\n');

    const alarm = await Alarm.findOne({ alarmId });

    if (!alarm) {
      console.log('❌ 未找到该告警');
      process.exit(1);
    }

    console.log('✓ 找到告警:');
    console.log(`  告警ID: ${alarm.alarmId}`);
    console.log(`  告警名称: ${alarm.alarmName}`);
    console.log(`  设备类型: ${alarm.device}`);
    console.log(`  电站ID: ${alarm.stationId}`);
    console.log(`  开始时间 (UTC): ${alarm.startTime.toISOString()}`);
    console.log(`  结束时间 (UTC): ${alarm.endTime.toISOString()}`);
    console.log(`  持续时长: ${alarm.durationMinutes} 分钟 (${(alarm.durationMinutes / 60).toFixed(2)} 小时)`);
    console.log(`  告警日期: ${alarm.alarmDate.toISOString().split('T')[0]}`);

    // 转换为UTC+8时间
    const startTimeUTC8 = new Date(alarm.startTime.getTime() + 8 * 60 * 60 * 1000);
    const endTimeUTC8 = new Date(alarm.endTime.getTime() + 8 * 60 * 60 * 1000);

    console.log(`\n  开始时间 (UTC+8): ${startTimeUTC8.toISOString().replace('T', ' ').substring(0, 19)}`);
    console.log(`  结束时间 (UTC+8): ${endTimeUTC8.toISOString().replace('T', ' ').substring(0, 19)}`);

    // 2. 检查时间段是否在17:00-23:59:59之间
    console.log('\n========================================');
    console.log('检查时间段限制');
    console.log('========================================\n');

    const startHour = startTimeUTC8.getUTCHours();
    const startMinute = startTimeUTC8.getUTCMinutes();
    const startMinuteOfDay = startHour * 60 + startMinute;

    console.log(`  告警开始时刻: ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} (${startMinuteOfDay} 分钟)`);

    if (startMinuteOfDay >= 1020) {
      console.log(`  ❌ 告警在排除时段内 (17:00-23:59:59)`);
      console.log(`  原因: 该时段不计算告警损失`);
    } else {
      console.log(`  ✓ 告警不在排除时段内`);
    }

    // 3. 查询充放电策略
    console.log('\n========================================');
    console.log('查询充放电策略');
    console.log('========================================\n');

    const alarmDate = new Date(alarm.alarmDate);
    const strategies = await ChargingStrategy.find({
      stationId: alarm.stationId,
      date: {
        $gte: new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate()),
        $lt: new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate() + 1)
      },
      isActive: true
    });

    if (strategies.length === 0) {
      console.log('  ❌ 未找到充放电策略数据');
    } else {
      console.log(`  ✓ 找到 ${strategies.length} 条充放电策略`);

      const strategy = strategies[0];
      console.log(`\n  策略信息:`);
      console.log(`    策略ID: ${strategy._id}`);
      console.log(`    电站ID: ${strategy.stationId}`);
      console.log(`    网关ID: ${strategy.gatewayId}`);
      console.log(`    日期: ${strategy.date.toISOString().split('T')[0]}`);

      // 计算充电和放电周期数
      const chargeSlots = strategy.timeslots.filter(slot => slot.ctype === 1);
      const dischargeSlots = strategy.timeslots.filter(slot => slot.ctype === 2);
      const idleSlots = strategy.timeslots.filter(slot => slot.ctype === 3);

      console.log(`    时间段总数: ${strategy.timeslots.length}`);
      console.log(`    充电时段: ${chargeSlots.length}`);
      console.log(`    放电时段: ${dischargeSlots.length}`);
      console.log(`    空闲时段: ${idleSlots.length}`);

      // 检查告警时刻的充放电状态
      const checkTime = startMinuteOfDay;
      let foundInterval = false;

      console.log(`\n  检查 ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} 时刻的状态 (${checkTime} 分钟):`);

      // 转换时间格式为分钟
      const timeToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      // 显示所有充电时段
      if (chargeSlots.length > 0) {
        console.log(`\n  充电时段 (${chargeSlots.length}个):`);
        chargeSlots.forEach((slot, index) => {
          const startMin = timeToMinutes(slot.stime);
          const endMin = timeToMinutes(slot.etime);
          const inInterval = checkTime >= startMin && checkTime < endMin;
          console.log(`    ${index + 1}. ${slot.stime} - ${slot.etime} (${startMin}-${endMin} 分钟) 功率: ${slot.power} kW ${inInterval ? '← 告警在此时段' : ''}`);
          if (inInterval) {
            foundInterval = true;
          }
        });
      } else {
        console.log(`\n  ⚠️  无充电时段数据`);
      }

      // 显示所有放电时段
      if (dischargeSlots.length > 0) {
        console.log(`\n  放电时段 (${dischargeSlots.length}个):`);
        dischargeSlots.forEach((slot, index) => {
          const startMin = timeToMinutes(slot.stime);
          const endMin = timeToMinutes(slot.etime);
          const inInterval = checkTime >= startMin && checkTime < endMin;
          console.log(`    ${index + 1}. ${slot.stime} - ${slot.etime} (${startMin}-${endMin} 分钟) 功率: ${slot.power} kW ${inInterval ? '← 告警在此时段' : ''}`);
          if (inInterval) {
            foundInterval = true;
          }
        });
      } else {
        console.log(`\n  ⚠️  无放电时段数据`);
      }

      console.log('');
      if (foundInterval) {
        console.log(`    ✓ 告警在充电或放电周期内，应该计算损失`);
      } else {
        console.log(`    ❌ 告警不在任何充电或放电周期内 (空闲/待机状态)`);
        console.log(`    原因: 只计算充电和放电周期内的告警损失`);
      }
    }

    // 4. 查询电价数据
    console.log('\n========================================');
    console.log('查询电价数据');
    console.log('========================================\n');

    const priceData = await ElectricityPrice.findPriceByDate(
      '330000',
      alarmDate,
      0,
      1
    );

    if (!priceData) {
      console.log('  ❌ 未找到电价数据');
    } else {
      console.log('  ✓ 找到电价数据');
      console.log(`    地区: ${priceData.regionId}`);
      console.log(`    用户类型: ${priceData.userType === 0 ? '工商业' : '居民'}`);
      console.log(`    电压等级: ${priceData.voltageType}`);
      console.log(`    尖峰电价: ${priceData.sharp > 0 ? priceData.sharp + ' 元/kWh' : '不适用'}`);
      console.log(`    高峰电价: ${priceData.peak > 0 ? priceData.peak + ' 元/kWh' : '不适用'}`);
      console.log(`    平峰电价: ${priceData.shoulder > 0 ? priceData.shoulder + ' 元/kWh' : '不适用'}`);
      console.log(`    低谷电价: ${priceData.offPeak > 0 ? priceData.offPeak + ' 元/kWh' : '不适用'}`);
      console.log(`    深谷电价: ${priceData.deepValley > 0 ? priceData.deepValley + ' 元/kWh' : '不适用'}`);

      const currentPrice = priceData.getPriceAtTime(startMinuteOfDay);
      console.log(`\n    告警时刻电价: ${currentPrice ? currentPrice + ' 元/kWh' : '无'}`);
    }

    // 5. 总结
    console.log('\n========================================');
    console.log('损失计算总结');
    console.log('========================================\n');

    let reasons = [];

    if (startMinuteOfDay >= 1020) {
      reasons.push('❌ 告警发生在17:00-23:59:59排除时段');
    }

    if (strategies.length === 0) {
      reasons.push('❌ 未找到充放电策略数据');
    } else {
      const strategy = strategies[0];
      let inInterval = false;

      // 转换时间格式为分钟
      const timeToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      // 检查是否在充电或放电时段
      for (const slot of strategy.timeslots) {
        if (slot.ctype === 1 || slot.ctype === 2) { // 充电或放电
          const startMin = timeToMinutes(slot.stime);
          const endMin = timeToMinutes(slot.etime);
          if (startMinuteOfDay >= startMin && startMinuteOfDay < endMin) {
            inInterval = true;
            break;
          }
        }
      }

      if (!inInterval) {
        reasons.push('❌ 告警不在充电或放电周期内（空闲/待机状态）');
      }
    }

    if (!priceData) {
      reasons.push('❌ 未找到电价数据');
    }

    if (reasons.length === 0) {
      console.log('✓ 所有条件都满足，告警应该产生损失');
      console.log('  如果仍然显示¥0.00，可能是因为:');
      console.log('  - 功率值为0或很小');
      console.log('  - 持续时间很短');
      console.log('  - 电价为0');
    } else {
      console.log('告警没有产生损失的原因:');
      reasons.forEach((reason, index) => {
        console.log(`  ${index + 1}. ${reason}`);
      });
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

debugAlarmLoss();
