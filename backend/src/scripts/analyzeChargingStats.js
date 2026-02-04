const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ChargingStrategy = require('../models/ChargingStrategy');

// Load environment variables
dotenv.config();

// 数据库连接
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');
  } catch (error) {
    console.error('⚠️  MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// 统计各电站各网关每天的充放电时长
async function analyzeChargingStats() {
  try {
    await connectDB();

    console.log('======================================');
    console.log('  充放电策略统计分析');
    console.log('======================================\n');

    // 获取所有电站
    const stations = await ChargingStrategy.distinct('stationId');
    console.log(`📊 发现 ${stations.length} 个电站\n`);

    // 对每个电站进行统计
    for (const stationId of stations.sort((a, b) => a - b)) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏢 电站 ${stationId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // 获取该电站的所有网关
      const gateways = await ChargingStrategy.distinct('gatewayId', { stationId });

      for (const gatewayId of gateways) {
        console.log(`\n  📡 网关: ${gatewayId}`);

        // 获取该网关的策略并统计
        const strategies = await ChargingStrategy.aggregate([
          {
            $match: {
              stationId,
              gatewayId,
              isActive: true
            }
          },
          { $unwind: '$timeslots' },
          {
            $addFields: {
              // 计算每个时间段的时长（小时）
              duration: {
                $divide: [
                  {
                    $subtract: [
                      {
                        $add: [
                          { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 0] } }, 60] },
                          { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 1] } }
                        ]
                      },
                      {
                        $add: [
                          { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 0] } }, 60] },
                          { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 1] } }
                        ]
                      }
                    ]
                  },
                  60
                ]
              }
            }
          },
          {
            $group: {
              _id: {
                date: '$date',
                ctype: '$timeslots.ctype'
              },
              totalHours: { $sum: '$duration' },
              avgPower: { $avg: '$timeslots.power' }
            }
          },
          {
            $group: {
              _id: '$_id.date',
              chargingHours: {
                $sum: {
                  $cond: [{ $eq: ['$_id.ctype', 1] }, '$totalHours', 0]
                }
              },
              dischargingHours: {
                $sum: {
                  $cond: [{ $eq: ['$_id.ctype', 2] }, '$totalHours', 0]
                }
              },
              idleHours: {
                $sum: {
                  $cond: [{ $eq: ['$_id.ctype', 3] }, '$totalHours', 0]
                }
              }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 10 } // 最近10天
        ]);

        if (strategies.length > 0) {
          console.log('     ┌─────────────┬──────────┬──────────┬──────────┬──────────┐');
          console.log('     │    日期     │  充电(h) │  放电(h) │  空闲(h) │  总计(h) │');
          console.log('     ├─────────────┼──────────┼──────────┼──────────┼──────────┤');

          strategies.forEach(stat => {
            const date = new Date(stat._id).toISOString().split('T')[0];
            const charging = stat.chargingHours.toFixed(2).padStart(8);
            const discharging = stat.dischargingHours.toFixed(2).padStart(8);
            const idle = stat.idleHours.toFixed(2).padStart(8);
            const total = (stat.chargingHours + stat.dischargingHours + stat.idleHours).toFixed(2).padStart(8);

            console.log(`     │ ${date} │ ${charging} │ ${discharging} │ ${idle} │ ${total} │`);
          });

          console.log('     └─────────────┴──────────┴──────────┴──────────┴──────────┘');

          // 计算平均值
          const avgCharging = strategies.reduce((sum, s) => sum + s.chargingHours, 0) / strategies.length;
          const avgDischarging = strategies.reduce((sum, s) => sum + s.dischargingHours, 0) / strategies.length;
          const avgIdle = strategies.reduce((sum, s) => sum + s.idleHours, 0) / strategies.length;

          console.log(`\n     📈 平均值（最近${strategies.length}天）:`);
          console.log(`        充电: ${avgCharging.toFixed(2)} 小时/天`);
          console.log(`        放电: ${avgDischarging.toFixed(2)} 小时/天`);
          console.log(`        空闲: ${avgIdle.toFixed(2)} 小时/天`);
        } else {
          console.log('     ⚠️  暂无统计数据');
        }
      }
    }

    // 全局统计
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 全局统计摘要');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const globalStats = await ChargingStrategy.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$timeslots' },
      {
        $addFields: {
          duration: {
            $divide: [
              {
                $subtract: [
                  {
                    $add: [
                      { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 0] } }, 60] },
                      { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.etime', ':'] }, 1] } }
                    ]
                  },
                  {
                    $add: [
                      { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 0] } }, 60] },
                      { $toInt: { $arrayElemAt: [{ $split: ['$timeslots.stime', ':'] }, 1] } }
                    ]
                  }
                ]
              },
              60
            ]
          }
        }
      },
      {
        $group: {
          _id: '$timeslots.ctype',
          totalHours: { $sum: '$duration' },
          avgPower: { $avg: '$timeslots.power' },
          maxPower: { $max: '$timeslots.power' },
          recordCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const ctypeNames = { 1: '充电', 2: '放电', 3: '空闲' };
    globalStats.forEach(stat => {
      console.log(`${ctypeNames[stat._id]}:`);
      console.log(`  总时长: ${stat.totalHours.toFixed(2)} 小时`);
      console.log(`  平均功率: ${stat.avgPower.toFixed(2)} kW`);
      console.log(`  最大功率: ${stat.maxPower} kW`);
      console.log(`  记录数: ${stat.recordCount}`);
      console.log('');
    });

    console.log('✓ 统计分析完成！\n');

  } catch (error) {
    console.error('\n❌ 统计分析失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 运行统计分析
analyzeChargingStats();
