const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ChargingStrategy = require('../models/ChargingStrategy');

// Load environment variables
dotenv.config();

async function testDailyStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试每日充放电时长统计API逻辑');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 测试电站173的统计
    console.log('📊 电站 173 的每日充放电统计:\n');

    const stats = await ChargingStrategy.aggregate([
      { $match: { stationId: 173, isActive: true } },
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
          _id: {
            stationId: '$stationId',
            gatewayId: '$gatewayId',
            date: '$date',
            ctype: '$timeslots.ctype'
          },
          totalHours: { $sum: '$duration' },
          avgPower: { $avg: '$timeslots.power' },
          maxPower: { $max: '$timeslots.power' }
        }
      },
      {
        $group: {
          _id: {
            stationId: '$_id.stationId',
            gatewayId: '$_id.gatewayId',
            date: '$_id.date'
          },
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
          },
          chargingAvgPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 1] }, '$avgPower', null]
            }
          },
          dischargingAvgPower: {
            $max: {
              $cond: [{ $eq: ['$_id.ctype', 2] }, '$avgPower', null]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          stationId: '$_id.stationId',
          gatewayId: '$_id.gatewayId',
          date: '$_id.date',
          chargingHours: { $round: ['$chargingHours', 2] },
          dischargingHours: { $round: ['$dischargingHours', 2] },
          idleHours: { $round: ['$idleHours', 2] },
          chargingAvgPower: { $round: ['$chargingAvgPower', 2] },
          dischargingAvgPower: { $round: ['$dischargingAvgPower', 2] },
          totalHours: {
            $round: [
              { $add: ['$chargingHours', '$dischargingHours', '$idleHours'] },
              2
            ]
          }
        }
      },
      { $sort: { date: -1 } },
      { $limit: 10 }
    ]);

    console.log('┌──────────────┬────────────────────────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('│     日期     │          网关 ID           │  充电(h) │  放电(h) │  空闲(h) │  总计(h) │');
    console.log('├──────────────┼────────────────────────────┼──────────┼──────────┼──────────┼──────────┤');

    stats.forEach(stat => {
      const date = new Date(stat.date).toISOString().split('T')[0];
      const gateway = stat.gatewayId.substring(0, 18).padEnd(26);
      const charging = String(stat.chargingHours).padStart(8);
      const discharging = String(stat.dischargingHours).padStart(8);
      const idle = String(stat.idleHours).padStart(8);
      const total = String(stat.totalHours).padStart(8);

      console.log(`│ ${date} │ ${gateway} │ ${charging} │ ${discharging} │ ${idle} │ ${total} │`);
    });

    console.log('└──────────────┴────────────────────────────┴──────────┴──────────┴──────────┴──────────┘');

    console.log('\n✓ API逻辑测试成功！\n');

    // 测试电站205（多个网关）
    console.log('📊 电站 205 的每日充放电统计（显示多个网关）:\n');

    const stats205 = await ChargingStrategy.aggregate([
      { $match: { stationId: 205, isActive: true } },
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
          _id: {
            stationId: '$stationId',
            gatewayId: '$gatewayId',
            date: '$date',
            ctype: '$timeslots.ctype'
          },
          totalHours: { $sum: '$duration' }
        }
      },
      {
        $group: {
          _id: {
            stationId: '$_id.stationId',
            gatewayId: '$_id.gatewayId',
            date: '$_id.date'
          },
          chargingHours: {
            $sum: {
              $cond: [{ $eq: ['$_id.ctype', 1] }, '$totalHours', 0]
            }
          },
          dischargingHours: {
            $sum: {
              $cond: [{ $eq: ['$_id.ctype', 2] }, '$totalHours', 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          stationId: '$_id.stationId',
          gatewayId: '$_id.gatewayId',
          date: '$_id.date',
          chargingHours: { $round: ['$chargingHours', 2] },
          dischargingHours: { $round: ['$dischargingHours', 2] }
        }
      },
      { $sort: { gatewayId: 1, date: -1 } },
      { $limit: 20 }
    ]);

    console.log('┌──────────────┬────────────────────────────┬──────────┬──────────┐');
    console.log('│     日期     │          网关 ID           │  充电(h) │  放电(h) │');
    console.log('├──────────────┼────────────────────────────┼──────────┼──────────┤');

    stats205.forEach(stat => {
      const date = new Date(stat.date).toISOString().split('T')[0];
      const gateway = stat.gatewayId.substring(0, 18).padEnd(26);
      const charging = String(stat.chargingHours).padStart(8);
      const discharging = String(stat.dischargingHours).padStart(8);

      console.log(`│ ${date} │ ${gateway} │ ${charging} │ ${discharging} │`);
    });

    console.log('└──────────────┴────────────────────────────┴──────────┴──────────┘');

    console.log('\n✓ 多网关测试成功！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testDailyStats();
