const mongoose = require('mongoose');
const ChargingStrategy = require('../src/models/ChargingStrategy');

async function checkStrategies() {
  try {
    console.log('连接到MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到MongoDB\n');

    const stationId = 205;
    const dates = ['2026-01-11', '2026-01-12', '2026-01-13'];

    console.log('========================================');
    console.log(`电站${stationId}的充放电策略数据`);
    console.log('========================================\n');

    for (const dateStr of dates) {
      console.log(`\n日期: ${dateStr}`);
      console.log('----------------------------------------');

      const date = new Date(dateStr);
      const strategies = await ChargingStrategy.find({
        stationId: stationId,
        date: {
          $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      });

      if (strategies.length === 0) {
        console.log('❌ 未找到充放电策略数据');
      } else {
        strategies.forEach((strategy, index) => {
          console.log(`\n策略 ${index + 1}:`);
          console.log(`  ID: ${strategy._id}`);
          console.log(`  网关ID: ${strategy.gatewayId}`);
          console.log(`  存储日期: ${strategy.date.toISOString()}`);
          console.log(`  激活状态: ${strategy.isActive ? '是' : '否'}`);
          console.log(`  时间段数量: ${strategy.timeslots ? strategy.timeslots.length : 0}`);

          if (strategy.timeslots && strategy.timeslots.length > 0) {
            console.log(`\n  时间段详情:`);
            strategy.timeslots.forEach((slot, i) => {
              const typeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '空闲';
              console.log(`    ${i + 1}. ${slot.stime} - ${slot.etime} | 类型: ${typeName} | 功率: ${slot.power} kW`);
            });
          } else {
            console.log(`  ⚠️  该策略无时间段数据`);
          }
        });
      }
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkStrategies();
