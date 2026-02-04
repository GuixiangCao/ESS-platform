const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function testSocAlarmQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log(`测试SOC Controller的告警查询逻辑\n`);
    console.log(`电站: ${stationId}, 日期: ${dateStr}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 使用修改后的查询方法（使用 alarmDate）
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log('查询条件:');
    console.log(`  stationId: ${stationId}`);
    console.log(`  alarmDate >= ${startOfDay.toISOString()}`);
    console.log(`  alarmDate < ${endOfDay.toISOString()}\n`);

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`查询结果: ${alarms.length} 条告警\n`);

    if (alarms.length > 0) {
      console.log('告警详情:\n');
      alarms.forEach((alarm, idx) => {
        const startTime = new Date(alarm.startTime);
        const endTime = new Date(alarm.endTime);

        console.log(`${idx + 1}. ${alarm.alarmName}`);
        console.log(`   设备: ${alarm.device}`);
        console.log(`   alarmDate: ${alarm.alarmDate.toISOString()}`);
        console.log(`   startTime: ${startTime.toISOString()} (${startTime.getUTCHours()}:${String(startTime.getUTCMinutes()).padStart(2, '0')})`);
        console.log(`   endTime: ${endTime.toISOString()} (${endTime.getUTCHours()}:${String(endTime.getUTCMinutes()).padStart(2, '0')})`);
        console.log(`   持续时间: ${alarm.durationMinutes} 分钟`);
        console.log('');
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('前端显示预览 (ReferenceArea标记):\n');
      alarms.forEach((alarm, idx) => {
        const startTime = new Date(alarm.startTime);
        const endTime = new Date(alarm.endTime);
        const startHour = startTime.getUTCHours();
        const endHour = endTime.getUTCHours();
        const startLabel = `${String(startHour).padStart(2, '0')}:00`;
        const endLabel = `${String(endHour).padStart(2, '0')}:00`;

        console.log(`  故障${idx + 1}: ${alarm.alarmName}`);
        console.log(`    时段: ${startLabel} - ${endLabel}`);
        console.log(`    红色区域: x1="${startLabel}", x2="${endLabel}"`);
        console.log('');
      });
    } else {
      console.log('该日期没有告警数据');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✓ 查询成功！使用 alarmDate 字段与损失分析页面保持一致\n');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testSocAlarmQuery();
