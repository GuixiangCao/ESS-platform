const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const alarmLossCalculator = require('../src/services/alarmLossCalculator');
const fs = require('fs');
const path = require('path');

async function exportAllAlarms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const stationId = 287;
    const date = '2025-12-26';

    console.log('正在获取告警数据...\n');

    const result = await alarmLossCalculator.calculateStationAlarmLosses(
      stationId,
      date,
      date,
      undefined,
      undefined,
      undefined
    );

    console.log('═'.repeat(100));
    console.log(`电站 ${stationId} - ${date} 所有告警详情 (共${result.alarmCount}个)`);
    console.log('═'.repeat(100));
    console.log();
    console.log(`总损失（已去重）: ¥${result.totalLoss.toFixed(2)}`);
    console.log(`单独计算损失总和: ¥${result.alarms.reduce((sum, a) => sum + (a.loss || 0), 0).toFixed(2)}`);
    console.log();
    console.log('═'.repeat(100));
    console.log();

    // 准备CSV数据
    const csvLines = [];
    csvLines.push('序号,告警ID,设备类型,告警名称,开始时间(北京),结束时间(北京),持续时长(分钟),持续时长(小时),损失(元),网关设备ID,是否节假日');

    // 按损失从大到小排序
    const sortedAlarms = [...result.alarms].sort((a, b) => (b.loss || 0) - (a.loss || 0));

    // 控制台输出（分页显示）
    const pageSize = 20;
    let currentPage = 0;

    console.log('按损失排序的告警列表:\n');
    console.log('─'.repeat(100));
    console.log('序号  设备  告警ID(前8位)  开始时间(北京)        结束时间(北京)        时长(分) 时长(小时) 损失(元)');
    console.log('─'.repeat(100));

    sortedAlarms.forEach((alarm, index) => {
      const start = new Date(alarm.startTime);
      const end = new Date(alarm.endTime);

      // 转换为北京时间
      const startBJ = new Date(start.getTime() + 8*60*60*1000)
        .toISOString().replace('T', ' ').substring(0, 19);
      const endBJ = new Date(end.getTime() + 8*60*60*1000)
        .toISOString().replace('T', ' ').substring(0, 19);

      const durationHours = (alarm.durationMinutes / 60).toFixed(2);
      const loss = (alarm.loss || 0).toFixed(2);

      // 控制台输出
      console.log(
        `${(index + 1).toString().padStart(4)}  ` +
        `${alarm.device.padEnd(6)}` +
        `${alarm.alarmId.substring(0, 8).padEnd(16)}` +
        `${startBJ}  ` +
        `${endBJ}  ` +
        `${alarm.durationMinutes.toFixed(2).padStart(9)}  ` +
        `${durationHours.padStart(10)}  ` +
        `${loss.padStart(10)}`
      );

      // 每20行显示一个分隔符
      if ((index + 1) % pageSize === 0 && index < sortedAlarms.length - 1) {
        console.log('─'.repeat(100));
      }

      // CSV数据
      csvLines.push([
        index + 1,
        alarm.alarmId,
        alarm.device,
        alarm.alarmName || '',
        startBJ,
        endBJ,
        alarm.durationMinutes.toFixed(2),
        durationHours,
        loss,
        alarm.gatewayDeviceId || '',
        alarm.isHoliday ? '是' : '否'
      ].join(','));
    });

    console.log('─'.repeat(100));
    console.log();

    // 统计信息
    console.log('统计汇总:');
    console.log('─'.repeat(100));

    const deviceGroups = {};
    sortedAlarms.forEach(alarm => {
      if (!deviceGroups[alarm.device]) {
        deviceGroups[alarm.device] = {
          count: 0,
          totalLoss: 0,
          totalDuration: 0
        };
      }
      deviceGroups[alarm.device].count++;
      deviceGroups[alarm.device].totalLoss += alarm.loss || 0;
      deviceGroups[alarm.device].totalDuration += alarm.durationMinutes || 0;
    });

    console.log('\n按设备统计:');
    console.log('设备类型    数量    单独计算损失    平均损失    总时长(小时)');
    console.log('─'.repeat(100));
    Object.keys(deviceGroups).sort().forEach(device => {
      const stat = deviceGroups[device];
      console.log(
        `${device.padEnd(12)}` +
        `${stat.count.toString().padEnd(8)}` +
        `¥${stat.totalLoss.toFixed(2).padEnd(16)}` +
        `¥${(stat.totalLoss/stat.count).toFixed(2).padEnd(12)}` +
        `${(stat.totalDuration/60).toFixed(2)}`
      );
    });

    // 保存CSV文件
    const csvContent = csvLines.join('\n');
    const outputDir = path.join(__dirname, '..', '..', 'output');

    // 创建output目录（如果不存在）
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const csvFilePath = path.join(outputDir, `station287_alarms_${date}.csv`);
    fs.writeFileSync(csvFilePath, '\ufeff' + csvContent, 'utf8'); // 添加BOM以支持Excel中文

    console.log();
    console.log('═'.repeat(100));
    console.log(`✅ CSV文件已导出: ${csvFilePath}`);
    console.log('═'.repeat(100));

    // 导出JSON格式（详细信息）
    const jsonData = {
      stationId: stationId,
      date: date,
      summary: {
        totalAlarms: result.alarmCount,
        workdayAlarms: result.workdayAlarmCount,
        holidayAlarms: result.holidayAlarmCount,
        totalLoss: result.totalLoss,
        workdayLoss: result.summary.workdayLoss,
        individualLossSum: result.alarms.reduce((sum, a) => sum + (a.loss || 0), 0)
      },
      alarms: sortedAlarms.map((alarm, index) => ({
        序号: index + 1,
        告警ID: alarm.alarmId,
        设备类型: alarm.device,
        告警名称: alarm.alarmName,
        开始时间UTC: alarm.startTime,
        结束时间UTC: alarm.endTime,
        开始时间北京: new Date(new Date(alarm.startTime).getTime() + 8*60*60*1000).toISOString(),
        结束时间北京: new Date(new Date(alarm.endTime).getTime() + 8*60*60*1000).toISOString(),
        持续时长分钟: alarm.durationMinutes,
        持续时长小时: alarm.durationMinutes / 60,
        损失元: alarm.loss,
        网关设备ID: alarm.gatewayDeviceId,
        是否节假日: alarm.isHoliday
      })),
      deviceStats: Object.keys(deviceGroups).map(device => ({
        设备类型: device,
        告警数量: deviceGroups[device].count,
        单独计算损失: deviceGroups[device].totalLoss,
        平均损失: deviceGroups[device].totalLoss / deviceGroups[device].count,
        总时长小时: deviceGroups[device].totalDuration / 60
      }))
    };

    const jsonFilePath = path.join(outputDir, `station287_alarms_${date}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log(`✅ JSON文件已导出: ${jsonFilePath}`);
    console.log('═'.repeat(100));

    await mongoose.connection.close();
  } catch (error) {
    console.error('导出失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

exportAllAlarms();
