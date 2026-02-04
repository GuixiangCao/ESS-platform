const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const StationGateway = require('../src/models/StationGateway');
const ChargingStrategy = require('../src/models/ChargingStrategy');
const ElectricityPrice = require('../src/models/ElectricityPrice');

async function checkRequiredData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const stationId = 287;
    const testDate = new Date('2025-12-26T00:00:00.000Z');

    console.log('检查电站287损失计算所需的必要数据：\n');
    console.log('─'.repeat(80));

    // 1. 检查StationGateway
    console.log('\n1. 检查电站网关信息 (StationGateway):');
    const gateways = await StationGateway.findByStationId(stationId);
    if (gateways && gateways.length > 0) {
      console.log('✅ 找到', gateways.length, '个网关');
      console.log('   示例:', gateways[0].gatewayId);
    } else {
      console.log('❌ 未找到网关信息');
    }

    // 2. 检查ChargingStrategy
    console.log('\n2. 检查充放电策略 (ChargingStrategy):');
    console.log('   查询日期:', testDate.toISOString().split('T')[0]);
    const strategies = await ChargingStrategy.find({
      stationId,
      date: testDate,
      isActive: true
    });
    if (strategies && strategies.length > 0) {
      console.log('✅ 找到', strategies.length, '条策略');
      console.log('   示例:', JSON.stringify(strategies[0], null, 2).substring(0, 300) + '...');
    } else {
      console.log('❌ 未找到充放电策略');

      // 查询该电站是否有其他日期的策略
      const anyStrategy = await ChargingStrategy.findOne({ stationId });
      if (anyStrategy) {
        console.log('   但该电站有其他日期的策略，最近一条:');
        console.log('   日期:', anyStrategy.date);
      } else {
        console.log('   该电站完全没有充放电策略数据');
      }
    }

    // 3. 检查ElectricityPrice
    console.log('\n3. 检查电价数据 (ElectricityPrice):');
    console.log('   查询日期:', testDate.toISOString().split('T')[0]);
    console.log('   地区代码: 330000 (默认值)');
    console.log('   用户类型: 0 (工商业)');
    console.log('   电压等级: 1');

    const priceData = await ElectricityPrice.findPriceByDate(
      '330000',
      testDate,
      0,
      1
    );

    if (priceData) {
      console.log('✅ 找到电价数据');
      console.log('   示例:', JSON.stringify(priceData, null, 2).substring(0, 300) + '...');
    } else {
      console.log('❌ 未找到电价数据');

      // 查询是否有其他日期的电价数据
      const anyPrice = await ElectricityPrice.findOne({ regionId: '330000' });
      if (anyPrice) {
        console.log('   但该地区有其他日期的电价，最近一条:');
        console.log('   日期:', anyPrice.date);
      } else {
        console.log('   该地区完全没有电价数据');
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n总结:');
    const hasGateways = gateways && gateways.length > 0;
    const hasStrategies = strategies && strategies.length > 0;
    const hasPrices = priceData !== null;

    if (hasGateways && hasStrategies && hasPrices) {
      console.log('✅ 所有必要数据齐全，损失计算应该能正常进行');
    } else {
      console.log('❌ 缺少必要数据，损失计算会返回0:');
      if (!hasGateways) console.log('   - 缺少网关信息');
      if (!hasStrategies) console.log('   - 缺少充放电策略');
      if (!hasPrices) console.log('   - 缺少电价数据');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkRequiredData();
