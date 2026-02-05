const mongoose = require('mongoose');
const SocData = require('../src/models/SocData');
const StationRevenue = require('../src/models/StationRevenue');
const StationGateway = require('../src/models/StationGateway');
const Holiday = require('../src/models/Holiday');
require('dotenv').config();

/**
 * 批量计算所有电站的非计划性停机损失
 */
async function batchCalculateAllStations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到数据库\n');

    console.log('=' .repeat(120));
    console.log('批量计算所有电站的非计划性停机损失'.padStart(70));
    console.log('=' .repeat(120));
    console.log();

    // 1. 获取所有电站列表
    console.log('🔍 步骤1: 查询所有电站...\n');
    const stations = await StationGateway.aggregate([
      {
        $group: {
          _id: '$stationId',
          gatewayCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`找到 ${stations.length} 个电站\n`);

    // 2. 对每个电站查询数据时间范围
    console.log('🔍 步骤2: 分析每个电站的数据范围...\n');
    const stationDataRanges = [];

    for (const station of stations) {
      const stationId = station._id;

      // 查询SOC数据时间范围
      const socRange = await SocData.aggregate([
        { $match: { stationId: parseInt(stationId) } },
        {
          $group: {
            _id: null,
            minDate: { $min: '$timestamp' },
            maxDate: { $max: '$timestamp' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (socRange.length > 0) {
        const range = socRange[0];
        // 转换为北京时间日期
        const minDate = new Date(range.minDate.getTime() + 8 * 60 * 60 * 1000);
        const maxDate = new Date(range.maxDate.getTime() + 8 * 60 * 60 * 1000);
        const startDate = minDate.toISOString().split('T')[0];
        const endDate = maxDate.toISOString().split('T')[0];

        stationDataRanges.push({
          stationId,
          gatewayCount: station.gatewayCount,
          startDate,
          endDate,
          socDataCount: range.count
        });

        console.log(`  电站 ${stationId}: ${startDate} ~ ${endDate} (${range.count}条SOC数据)`);
      }
    }

    if (stationDataRanges.length === 0) {
      console.log('\n⚠️  未找到任何电站的SOC数据');
      return;
    }

    // 3. 批量计算每个电站的非计划性停机
    console.log(`\n🔍 步骤3: 计算 ${stationDataRanges.length} 个电站的非计划性停机...\n`);
    console.log('=' .repeat(120));

    const allResults = [];
    let totalLoss = 0;
    let totalNoChargingDays = 0;

    for (let i = 0; i < stationDataRanges.length; i++) {
      const stationInfo = stationDataRanges[i];
      const { stationId, startDate, endDate } = stationInfo;

      console.log(`\n[${i + 1}/${stationDataRanges.length}] 电站 ${stationId}: ${startDate} ~ ${endDate}`);
      console.log('─'.repeat(120));

      try {
        // 生成日期范围
        const dates = [];
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T00:00:00.000Z');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }

        // 查询节假日
        const holidayMap = await Holiday.checkHolidayDates(dates);
        const workdays = dates.filter(date => !holidayMap[date]);

        // 分析SOC数据
        const noChargingDays = [];
        for (const dateStr of dates) {
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

            if (socRange < 1) {
              const isHoliday = holidayMap[dateStr];
              noChargingDays.push({
                date: dateStr,
                socRange: socRange,
                isHoliday: isHoliday
              });
            }
          }
        }

        console.log(`  总天数: ${dates.length}, 工作日: ${workdays.length}, 无充放电: ${noChargingDays.length}`);
        console.log(`  其中工作日: ${noChargingDays.filter(d => !d.isHoliday).length}, 节假日: ${noChargingDays.filter(d => d.isHoliday).length}`);

        if (noChargingDays.length > 0) {
          // 查询收益数据
          const revenueRecords = await StationRevenue.find({
            stationId: parseInt(stationId),
            date: {
              $in: noChargingDays.map(d => {
                const [y, m, day] = d.date.split('-').map(Number);
                const bjDate = new Date(y, m - 1, day, 0, 0, 0, 0);
                const prevDay = new Date(bjDate);
                prevDay.setDate(prevDay.getDate() - 1);
                return new Date(Date.UTC(
                  prevDay.getFullYear(),
                  prevDay.getMonth(),
                  prevDay.getDate(),
                  16, 0, 0, 0
                ));
              })
            }
          }).lean();

          let stationLoss = 0;
          const lossDetails = [];

          revenueRecords.forEach(record => {
            const dailyLoss = record.expectedRevenue - record.actualRevenue;
            stationLoss += dailyLoss;

            const utcDate = new Date(record.date);
            const bjDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
            const dateKey = bjDate.toISOString().split('T')[0];
            const socInfo = noChargingDays.find(d => d.date === dateKey);

            lossDetails.push({
              date: dateKey,
              loss: dailyLoss,
              isHoliday: socInfo ? socInfo.isHoliday : false
            });
          });

          console.log(`  收益记录: ${revenueRecords.length}/${noChargingDays.length}, 损失: ¥${stationLoss.toFixed(2)}`);

          totalLoss += stationLoss;
          totalNoChargingDays += revenueRecords.length;

          allResults.push({
            stationId,
            startDate,
            endDate,
            totalDays: dates.length,
            workdayCount: workdays.length,
            noChargingDays: noChargingDays.length,
            noChargingWorkdays: noChargingDays.filter(d => !d.isHoliday).length,
            noChargingHolidays: noChargingDays.filter(d => d.isHoliday).length,
            revenueRecordsFound: revenueRecords.length,
            totalLoss: Math.round(stationLoss * 100) / 100,
            lossDetails: lossDetails
          });
        } else {
          console.log(`  ✅ 无非计划性停机`);
          allResults.push({
            stationId,
            startDate,
            endDate,
            totalDays: dates.length,
            workdayCount: workdays.length,
            noChargingDays: 0,
            noChargingWorkdays: 0,
            noChargingHolidays: 0,
            revenueRecordsFound: 0,
            totalLoss: 0,
            lossDetails: []
          });
        }

      } catch (error) {
        console.error(`  ❌ 计算失败: ${error.message}`);
        allResults.push({
          stationId,
          startDate,
          endDate,
          error: error.message
        });
      }
    }

    // 4. 汇总统计
    console.log('\n\n');
    console.log('=' .repeat(120));
    console.log('批量计算完成 - 汇总统计'.padStart(68));
    console.log('=' .repeat(120));

    console.log('\n📊 总体统计:');
    console.log(`  - 电站数量: ${stationDataRanges.length}`);
    console.log(`  - 总损失: ¥${totalLoss.toFixed(2)}`);
    console.log(`  - 总停机天数: ${totalNoChargingDays} 天`);
    console.log(`  - 平均损失: ¥${totalNoChargingDays > 0 ? (totalLoss / totalNoChargingDays).toFixed(2) : 0}/天`);

    console.log('\n📋 各电站详情:');
    console.log('─'.repeat(120));
    console.log('电站ID'.padEnd(10) + '数据范围'.padEnd(30) + '停机天数'.padEnd(15) + '工作日/节假日'.padEnd(20) + '损失(元)');
    console.log('─'.repeat(120));

    allResults
      .filter(r => !r.error)
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .forEach(r => {
        const dateRange = `${r.startDate} ~ ${r.endDate}`;
        const daysSplit = `${r.noChargingWorkdays}/${r.noChargingHolidays}`;
        console.log(
          `${r.stationId.toString().padEnd(10)}${dateRange.padEnd(30)}${r.noChargingDays.toString().padEnd(15)}${daysSplit.padEnd(20)}¥${r.totalLoss.toFixed(2)}`
        );
      });

    // 5. 导出结果
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputPath = `./batch_unplanned_outage_report_all_stations_${timestamp}.json`;

    const finalReport = {
      calculatedAt: new Date().toISOString(),
      summary: {
        totalStations: stationDataRanges.length,
        totalLoss: Math.round(totalLoss * 100) / 100,
        totalNoChargingDays: totalNoChargingDays,
        averageLossPerDay: totalNoChargingDays > 0 ? Math.round((totalLoss / totalNoChargingDays) * 100) / 100 : 0
      },
      stations: allResults
    };

    fs.writeFileSync(outputPath, JSON.stringify(finalReport, null, 2));
    console.log(`\n✅ 汇总报告已导出: ${outputPath}\n`);

  } catch (error) {
    console.error('\n❌ 批量计算失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ 已断开数据库连接');
  }
}

// 运行批量计算
console.log('批量计算所有电站的非计划性停机损失\n');
batchCalculateAllStations();
