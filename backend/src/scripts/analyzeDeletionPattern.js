const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function findSimilarDeletionPattern() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('分析去重逻辑和被删除告警的模式\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. 查询电站205的所有告警，看是否有其他日期的该ID
    console.log('【1】在整个数据库中搜索该告警ID的任何痕迹:\n');

    const deletedId = '35917343-fec5-468e-85e8-5fd7ad334533';

    // 检查是否有任何记录（包括部分匹配）
    const partialMatch = await Alarm.find({
      $or: [
        { alarmId: { $regex: '35917343', $options: 'i' } },
        { alarmId: { $regex: 'fec5-468e', $options: 'i' } }
      ]
    });

    if (partialMatch.length > 0) {
      console.log(`找到 ${partialMatch.length} 条部分匹配的记录:`);
      partialMatch.forEach(a => {
        console.log(`  - ${a.alarmId}`);
        console.log(`    电站: ${a.stationId}, 时间: ${a.startTime.toISOString()}`);
      });
      console.log('');
    } else {
      console.log('✗ 数据库中完全没有该ID的任何记录\n');
      console.log('这说明该告警已被彻底删除。\n');
    }

    // 2. 重现去重脚本的逻辑
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【2】重现去重脚本的业务逻辑:\n');

    // 查询电站205在1月11日的告警（包括已删除前的状态）
    // 由于我们运行了去重，现在只能看到剩余的3条
    const station205Alarms = await Alarm.find({
      stationId: 205,
      startTime: {
        $gte: new Date('2026-01-11T11:00:00.000Z'),
        $lt: new Date('2026-01-11T12:00:00.000Z')
      }
    }).sort({ startTime: 1, createdAt: 1 });

    console.log(`当前数据库中11:00-12:00的告警: ${station205Alarms.length} 条\n`);

    // 按业务逻辑分组（电站+设备+告警名称+时间精确到秒）
    const businessGroups = {};

    station205Alarms.forEach(alarm => {
      const startTimeSecond = new Date(alarm.startTime);
      startTimeSecond.setMilliseconds(0);
      const businessKey = `${alarm.stationId}_${alarm.device}_${alarm.alarmName}_${startTimeSecond.toISOString()}`;

      if (!businessGroups[businessKey]) {
        businessGroups[businessKey] = [];
      }
      businessGroups[businessKey].push(alarm);
    });

    console.log('按业务键分组（精确到秒）:');
    Object.keys(businessGroups).forEach((key, idx) => {
      const group = businessGroups[key];
      console.log(`\n分组 ${idx + 1}: ${key}`);
      console.log(`  包含 ${group.length} 条告警:`);
      group.forEach((a, i) => {
        console.log(`    ${i + 1}. ${a.alarmId.substring(0, 8)}...`);
        console.log(`       startTime: ${a.startTime.toISOString()}`);
        console.log(`       createdAt: ${a.createdAt ? a.createdAt.toISOString() : 'N/A'}`);
      });
    });
    console.log('');

    // 3. 分析原始4条告警的时间特征
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【3】分析原始4条告警的可能重复模式:\n');

    const originalIds = [
      'e0a39f85-94a4-435c-b53f-413e49370b43',
      '35917343-fec5-468e-85e8-5fd7ad334533', // 已删除
      '90b4e568-fe22-4433-af39-6eb364c6a52f',
      '07548f01-61ee-40f4-af6c-ed4160ead363'
    ];

    console.log('原始4条告警的时间分布：');
    console.log('  1. e0a39f85... - 11:55:37 ✓ 保留');
    console.log('  2. 35917343... - ？？？？？ ✗ 已删除');
    console.log('  3. 90b4e568... - 11:55:38 ✓ 保留');
    console.log('  4. 07548f01... - 11:55:46 ✓ 保留\n');

    console.log('基于去重脚本的业务逻辑（电站+设备+名称+时间）:');
    console.log('  - 如果第2条的startTime与1/3/4中任何一条相同（精确到秒）');
    console.log('  - 且它们的设备、名称也相同');
    console.log('  - 则去重脚本会保留createdAt更早的那条\n');

    // 4. 检查是否有同秒的告警被删除
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【4】推断被删除告警的可能时间:\n');

    const remainingTimes = [
      new Date('2026-01-11T11:55:37.000Z'),
      new Date('2026-01-11T11:55:38.000Z'),
      new Date('2026-01-11T11:55:46.000Z')
    ];

    console.log('推断：被删除的告警可能的startTime是以下之一：');
    remainingTimes.forEach((time, idx) => {
      console.log(`  可能 ${idx + 1}: ${time.toISOString()}`);
      console.log(`    与现存告警 ${originalIds[idx === 0 ? 0 : (idx === 1 ? 2 : 3)].substring(0, 8)}... 时间相同（精确到秒）`);
    });
    console.log('\n或者是一个新的时间点，但与上述某个时间在业务逻辑上被认为是重复。\n');

    // 5. 查询所有电站205的告警创建时间分布
    console.log('═══════════════════════════════════════════════════\n');
    console.log('【5】查询电站205所有告警的创建时间分布:\n');

    const allStation205 = await Alarm.find({ stationId: 205 }).sort({ createdAt: 1 });

    const createdAtGroups = {};
    allStation205.forEach(a => {
      if (a.createdAt) {
        const dateKey = a.createdAt.toISOString().split('T')[0];
        createdAtGroups[dateKey] = (createdAtGroups[dateKey] || 0) + 1;
      }
    });

    console.log('按创建日期统计:');
    Object.keys(createdAtGroups).sort().forEach(date => {
      console.log(`  ${date}: ${createdAtGroups[date]} 条`);
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════\n');
    console.log('【结论】\n');
    console.log(`告警ID ${deletedId} 已被删除，原因：\n`);
    console.log('1. 该告警ID在数据库中完全找不到了');
    console.log('2. 去重脚本使用的业务键是: 电站+设备+告警名称+开始时间（精确到秒）');
    console.log('3. 如果被删除的告警与剩余3条中任何一条有相同的业务键');
    console.log('   且它的createdAt时间较晚，则会被删除\n');
    console.log('4. 从现有数据看，剩余的3条告警都创建于 2026-01-16T02:59:59.215Z');
    console.log('   说明被删除的那条告警的createdAt应该晚于这个时间\n');
    console.log('5. 由于该告警已被删除，无法查看其在其他日期的数据\n');

  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

findSimilarDeletionPattern();
