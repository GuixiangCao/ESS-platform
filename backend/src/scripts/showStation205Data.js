const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const SocData = require('../models/SocData');
const Device = require('../models/Device');
const dotenv = require('dotenv');

dotenv.config();

async function showStation205Data() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`电站205 - 2026年1月11日 数据完整报告\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. 查询电站信息
    console.log('【1】电站基本信息\n');

    const devices = await Device.find({ stationId: parseInt(stationId) });
    console.log(`电站ID: ${stationId}`);
    console.log(`设备总数: ${devices.length} 个\n`);

    if (devices.length > 0) {
      console.log('设备列表:');
      devices.forEach((device, idx) => {
        console.log(`  ${idx + 1}. ${device.deviceName || device.serialNumber}`);
        console.log(`     序列号: ${device.serialNumber}`);
        console.log(`     网关ID: ${device.gatewayId || 'N/A'}`);
        console.log(`     电站名: ${device.stationName || 'N/A'}`);
        console.log('');
      });
    }

    // 2. 查询告警数据（使用本地时区）
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('【2】告警数据\n');

    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log(`查询范围: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}\n`);

    const alarms = await Alarm.find({
      stationId: parseInt(stationId),
      alarmDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ startTime: 1 });

    console.log(`告警总数: ${alarms.length} 条\n`);

    if (alarms.length > 0) {
      // 按设备统计
      const deviceStats = {};
      alarms.forEach(alarm => {
        const device = alarm.device;
        if (!deviceStats[device]) {
          deviceStats[device] = { count: 0, names: new Set() };
        }
        deviceStats[device].count++;
        deviceStats[device].names.add(alarm.alarmName);
      });

      console.log('按设备类型统计:');
      Object.keys(deviceStats).forEach(device => {
        const stat = deviceStats[device];
        console.log(`  ${device.toUpperCase()}: ${stat.count} 条`);
        console.log(`    告警类型: ${Array.from(stat.names).join(', ')}`);
      });
      console.log('');

      // 显示所有告警详情
      console.log('告警详细列表:\n');
      alarms.forEach((alarm, idx) => {
        const startTime = new Date(alarm.startTime);
        const endTime = new Date(alarm.endTime);
        const startHour = startTime.getUTCHours();
        const startMinute = startTime.getUTCMinutes();
        const startSecond = startTime.getUTCSeconds();
        const endHour = endTime.getUTCHours();
        const endMinute = endTime.getUTCMinutes();
        const endSecond = endTime.getUTCSeconds();

        console.log(`${String(idx + 1).padStart(2, ' ')}. ${alarm.alarmName}`);
        console.log(`    设备: ${alarm.device.toUpperCase()}`);
        console.log(`    严重程度: ${alarm.severity}`);
        console.log(`    告警ID: ${alarm.alarmId}`);
        console.log(`    alarmDate: ${alarm.alarmDate.toISOString()}`);
        console.log(`    开始时间: ${startTime.toISOString()} (${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:${String(startSecond).padStart(2, '0')})`);
        console.log(`    结束时间: ${endTime.toISOString()} (${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:${String(endSecond).padStart(2, '0')})`);
        console.log(`    持续时间: ${alarm.durationMinutes.toFixed(2)} 分钟`);
        console.log('');
      });
    } else {
      console.log('该日期没有告警记录\n');
    }

    // 3. 查询SOC数据（使用UTC）
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('【3】SOC数据\n');

    const socStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const socEndOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    console.log(`查询范围: ${socStartOfDay.toISOString()} - ${socEndOfDay.toISOString()}\n`);

    const socData = await SocData.find({
      stationId: parseInt(stationId),
      timestamp: {
        $gte: socStartOfDay,
        $lt: socEndOfDay
      }
    }).sort({ timestamp: 1 });

    console.log(`SOC记录总数: ${socData.length} 条\n`);

    if (socData.length > 0) {
      // 按设备统计
      const deviceSocStats = {};
      socData.forEach(record => {
        const deviceId = record.deviceId;
        if (!deviceSocStats[deviceId]) {
          deviceSocStats[deviceId] = {
            count: 0,
            minSoc: 100,
            maxSoc: 0,
            avgSoc: 0,
            sumSoc: 0
          };
        }
        deviceSocStats[deviceId].count++;
        deviceSocStats[deviceId].minSoc = Math.min(deviceSocStats[deviceId].minSoc, record.soc);
        deviceSocStats[deviceId].maxSoc = Math.max(deviceSocStats[deviceId].maxSoc, record.soc);
        deviceSocStats[deviceId].sumSoc += record.soc;
      });

      console.log('按设备统计:');
      Object.keys(deviceSocStats).sort().forEach(deviceId => {
        const stat = deviceSocStats[deviceId];
        stat.avgSoc = stat.sumSoc / stat.count;

        // 找到设备名称
        const device = devices.find(d => d.deviceId === deviceId);
        const deviceName = device ? device.deviceName : deviceId.substring(0, 30);

        console.log(`  ${deviceName}`);
        console.log(`    设备ID: ${deviceId}`);
        console.log(`    记录数: ${stat.count} 条`);
        console.log(`    SOC范围: ${stat.minSoc.toFixed(1)}% - ${stat.maxSoc.toFixed(1)}%`);
        console.log(`    平均SOC: ${stat.avgSoc.toFixed(1)}%`);
        console.log('');
      });

      // 每小时数据量统计
      console.log('每小时SOC数据量分布:\n');
      const hourlyStats = {};
      for (let h = 0; h < 24; h++) {
        hourlyStats[h] = 0;
      }

      socData.forEach(record => {
        const hour = record.timestamp.getUTCHours();
        hourlyStats[hour]++;
      });

      for (let h = 0; h < 24; h++) {
        const count = hourlyStats[h];
        const bar = '█'.repeat(Math.min(Math.floor(count / 20), 50));
        console.log(`  ${String(h).padStart(2, '0')}:00 - ${String(count).padStart(4, ' ')} 条 ${bar}`);
      }
      console.log('');

      // 显示前10条和后10条SOC数据
      console.log('前10条SOC数据:\n');
      socData.slice(0, 10).forEach((record, idx) => {
        const hour = record.timestamp.getUTCHours();
        const minute = record.timestamp.getUTCMinutes();
        const second = record.timestamp.getUTCSeconds();
        const device = devices.find(d => d.deviceId === record.deviceId);
        const deviceName = device ? device.deviceName : record.deviceId.substring(0, 30);

        console.log(`${idx + 1}. ${record.timestamp.toISOString()} (${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')})`);
        console.log(`   设备: ${deviceName}`);
        console.log(`   SOC: ${record.soc.toFixed(1)}%`);
        console.log('');
      });

      console.log('后10条SOC数据:\n');
      socData.slice(-10).forEach((record, idx) => {
        const hour = record.timestamp.getUTCHours();
        const minute = record.timestamp.getUTCMinutes();
        const second = record.timestamp.getUTCSeconds();
        const device = devices.find(d => d.deviceId === record.deviceId);
        const deviceName = device ? device.deviceName : record.deviceId.substring(0, 30);

        console.log(`${socData.length - 10 + idx + 1}. ${record.timestamp.toISOString()} (${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')})`);
        console.log(`   设备: ${deviceName}`);
        console.log(`   SOC: ${record.soc.toFixed(1)}%`);
        console.log('');
      });
    } else {
      console.log('该日期没有SOC记录\n');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('报告生成完成\n');

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

showStation205Data();
