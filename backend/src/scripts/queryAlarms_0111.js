const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function queryAlarms_0111() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('查询2026-01-11的所有告警数据\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 构建日期范围（本地时区）
    const dateStr = '2026-01-11';
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log('查询条件:');
    console.log(`  日期: ${dateStr}`);
    console.log(`  startOfDay: ${startOfDay.toISOString()}`);
    console.log(`  endOfDay: ${endOfDay.toISOString()}\n`);

    // 查询所有电站在1.11的告警
    const alarms = await Alarm.find({
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ stationId: 1, startTime: 1 });

    console.log(`找到 ${alarms.length} 条告警记录\n`);

    if (alarms.length === 0) {
      console.log('没有找到告警数据');
      return;
    }

    // 按电站统计
    const stationStats = {};
    alarms.forEach(alarm => {
      if (!stationStats[alarm.stationId]) {
        stationStats[alarm.stationId] = {
          count: 0,
          devices: new Set(),
          alarmNames: new Set()
        };
      }
      stationStats[alarm.stationId].count++;
      stationStats[alarm.stationId].devices.add(alarm.device);
      stationStats[alarm.stationId].alarmNames.add(alarm.alarmName);
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('按电站统计:\n');

    Object.keys(stationStats).sort((a, b) => a - b).forEach(stationId => {
      const stat = stationStats[stationId];
      console.log(`电站 ${stationId}:`);
      console.log(`  告警数: ${stat.count} 条`);
      console.log(`  设备类型: ${Array.from(stat.devices).join(', ')}`);
      console.log(`  告警类型: ${Array.from(stat.alarmNames).slice(0, 3).join(', ')}${stat.alarmNames.size > 3 ? '...' : ''}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('前20条告警详情:\n');

    alarms.slice(0, 20).forEach((alarm, idx) => {
      const startTime = new Date(alarm.startTime);
      const endTime = new Date(alarm.endTime);
      const startHour = startTime.getUTCHours();
      const startMinute = startTime.getUTCMinutes();
      const endHour = endTime.getUTCHours();
      const endMinute = endTime.getUTCMinutes();

      console.log(`${String(idx + 1).padStart(2, ' ')}. 电站${alarm.stationId} - ${alarm.alarmName}`);
      console.log(`    告警ID: ${alarm.alarmId}`);
      console.log(`    设备: ${alarm.device.toUpperCase()}`);
      console.log(`    严重程度: ${alarm.severity}`);
      console.log(`    时间: ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
      console.log(`    持续: ${alarm.durationMinutes.toFixed(2)} 分钟`);
      console.log('');
    });

    // 导出为JSON格式（可选）
    console.log('═══════════════════════════════════════════════════\n');
    console.log('MongoDB查询语句（可在MongoDB Compass或Shell中使用）:\n');
    console.log(JSON.stringify({
      alarmDate: {
        $gte: { $date: startOfDay.toISOString() },
        $lt: { $date: endOfDay.toISOString() }
      }
    }, null, 2));
    console.log('\n');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

queryAlarms_0111();
