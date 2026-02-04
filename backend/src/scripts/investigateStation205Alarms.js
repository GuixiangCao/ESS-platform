const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function investigateStation205Alarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('调查电站205的告警数据来源\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 原始的4条告警ID
    const originalAlarmIds = [
      'e0a39f85-94a4-435c-b53f-413e49370b43',
      '35917343-fec5-468e-85e8-5fd7ad334533',
      '90b4e568-fe22-4433-af39-6eb364c6a52f',
      '07548f01-61ee-40f4-af6c-ed4160ead363'
    ];

    console.log('【1】原始的4条告警详情:\n');

    for (const alarmId of originalAlarmIds) {
      const alarm = await Alarm.findOne({ alarmId });
      if (alarm) {
        console.log(`告警ID: ${alarm.alarmId}`);
        console.log(`  告警名称: ${alarm.alarmName}`);
        console.log(`  电站: ${alarm.stationId}`);
        console.log(`  alarmDate: ${alarm.alarmDate.toISOString()}`);
        console.log(`  startTime: ${alarm.startTime.toISOString()}`);
        console.log(`  endTime: ${alarm.endTime.toISOString()}`);
        console.log(`  创建时间: ${alarm.createdAt ? alarm.createdAt.toISOString() : 'N/A'}`);
        console.log('');
      } else {
        console.log(`⚠️ 未找到告警: ${alarmId}\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【2】查询电站205在2026-01-11的所有告警:\n');

    const dateStr = '2026-01-11';
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const allAlarms = await Alarm.find({
      stationId: 205,
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`查询结果: ${allAlarms.length} 条告警\n`);

    // 检查原始4条是否在查询结果中
    const foundOriginals = allAlarms.filter(a => originalAlarmIds.includes(a.alarmId));
    const newAlarms = allAlarms.filter(a => !originalAlarmIds.includes(a.alarmId));

    console.log(`原始4条告警在查询结果中: ${foundOriginals.length} 条`);
    console.log(`新增的告警: ${newAlarms.length} 条\n`);

    if (newAlarms.length > 0) {
      console.log('═══════════════════════════════════════════════════\n');
      console.log('【3】新增的告警详情（这些告警ID不在原始4条中）:\n');

      newAlarms.forEach((alarm, idx) => {
        const startDateStr = alarm.startTime.toISOString().split('T')[0];
        const alarmDateStr = alarm.alarmDate.toISOString().split('T')[0];

        console.log(`${idx + 1}. 告警ID: ${alarm.alarmId}`);
        console.log(`   告警名称: ${alarm.alarmName}`);
        console.log(`   alarmDate: ${alarm.alarmDate.toISOString()} (${alarmDateStr})`);
        console.log(`   startTime: ${alarm.startTime.toISOString()} (${startDateStr})`);
        console.log(`   日期是否一致: ${alarmDateStr === startDateStr ? '✓ 一致' : '✗ 不一致'}`);
        console.log(`   创建时间: ${alarm.createdAt ? alarm.createdAt.toISOString() : 'N/A'}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【4】检查这些新增告警的startTime是否在1月11日:\n');

    const alarmsWithStartTimeOn11 = newAlarms.filter(alarm => {
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      return startDateStr === '2026-01-11';
    });

    const alarmsWithStartTimeNot11 = newAlarms.filter(alarm => {
      const startDateStr = alarm.startTime.toISOString().split('T')[0];
      return startDateStr !== '2026-01-11';
    });

    console.log(`startTime在2026-01-11的: ${alarmsWithStartTimeOn11.length} 条`);
    console.log(`startTime不在2026-01-11的: ${alarmsWithStartTimeNot11.length} 条\n`);

    if (alarmsWithStartTimeNot11.length > 0) {
      console.log('startTime不在2026-01-11的告警详情:');
      alarmsWithStartTimeNot11.forEach(alarm => {
        const startDateStr = alarm.startTime.toISOString().split('T')[0];
        console.log(`  - ${alarm.alarmId.substring(0, 8)}...`);
        console.log(`    startTime日期: ${startDateStr}`);
        console.log(`    告警名称: ${alarm.alarmName}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【5】结论:\n');

    if (newAlarms.length > 0 && alarmsWithStartTimeOn11.length > 0) {
      console.log('⚠️ 发现问题：');
      console.log(`  - 有 ${alarmsWithStartTimeOn11.length} 条告警的startTime确实在2026-01-11`);
      console.log(`  - 但这些告警ID不在原始的4条中`);
      console.log(`  - 可能的原因：`);
      console.log(`    1. fixInconsistentAlarmDates.js脚本修改了这些告警的alarmDate`);
      console.log(`    2. 这些告警原本的alarmDate可能是其他日期`);
      console.log(`    3. 脚本根据startTime重新计算了alarmDate，导致它们被归入1月11日\n`);
    }

    // 查询所有电站205的告警，看看原本这些告警的alarmDate分布
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【6】电站205所有告警的alarmDate分布:\n');

    const allStation205Alarms = await Alarm.find({ stationId: 205 }).sort({ alarmDate: 1 });
    const dateDistribution = {};

    allStation205Alarms.forEach(alarm => {
      const dateKey = alarm.alarmDate.toISOString().split('T')[0];
      if (!dateDistribution[dateKey]) {
        dateDistribution[dateKey] = [];
      }
      dateDistribution[dateKey].push(alarm.alarmId);
    });

    Object.keys(dateDistribution).sort().forEach(dateKey => {
      const count = dateDistribution[dateKey].length;
      const highlight = dateKey === '2026-01-11' ? ' ⬅ 当前查询日期' : '';
      console.log(`  ${dateKey}: ${count} 条${highlight}`);
    });

  } catch (error) {
    console.error('调查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭\n');
  }
}

investigateStation205Alarms();
