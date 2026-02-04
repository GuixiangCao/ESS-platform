/**
 * 检查SOC目标损失对各天数据的影响
 * 用于对比新算法前后的损失差异
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const SocData = require('../models/SocData');
const ChargingStrategy = require('../models/ChargingStrategy');
const StationGateway = require('../models/StationGateway');
const { calculateStationAlarmLosses } = require('../services/alarmLossCalculator');

async function checkSocTargetLossImpact() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('检查SOC目标损失影响的日期');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 获取用户输入的电站ID（默认231）
    const stationId = parseInt(process.argv[2]) || 231;
    console.log(`电站ID: ${stationId}\n`);

    // 查找该电站的所有告警
    const alarms = await Alarm.find({ stationId }).sort({ startTime: 1 });

    if (alarms.length === 0) {
      console.log('未找到任何告警数据');
      return;
    }

    console.log(`找到 ${alarms.length} 条告警记录\n`);

    // 按日期分组
    const alarmsByDate = {};
    alarms.forEach(alarm => {
      const date = new Date(alarm.startTime);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];

      if (!alarmsByDate[dateKey]) {
        alarmsByDate[dateKey] = [];
      }
      alarmsByDate[dateKey].push(alarm);
    });

    // 检查每个日期
    const results = [];

    for (const dateKey of Object.keys(alarmsByDate).sort()) {
      const date = new Date(dateKey);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      console.log(`\n检查日期: ${dateKey}`);
      console.log('─'.repeat(60));

      // 计算该日的所有告警损失（包含SOC目标损失）
      const lossData = await calculateStationAlarmLosses(
        stationId,
        date,
        nextDay
      );

      // 统计该日的损失情况
      let totalTimeLoss = 0;
      let totalSocTargetLoss = 0;
      let affectedAlarms = [];

      lossData.alarms.forEach(alarm => {
        const timeLoss = alarm.timeLoss || 0;
        const socTargetLoss = alarm.socTargetLoss || 0;

        totalTimeLoss += timeLoss;
        totalSocTargetLoss += socTargetLoss;

        if (socTargetLoss > 0) {
          affectedAlarms.push({
            alarmId: alarm.alarmId,
            device: alarm.device,
            startTime: alarm.startTime,
            timeLoss,
            socTargetLoss,
            totalLoss: alarm.loss,
            note: alarm.socTargetDetails?.socTargetNote
          });
        }
      });

      const hasChange = totalSocTargetLoss > 0;
      const changeSymbol = hasChange ? '✅ 有变化' : '⚪ 无变化';

      console.log(`告警数量: ${lossData.alarmCount}`);
      console.log(`时间损失: ¥${totalTimeLoss.toFixed(2)}`);
      console.log(`SOC目标损失: ¥${totalSocTargetLoss.toFixed(2)}`);
      console.log(`总损失: ¥${lossData.totalLoss.toFixed(2)}`);
      console.log(`状态: ${changeSymbol}`);

      if (hasChange) {
        console.log(`\n受影响的告警 (${affectedAlarms.length}条):`);
        affectedAlarms.forEach((alarm, idx) => {
          console.log(`  ${idx + 1}. 告警ID: ${alarm.alarmId}`);
          console.log(`     设备: ${alarm.device}`);
          console.log(`     开始时间: ${new Date(alarm.startTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
          console.log(`     时间损失: ¥${alarm.timeLoss.toFixed(2)}`);
          console.log(`     SOC目标损失: ¥${alarm.socTargetLoss.toFixed(2)} (新增)`);
          console.log(`     总损失: ¥${alarm.totalLoss.toFixed(2)}`);
          console.log(`     说明: ${alarm.note}`);
          console.log('');
        });
      }

      results.push({
        date: dateKey,
        alarmCount: lossData.alarmCount,
        timeLoss: totalTimeLoss,
        socTargetLoss: totalSocTargetLoss,
        totalLoss: lossData.totalLoss,
        hasChange,
        affectedCount: affectedAlarms.length
      });
    }

    // 汇总统计
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('汇总统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalDays = results.length;
    const changedDays = results.filter(r => r.hasChange).length;
    const unchangedDays = totalDays - changedDays;

    const totalTimeLossAll = results.reduce((sum, r) => sum + r.timeLoss, 0);
    const totalSocLossAll = results.reduce((sum, r) => sum + r.socTargetLoss, 0);
    const totalLossAll = results.reduce((sum, r) => sum + r.totalLoss, 0);

    console.log(`总天数: ${totalDays}`);
    console.log(`有变化的天数: ${changedDays} (${((changedDays/totalDays)*100).toFixed(1)}%)`);
    console.log(`无变化的天数: ${unchangedDays} (${((unchangedDays/totalDays)*100).toFixed(1)}%)`);
    console.log('');
    console.log(`总时间损失: ¥${totalTimeLossAll.toFixed(2)}`);
    console.log(`总SOC目标损失: ¥${totalSocLossAll.toFixed(2)} (新增)`);
    console.log(`总损失: ¥${totalLossAll.toFixed(2)}`);
    console.log('');
    console.log(`损失增加比例: ${totalTimeLossAll > 0 ? ((totalSocLossAll/totalTimeLossAll)*100).toFixed(1) : 0}%`);

    // 显示有变化的日期列表
    if (changedDays > 0) {
      console.log('\n有变化的日期明细:');
      console.log('─'.repeat(80));
      console.log('日期         告警数  时间损失    SOC目标损失  总损失      受影响告警');
      console.log('─'.repeat(80));

      results
        .filter(r => r.hasChange)
        .forEach(r => {
          console.log(
            `${r.date}  ${String(r.alarmCount).padStart(4)}    ` +
            `¥${String(r.timeLoss.toFixed(2)).padStart(8)}  ` +
            `¥${String(r.socTargetLoss.toFixed(2)).padStart(10)}  ` +
            `¥${String(r.totalLoss.toFixed(2)).padStart(8)}  ` +
            `${r.affectedCount}条`
          );
        });
    }

    console.log('\n✅ 检查完成！\n');

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 运行检查
checkSocTargetLossImpact();
