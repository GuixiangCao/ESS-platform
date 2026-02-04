const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Alarm = require('../models/Alarm');
const {
  calculateAlarmLoss,
  calculateStationAlarmLosses,
  calculateLossByDevice
} = require('../services/alarmLossCalculator');

// Load environment variables
dotenv.config();

async function testAlarmLossCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试告警损失计算');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. 查看数据库中有哪些电站有告警数据
    console.log('📊 查询数据库中的告警数据...\n');

    const stationStats = await Alarm.aggregate([
      {
        $group: {
          _id: '$stationId',
          count: { $sum: 1 },
          minDate: { $min: '$alarmDate' },
          maxDate: { $max: '$alarmDate' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    if (stationStats.length === 0) {
      console.log('❌ 数据库中没有告警数据');
      console.log('请先导入告警数据: node importAlarms.js\n');
      return;
    }

    console.log(`找到 ${stationStats.length} 个电站的告警数据:\n`);
    stationStats.forEach(stat => {
      console.log(`电站 ${stat._id}:`);
      console.log(`  告警数量: ${stat.count}`);
      console.log(`  日期范围: ${stat.minDate.toISOString().split('T')[0]} 到 ${stat.maxDate.toISOString().split('T')[0]}\n`);
    });

    // 2. 选择第一个有数据的电站进行测试
    const testStation = stationStats[0];
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`测试电站 ${testStation._id} 的告警损失计算`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 3. 获取最近一天的告警
    const recentAlarm = await Alarm.findOne({ stationId: testStation._id })
      .sort({ alarmDate: -1 })
      .limit(1);

    if (!recentAlarm) {
      console.log('未找到告警数据');
      return;
    }

    console.log('📍 测试单个告警损失计算:\n');
    console.log(`告警 ID: ${recentAlarm.alarmId}`);
    console.log(`告警名称: ${recentAlarm.alarmName}`);
    console.log(`设备类型: ${recentAlarm.device}`);
    console.log(`开始时间: ${recentAlarm.startTime.toISOString()}`);
    console.log(`结束时间: ${recentAlarm.endTime.toISOString()}`);
    console.log(`持续时长: ${recentAlarm.durationMinutes} 分钟 (${(recentAlarm.durationMinutes / 60).toFixed(2)} 小时)\n`);

    // 计算单个告警损失
    const singleLoss = await calculateAlarmLoss(recentAlarm);

    console.log('计算结果:');
    console.log(`  损失金额: ¥${singleLoss.loss || 0}`);
    if (singleLoss.reason) {
      console.log(`  说明: ${singleLoss.reason}`);
    }
    if (singleLoss.error) {
      console.log(`  错误: ${singleLoss.error}`);
    }
    console.log('');

    // 4. 计算电站在测试日期前后7天的总损失
    const testDate = new Date(recentAlarm.alarmDate);
    const startDate = new Date(testDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(testDate);
    endDate.setDate(endDate.getDate() + 1);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`测试电站总损失计算（${startDate.toISOString().split('T')[0]} 至 ${endDate.toISOString().split('T')[0]}）`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stationLosses = await calculateStationAlarmLosses(
      testStation._id,
      startDate,
      endDate
    );

    console.log('统计结果:');
    console.log(`  告警总数: ${stationLosses.alarmCount}`);
    console.log(`  总损失: ¥${stationLosses.totalLoss || 0}`);
    console.log(`  平均损失: ¥${stationLosses.averageLossPerAlarm || 0}/次`);
    console.log(`  总时长: ${stationLosses.summary.totalDurationHours} 小时\n`);

    if (stationLosses.alarms && stationLosses.alarms.length > 0) {
      console.log('前 5 个告警详情:');
      stationLosses.alarms.slice(0, 5).forEach((alarm, index) => {
        console.log(`\n${index + 1}. ${alarm.alarmName}`);
        console.log(`   设备: ${alarm.device}`);
        console.log(`   时长: ${alarm.durationHours} 小时`);
        console.log(`   损失: ¥${alarm.loss || 0}`);
        if (alarm.reason) {
          console.log(`   说明: ${alarm.reason}`);
        }
      });
    }

    // 5. 按设备类型统计
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('按设备类型统计损失');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deviceLosses = await calculateLossByDevice(
      testStation._id,
      startDate,
      endDate
    );

    if (deviceLosses.deviceStats && deviceLosses.deviceStats.length > 0) {
      console.log('┌─────────────┬────────┬────────────┬────────────┬──────────┐');
      console.log('│   设备类型  │ 告警数 │  总损失(¥) │  平均损失  │  总时长  │');
      console.log('├─────────────┼────────┼────────────┼────────────┼──────────┤');

      deviceLosses.deviceStats.forEach(stat => {
        const device = stat.device.padEnd(10);
        const count = String(stat.count).padStart(6);
        const totalLoss = String(stat.totalLoss || 0).padStart(10);
        const avgLoss = String(stat.averageLoss || 0).padStart(10);
        const hours = String(stat.totalDurationHours).padStart(8);

        console.log(`│ ${device} │ ${count} │ ${totalLoss} │ ${avgLoss} │ ${hours}h │`);
      });

      console.log('└─────────────┴────────┴────────────┴────────────┴──────────┘');
    }

    console.log('\n✓ 测试完成！\n');

    // 6. 显示 API 使用示例
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API 使用示例');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. 计算电站告警总损失:');
    console.log(`   GET /api/alarms/station/${testStation._id}/losses?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}\n`);

    console.log('2. 按设备类型统计损失:');
    console.log(`   GET /api/alarms/station/${testStation._id}/losses/by-device?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}\n`);

    console.log('3. 计算单个告警损失:');
    console.log(`   GET /api/alarms/${recentAlarm.alarmId}/loss\n`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testAlarmLossCalculation();
