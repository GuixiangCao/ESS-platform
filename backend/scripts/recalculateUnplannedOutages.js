const mongoose = require('mongoose');
const SocData = require('../src/models/SocData');
const StationRevenue = require('../src/models/StationRevenue');
const Holiday = require('../src/models/Holiday');
require('dotenv').config();

/**
 * 重新计算指定电站和日期范围的非计划性停机损失
 * 非计划性停机定义：工作日SOC波动小于1%（无充放电）
 */
async function recalculateUnplannedOutages() {
  try {
    // 配置参数（可通过命令行参数传入）
    const stationId = process.argv[2] ? parseInt(process.argv[2]) : 276;
    const startDate = process.argv[3] || '2025-12-01';
    const endDate = process.argv[4] || '2025-12-31';

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到数据库\n');

    console.log('📊 重新计算非计划性停机损失');
    console.log('=' .repeat(100));
    console.log(`电站ID: ${stationId}`);
    console.log(`日期范围: ${startDate} - ${endDate}\n`);

    // 1. 生成日期范围内的所有日期
    const dates = [];
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T00:00:00.000Z');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    console.log(`生成日期数: ${dates.length} 天\n`);

    // 2. 查询节假日（用于统计信息）
    const holidayMap = await Holiday.checkHolidayDates(dates);
    const holidays = dates.filter(date => holidayMap[date]);
    const workdays = dates.filter(date => !holidayMap[date]);

    console.log(`节假日数: ${holidays.length} 天`);
    console.log(`工作日数: ${workdays.length} 天`);
    console.log(`⚠️  注意：非计划性停机优先级高于节假日，所有无充放电日期都将被统计\n`);

    // 3. 对所有日期（包括节假日）分析SOC数据，找出无充放电的日期
    console.log('🔍 分析所有日期的SOC数据（包括节假日）...\n');
    const noChargingDays = [];
    let processedCount = 0;

    for (const dateStr of dates) {
      processedCount++;
      process.stdout.write(`\r进度: ${processedCount}/${dates.length} (${(processedCount / dates.length * 100).toFixed(1)}%)`);

      // 将北京时间日期转换为UTC时间范围
      const [year, month, day] = dateStr.split('-').map(Number);
      const bjStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const bjEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const socRecords = await SocData.aggregate([
        {
          $match: {
            stationId: parseInt(stationId),
            timestamp: {
              $gte: bjStartOfDay,
              $lte: bjEndOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            minSoc: { $min: '$soc' },
            maxSoc: { $max: '$soc' },
            dataPoints: { $sum: 1 }
          }
        }
      ]);

      if (socRecords.length > 0) {
        const stats = socRecords[0];
        const socRange = stats.maxSoc - stats.minSoc;

        // 判断是否无充放电：SOC波动小于1%
        if (socRange < 1) {
          const isHoliday = holidayMap[dateStr];
          noChargingDays.push({
            date: dateStr,
            minSoc: stats.minSoc,
            maxSoc: stats.maxSoc,
            socRange: socRange,
            dataPoints: stats.dataPoints,
            isHoliday: isHoliday
          });
        }
      }
    }

    console.log('\n');
    console.log('=' .repeat(100));
    console.log(`\n✅ SOC数据分析完成`);
    console.log(`   - 总天数: ${dates.length} 天`);
    console.log(`   - 无充放电的天数: ${noChargingDays.length} 天`);
    console.log(`   - 其中工作日: ${noChargingDays.filter(d => !d.isHoliday).length} 天`);
    console.log(`   - 其中节假日: ${noChargingDays.filter(d => d.isHoliday).length} 天\n`);

    if (noChargingDays.length === 0) {
      console.log('✅ 所有日期都有正常充放电，无非计划性停机');
      return;
    }

    // 显示无充放电的日期详情
    console.log('📋 无充放电的日期详情:');
    console.log('─'.repeat(100));
    console.log('日期'.padEnd(15) + 'SOC范围'.padEnd(20) + '数据点数'.padEnd(15) + '类型'.padEnd(10) + '状态');
    console.log('─'.repeat(100));

    noChargingDays.forEach(day => {
      const socRangeStr = `${day.minSoc.toFixed(2)}% - ${day.maxSoc.toFixed(2)}%`;
      const typeStr = day.isHoliday ? '节假日' : '工作日';
      console.log(
        `${day.date.padEnd(15)}${socRangeStr.padEnd(20)}${day.dataPoints.toString().padEnd(15)}${typeStr.padEnd(10)}无充放电`
      );
    });

    // 4. 查询这些无充放电日期的收益数据
    console.log('\n🔍 查询收益数据...\n');

    // StationRevenue的日期存储格式：UTC时间 + 16小时偏移
    // 例如：北京时间 2025-12-10 存储为 UTC 2025-12-09T16:00:00.000Z
    // 所以需要将北京时间日期减1天，然后加上16小时
    const revenueRecords = await StationRevenue.find({
      stationId: parseInt(stationId),
      date: {
        $in: noChargingDays.map(d => {
          // 将北京时间日期转换为StationRevenue的存储格式（前一天的16:00 UTC）
          const [y, m, day] = d.date.split('-').map(Number);
          const bjDate = new Date(y, m - 1, day, 0, 0, 0, 0);
          const prevDay = new Date(bjDate);
          prevDay.setDate(prevDay.getDate() - 1);
          const utcDate = new Date(Date.UTC(
            prevDay.getFullYear(),
            prevDay.getMonth(),
            prevDay.getDate(),
            16, 0, 0, 0
          ));
          return utcDate;
        })
      }
    }).sort({ date: 1 });

    console.log(`找到收益记录: ${revenueRecords.length} 条`);
    console.log(`缺失收益记录: ${noChargingDays.length - revenueRecords.length} 条\n`);

    if (revenueRecords.length === 0) {
      console.log('⚠️  未找到收益数据，无法计算损失');
      return;
    }

    // 5. 计算非计划性停机损失
    console.log('📊 计算损失详情:');
    console.log('=' .repeat(120));
    console.log('日期'.padEnd(15) + '预期收益(元)'.padEnd(20) + '实际收益(元)'.padEnd(20) + '损失(元)'.padEnd(20) + 'SOC波动');
    console.log('=' .repeat(120));

    let totalUnplannedOutageLoss = 0;
    const lossDetails = [];

    revenueRecords.forEach(record => {
      const dailyLoss = record.expectedRevenue - record.actualRevenue;
      totalUnplannedOutageLoss += dailyLoss;

      // StationRevenue存储格式：YYYY-MM-DDT16:00:00.000Z对应北京时间的后一天
      // 需要转换回实际的北京时间日期
      const utcDate = new Date(record.date);
      const bjDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
      const dateKey = bjDate.toISOString().split('T')[0];
      const socInfo = noChargingDays.find(d => d.date === dateKey);

      const detail = {
        date: dateKey,  // 使用北京时间日期
        expectedRevenue: record.expectedRevenue,
        actualRevenue: record.actualRevenue,
        loss: dailyLoss,
        socRange: socInfo ? socInfo.socRange : 0,
        isHoliday: socInfo ? socInfo.isHoliday : false
      };

      lossDetails.push(detail);

      console.log(
        `${dateKey.padEnd(15)}${record.expectedRevenue.toFixed(2).padEnd(20)}${record.actualRevenue.toFixed(2).padEnd(20)}${dailyLoss.toFixed(2).padEnd(20)}${socInfo ? socInfo.socRange.toFixed(2) + '%' : 'N/A'}`
      );
    });

    console.log('=' .repeat(120));
    console.log(`\n💰 非计划性停机损失汇总:`);
    console.log(`   - 总损失: ¥${totalUnplannedOutageLoss.toFixed(2)}`);
    console.log(`   - 平均损失: ¥${(totalUnplannedOutageLoss / revenueRecords.length).toFixed(2)}/天`);
    console.log(`   - 涉及天数: ${revenueRecords.length} 天`);
    console.log(`   - 其中工作日: ${lossDetails.filter(d => !d.isHoliday).length} 天`);
    console.log(`   - 其中节假日: ${lossDetails.filter(d => d.isHoliday).length} 天`);
    console.log(`   - 缺失数据: ${noChargingDays.length - revenueRecords.length} 天\n`);

    // 6. 导出结果
    const fs = require('fs');
    const result = {
      stationId,
      startDate,
      endDate,
      calculatedAt: new Date().toISOString(),
      summary: {
        totalDays: dates.length,
        holidayCount: holidays.length,
        workdayCount: workdays.length,
        noChargingDays: noChargingDays.length,
        noChargingWorkdays: noChargingDays.filter(d => !d.isHoliday).length,
        noChargingHolidays: noChargingDays.filter(d => d.isHoliday).length,
        revenueRecordsFound: revenueRecords.length,
        totalUnplannedOutageLoss: Math.round(totalUnplannedOutageLoss * 100) / 100,
        averageLossPerDay: Math.round((totalUnplannedOutageLoss / revenueRecords.length) * 100) / 100
      },
      details: lossDetails
    };

    const outputPath = `./unplanned_outage_report_${stationId}_${startDate}_${endDate}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ 报告已导出: ${outputPath}\n`);

  } catch (error) {
    console.error('\n❌ 计算失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ 已断开数据库连接');
  }
}

// 运行计算
console.log('使用方法: node recalculateUnplannedOutages.js [电站ID] [开始日期] [结束日期]');
console.log('示例: node recalculateUnplannedOutages.js 276 2025-12-01 2025-12-31\n');

recalculateUnplannedOutages();
