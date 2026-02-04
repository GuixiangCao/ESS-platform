require('dotenv').config();
const mongoose = require('mongoose');
const { calculateAlarmLoss } = require('../services/alarmLossCalculator');
const Alarm = require('../models/Alarm');

async function checkAlarmLossReason() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const alarmId = 'f1e7893c-1322-48be-8881-7fb64022b0e1';

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`查询告警 ${alarmId} 的损失计算原因`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询告警
    const alarm = await Alarm.findOne({ alarmId });

    if (!alarm) {
      console.log('❌ 未找到该告警记录');
      await mongoose.connection.close();
      return;
    }

    // 显示告警基本信息
    const UTC_OFFSET = 8 * 60 * 60 * 1000;
    const localStartTime = new Date(alarm.startTime.getTime() + UTC_OFFSET);
    const localEndTime = new Date(alarm.endTime.getTime() + UTC_OFFSET);

    console.log('📋 告警基本信息:');
    console.log(`  告警ID: ${alarm.alarmId}`);
    console.log(`  电站ID: ${alarm.stationId}`);
    console.log(`  设备: ${alarm.device}`);
    console.log(`  告警名称: ${alarm.alarmName || '未知'}`);
    console.log(`  开始时间 (本地): ${localStartTime.toISOString().replace('T', ' ').replace('.000Z', ' +0800')}`);
    console.log(`  结束时间 (本地): ${localEndTime.toISOString().replace('T', ' ').replace('.000Z', ' +0800')}`);
    console.log(`  持续时长: ${alarm.durationMinutes.toFixed(2)} 分钟\n`);

    // 计算损失
    console.log('🔍 开始计算损失...\n');
    const lossData = await calculateAlarmLoss(alarm);

    console.log('💰 损失计算结果:');
    console.log(`  总损失: ¥${lossData.loss || 0}`);
    console.log(`  时间损失: ¥${lossData.timeLoss || 0}`);
    console.log(`  SOC目标损失: ¥${lossData.socTargetLoss || 0}\n`);

    // 显示详细原因
    if (lossData.loss === 0 || lossData.loss === null) {
      console.log('📝 未产生损失的原因:');
      console.log('─────────────────────────────────────────────────────────\n');

      // 检查计算说明
      if (lossData.calculationNote) {
        console.log('💡 计算说明:');
        console.log(`  ${lossData.calculationNote}\n`);
      }

      // 检查SOC目标详情
      if (lossData.socTargetDetails) {
        console.log('🔋 SOC目标检查结果:');
        if (lossData.socTargetDetails.socTargetNote) {
          console.log(`  ${lossData.socTargetDetails.socTargetNote}`);
        }
        if (lossData.socTargetDetails.socTargetMet !== undefined) {
          console.log(`  SOC目标已达成: ${lossData.socTargetDetails.socTargetMet ? '是' : '否'}`);
        }
        console.log('');
      }

      // 分析具体原因
      console.log('🎯 原因分类:');
      if (lossData.socTargetDetails?.socTargetNote?.includes('已达到目标')) {
        console.log('  ✓ SOC达标 - 故障未影响充放电目标');
        console.log('  说明: 虽然故障发生在充放电周期内，但在周期结束时SOC达到了目标值');
        console.log('       因此系统判定该故障未对充放电过程造成实际影响，损失为0');
      } else if (lossData.calculationNote?.includes('排除时段')) {
        console.log('  ⊘ 排除时段 - 故障发生在17:00-23:59:59');
        console.log('  说明: 该时段不计算损失（根据业务规则）');
      } else if (lossData.calculationNote?.includes('待机周期')) {
        console.log('  ⊙ 待机周期 - 故障发生在待机期间');
        console.log('  说明: 待机周期内的故障不计算损失');
      } else if (lossData.calculationNote?.includes('未找到充放电策略')) {
        console.log('  ⚠ 无策略数据');
        console.log('  说明: 未找到该电站在该日期的充放电策略配置');
      } else if (lossData.calculationNote?.includes('故障不在充放电周期内')) {
        console.log('  ⊙ 非充放电周期');
        console.log('  说明: 故障发生时不在充电或放电周期内');
      } else {
        console.log('  ✓ 未产生损失');
        console.log('  说明: 其他原因导致未产生损失');
      }
    } else {
      console.log('✓ 该告警产生了损失');

      if (lossData.lossDetails && lossData.lossDetails.length > 0) {
        console.log('\n📊 损失详情:');
        lossData.lossDetails.forEach((detail, index) => {
          console.log(`  [${index + 1}] 时刻: ${detail.time}`);
          console.log(`      周期类型: ${detail.ctypeName}`);
          console.log(`      功率: ${detail.power} kW`);
          console.log(`      电价: ¥${detail.price}/kWh`);
        });
      }

      if (lossData.socTargetDetails?.socTargetNote) {
        console.log(`\n🔋 SOC目标: ${lossData.socTargetDetails.socTargetNote}`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
    await mongoose.connection.close();
  }
}

checkAlarmLossReason();
