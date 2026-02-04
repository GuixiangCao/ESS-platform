const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');
const StationGateway = require('../src/models/StationGateway');

/**
 * 分析哪些电站哪些天没有充放电（SOC曲线无变化）
 *
 * 判断标准：
 * 1. 一天内SOC最大值和最小值差异小于1%，视为无变化
 * 2. 或者一天内SOC数据点少于10个，视为数据不足
 */
async function analyzeNoChargingDays() {
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

    const results = [];
    let totalNoChargingDays = 0;

    // 对每个电站进行分析
    for (const station of stations) {
      const stationId = station._id;
      const stationName = station.stationName || `电站${stationId}`;

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
        // 条件1: SOC波动小于1%
        const isNoChange = day.socRange < 1;
        // 条件2: 数据点太少（少于10个）
        const isLowData = day.dataPoints < 10;

        return isNoChange || isLowData;
      });

      if (noChargingDays.length > 0) {
        totalNoChargingDays += noChargingDays.length;

        results.push({
          stationId,
          stationName,
          noChargingDays: noChargingDays.map(day => ({
            date: day._id.date,
            minSoc: day.minSoc.toFixed(2),
            maxSoc: day.maxSoc.toFixed(2),
            socRange: day.socRange.toFixed(2),
            dataPoints: day.dataPoints,
            reason: day.socRange < 1 ? 'SOC无变化' : '数据不足'
          }))
        });

        console.log(`📊 ${stationName} (ID: ${stationId})`);
        console.log(`   发现 ${noChargingDays.length} 天无充放电:\n`);

        noChargingDays.forEach(day => {
          const reason = day.socRange < 1 ? 'SOC无变化' : '数据不足';
          console.log(`   ⚠️  ${day._id.date}`);
          console.log(`      - SOC范围: ${day.minSoc.toFixed(1)}% - ${day.maxSoc.toFixed(1)}% (波动: ${day.socRange.toFixed(2)}%)`);
          console.log(`      - 数据点数: ${day.dataPoints}`);
          console.log(`      - 原因: ${reason}\n`);
        });
      }
    }

    // 打印总结
    console.log('================================');
    console.log('统计总结');
    console.log('================================');
    console.log(`分析电站数: ${stations.length}`);
    console.log(`有问题电站数: ${results.length}`);
    console.log(`无充放电天数总计: ${totalNoChargingDays} 天`);
    console.log('================================\n');

    // 输出详细报告
    if (results.length > 0) {
      console.log('详细报告：\n');

      // 按问题天数排序
      results.sort((a, b) => b.noChargingDays.length - a.noChargingDays.length);

      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.stationName} (ID: ${result.stationId})`);
        console.log(`   问题天数: ${result.noChargingDays.length} 天`);
        console.log(`   日期列表: ${result.noChargingDays.map(d => d.date).join(', ')}\n`);
      });
    } else {
      console.log('✅ 所有电站所有天数都有正常的充放电活动');
    }

  } catch (error) {
    console.error('分析失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行分析
analyzeNoChargingDays();
