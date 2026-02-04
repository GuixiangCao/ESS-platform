const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');
const StationGateway = require('../src/models/StationGateway');

/**
 * 生成无充放电天数的CSV报告
 */
async function generateReport() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    // 获取所有电站
    const stations = await StationGateway.aggregate([
      {
        $group: {
          _id: '$stationId',
          stationName: { $first: '$stationName' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`共找到 ${stations.length} 个电站\n`);
    console.log('开始分析SOC数据...\n');

    const allResults = [];

    // 对每个电站进行分析
    for (const station of stations) {
      const stationId = station._id;
      const stationName = station.stationName || `电站${stationId}`;

      console.log(`分析 ${stationName} (ID: ${stationId})...`);

      // 聚合查询：按日期分组，计算每天的SOC统计信息
      const dailyStats = await SocData.aggregate([
        {
          $match: {
            stationId: stationId,
            dataDate: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              stationId: '$stationId',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$dataDate',
                  timezone: '+08:00'
                }
              }
            },
            minSoc: { $min: '$soc' },
            maxSoc: { $max: '$soc' },
            avgSoc: { $avg: '$soc' },
            dataPoints: { $sum: 1 },
            firstSoc: { $first: '$soc' },
            lastSoc: { $last: '$soc' }
          }
        },
        {
          $addFields: {
            socRange: { $subtract: ['$maxSoc', '$minSoc'] }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // 筛选出没有充放电的日期
      const noChargingDays = dailyStats.filter(day => {
        const isNoChange = day.socRange < 1;
        const isLowData = day.dataPoints < 10;
        return isNoChange || isLowData;
      });

      // 添加到结果集
      noChargingDays.forEach(day => {
        const reason = day.socRange < 1 ? 'SOC无变化' : '数据不足';
        allResults.push({
          stationId,
          stationName,
          date: day._id.date,
          minSoc: day.minSoc.toFixed(2),
          maxSoc: day.maxSoc.toFixed(2),
          socRange: day.socRange.toFixed(2),
          avgSoc: day.avgSoc.toFixed(2),
          dataPoints: day.dataPoints,
          reason
        });
      });
    }

    console.log(`\n共找到 ${allResults.length} 条无充放电记录\n`);

    // 生成CSV文件
    const outputDir = path.join(__dirname, '../../Data_Source');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'no_charging_days_report.csv');

    // CSV表头
    const csvHeaders = [
      '电站ID',
      '电站名称',
      '日期',
      '最小SOC(%)',
      '最大SOC(%)',
      'SOC波动(%)',
      '平均SOC(%)',
      '数据点数',
      '原因'
    ];

    // CSV内容
    const csvRows = allResults.map(row => [
      row.stationId,
      `"${row.stationName}"`,
      row.date,
      row.minSoc,
      row.maxSoc,
      row.socRange,
      row.avgSoc,
      row.dataPoints,
      `"${row.reason}"`
    ]);

    // 写入CSV文件
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(outputPath, '\uFEFF' + csvContent); // 添加BOM以支持Excel打开中文

    console.log('================================');
    console.log('报告生成成功！');
    console.log('================================');
    console.log(`文件路径: ${outputPath}`);
    console.log(`总记录数: ${allResults.length}`);
    console.log('================================\n');

    // 生成统计摘要
    console.log('按电站统计：');
    const stationSummary = {};
    allResults.forEach(row => {
      if (!stationSummary[row.stationId]) {
        stationSummary[row.stationId] = {
          name: row.stationName,
          count: 0
        };
      }
      stationSummary[row.stationId].count++;
    });

    Object.keys(stationSummary)
      .sort((a, b) => stationSummary[b].count - stationSummary[a].count)
      .forEach(stationId => {
        const summary = stationSummary[stationId];
        console.log(`  ${summary.name} (ID: ${stationId}): ${summary.count} 天`);
      });

    console.log('\n按日期统计前10名：');
    const dateSummary = {};
    allResults.forEach(row => {
      if (!dateSummary[row.date]) {
        dateSummary[row.date] = 0;
      }
      dateSummary[row.date]++;
    });

    Object.keys(dateSummary)
      .sort((a, b) => dateSummary[b] - dateSummary[a])
      .slice(0, 10)
      .forEach(date => {
        console.log(`  ${date}: ${dateSummary[date]} 个电站`);
      });

  } catch (error) {
    console.error('生成报告失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行生成报告
generateReport();
