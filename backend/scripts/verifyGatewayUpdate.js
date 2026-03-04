/**
 * 验证脚本：验证网关ID更新结果的正确性
 * 功能：统计对比、抽样验证、数据完整性检查
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const Alarm = require('../src/models/Alarm');

// 配置
const CONFIG = {
  level2Path: path.join(__dirname, '../../AData_Source/alarm level/Level2.csv'),
  level1Path: path.join(__dirname, '../../AData_Source/alarm level/Level1.csv'),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform',
  beforeCount: 6104, // 更新前已有网关ID的数量（从checkGatewayData.js获得）
  sampleSize: 20 // 抽样验证数量
};

/**
 * 读取CSV文件并构建Map
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const gatewayMap = new Map();

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ CSV 文件不存在: ${filePath}`);
      resolve(gatewayMap);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.alarm_id && row.gateway_device_id) {
          const alarmId = row.alarm_id.trim();
          const gatewayId = row.gateway_device_id.trim();

          if (!gatewayMap.has(alarmId)) {
            gatewayMap.set(alarmId, gatewayId);
          }
        }
      })
      .on('end', () => {
        resolve(gatewayMap);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  网关ID更新验证报告');
  console.log('========================================\n');

  try {
    // 连接数据库
    await mongoose.connect(CONFIG.mongoUri);
    console.log('✓ 数据库连接成功\n');

    // 1. 统计对比
    console.log('========================================');
    console.log('  1. 统计对比');
    console.log('========================================\n');

    const totalAlarms = await Alarm.countDocuments();
    const afterCount = await Alarm.countDocuments({
      gatewayDeviceId: { $ne: null, $exists: true }
    });
    const missingCount = await Alarm.countDocuments({
      $or: [
        { gatewayDeviceId: null },
        { gatewayDeviceId: { $exists: false } }
      ]
    });

    const updated = afterCount - CONFIG.beforeCount;
    const beforeCoverage = ((CONFIG.beforeCount / totalAlarms) * 100).toFixed(2);
    const afterCoverage = ((afterCount / totalAlarms) * 100).toFixed(2);

    console.log(`总告警数: ${totalAlarms}`);
    console.log(`\n更新前: ${CONFIG.beforeCount} 条有网关ID (${beforeCoverage}%)`);
    console.log(`更新后: ${afterCount} 条有网关ID (${afterCoverage}%)`);
    console.log(`\n✓ 本次更新: ${updated} 条`);
    console.log(`✓ 覆盖率提升: ${(afterCoverage - beforeCoverage).toFixed(2)}%`);
    console.log(`\n仍然缺失: ${missingCount} 条 (${((missingCount / totalAlarms) * 100).toFixed(2)}%)`);

    // 2. 抽样验证
    console.log('\n========================================');
    console.log('  2. 抽样验证');
    console.log('========================================\n');

    console.log(`正在加载CSV数据进行抽样验证...\n`);

    const [level2Map, level1Map] = await Promise.all([
      readCSV(CONFIG.level2Path),
      readCSV(CONFIG.level1Path)
    ]);

    // 合并映射
    const gatewayMap = new Map([...level2Map, ...level1Map]);

    // 随机抽取更新过的告警
    const recentUpdated = await Alarm.aggregate([
      {
        $match: {
          gatewayDeviceId: { $ne: null, $exists: true },
          updatedAt: { $exists: true }
        }
      },
      { $sample: { size: CONFIG.sampleSize } },
      { $project: { alarmId: 1, stationId: 1, device: 1, gatewayDeviceId: 1, updatedAt: 1 } }
    ]);

    console.log(`抽样验证 ${recentUpdated.length} 条记录:\n`);

    let matchCount = 0;
    let mismatchCount = 0;
    let notInCsvCount = 0;

    recentUpdated.forEach((alarm, i) => {
      const csvGatewayId = gatewayMap.get(alarm.alarmId);

      if (!csvGatewayId) {
        notInCsvCount++;
        console.log(`${i + 1}. ⚠ alarmId: ${alarm.alarmId}`);
        console.log(`   电站: ${alarm.stationId}, 设备: ${alarm.device}`);
        console.log(`   数据库网关: ${alarm.gatewayDeviceId}`);
        console.log(`   CSV中未找到`);
        console.log('');
      } else if (csvGatewayId === alarm.gatewayDeviceId) {
        matchCount++;
        if (i < 5) { // 只显示前5条匹配的
          console.log(`${i + 1}. ✓ alarmId: ${alarm.alarmId}`);
          console.log(`   电站: ${alarm.stationId}, 设备: ${alarm.device}`);
          console.log(`   网关ID: ${alarm.gatewayDeviceId}`);
          console.log(`   数据库与CSV一致`);
          console.log('');
        }
      } else {
        mismatchCount++;
        console.log(`${i + 1}. ✗ alarmId: ${alarm.alarmId}`);
        console.log(`   电站: ${alarm.stationId}, 设备: ${alarm.device}`);
        console.log(`   数据库网关: ${alarm.gatewayDeviceId}`);
        console.log(`   CSV网关: ${csvGatewayId}`);
        console.log(`   不一致！`);
        console.log('');
      }
    });

    if (matchCount > 5) {
      console.log(`... 还有 ${matchCount - 5} 条匹配记录\n`);
    }

    console.log('抽样结果:');
    console.log(`  ✓ 匹配: ${matchCount}/${recentUpdated.length} (${((matchCount / recentUpdated.length) * 100).toFixed(1)}%)`);
    console.log(`  ✗ 不匹配: ${mismatchCount}/${recentUpdated.length}`);
    console.log(`  ⚠ CSV中未找到: ${notInCsvCount}/${recentUpdated.length}`);

    // 3. 电站级别统计
    console.log('\n========================================');
    console.log('  3. 电站级别统计');
    console.log('========================================\n');

    const stationStats = await Alarm.aggregate([
      {
        $group: {
          _id: '$stationId',
          total: { $sum: 1 },
          withGateway: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$gatewayDeviceId', null] },
                  { $ne: ['$gatewayDeviceId', undefined] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          stationId: '$_id',
          total: 1,
          withGateway: 1,
          missing: { $subtract: ['$total', '$withGateway'] },
          coverage: {
            $multiply: [
              { $divide: ['$withGateway', '$total'] },
              100
            ]
          }
        }
      },
      { $sort: { missing: -1 } }
    ]);

    console.log('各电站网关ID覆盖情况（按缺失数量排序）:\n');

    stationStats.slice(0, 10).forEach((stat, i) => {
      const coverage = stat.coverage.toFixed(1);
      console.log(`${i + 1}. 电站${stat.stationId}: ${stat.withGateway}/${stat.total} (${coverage}%)`);
      if (stat.missing > 0) {
        console.log(`   缺失: ${stat.missing} 条`);
      }
    });

    if (stationStats.length > 10) {
      console.log(`\n... 还有 ${stationStats.length - 10} 个电站`);
    }

    // 重点关注电站205
    const station205 = stationStats.find(s => s.stationId === 205);
    if (station205) {
      console.log('\n电站205详情（本次更新重点关注）:');
      console.log(`  总告警: ${station205.total}`);
      console.log(`  有网关ID: ${station205.withGateway}`);
      console.log(`  仍缺失: ${station205.missing}`);
      console.log(`  覆盖率: ${station205.coverage.toFixed(2)}%`);
    }

    // 4. 数据完整性检查
    console.log('\n========================================');
    console.log('  4. 数据完整性检查');
    console.log('========================================\n');

    // 检查是否有重复的gatewayDeviceId模式
    const gatewayDistribution = await Alarm.aggregate([
      {
        $match: {
          gatewayDeviceId: { $ne: null, $exists: true }
        }
      },
      {
        $group: {
          _id: '$gatewayDeviceId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log('网关ID分布（前10个）:\n');
    gatewayDistribution.forEach((item, i) => {
      console.log(`${i + 1}. ${item._id}: ${item.count} 条告警`);
    });

    // 检查是否有异常的gatewayDeviceId格式
    const invalidFormatCount = await Alarm.countDocuments({
      gatewayDeviceId: {
        $exists: true,
        $ne: null,
        $not: /^[a-zA-Z0-9]+$/ // 不符合预期格式的
      }
    });

    console.log(`\n异常格式的网关ID数量: ${invalidFormatCount}`);

    if (invalidFormatCount > 0) {
      const samples = await Alarm.find({
        gatewayDeviceId: {
          $exists: true,
          $ne: null,
          $not: /^[a-zA-Z0-9]+$/
        }
      }).limit(5).select('alarmId gatewayDeviceId');

      console.log('样例:');
      samples.forEach((alarm, i) => {
        console.log(`  ${i + 1}. ${alarm.alarmId} -> ${alarm.gatewayDeviceId}`);
      });
    }

    // 最终总结
    console.log('\n========================================');
    console.log('  验证总结');
    console.log('========================================\n');

    const allChecks = [];

    // 检查1: 覆盖率是否提升
    if (updated > 0) {
      allChecks.push({ name: '覆盖率提升', pass: true, message: `✓ 成功更新 ${updated} 条记录` });
    } else {
      allChecks.push({ name: '覆盖率提升', pass: false, message: '✗ 未发现新更新的记录' });
    }

    // 检查2: 抽样验证通过率
    const samplePassRate = matchCount / recentUpdated.length;
    if (samplePassRate >= 0.95) {
      allChecks.push({ name: '抽样验证', pass: true, message: `✓ 抽样验证通过率: ${(samplePassRate * 100).toFixed(1)}%` });
    } else {
      allChecks.push({ name: '抽样验证', pass: false, message: `✗ 抽样验证通过率: ${(samplePassRate * 100).toFixed(1)}% (低于95%)` });
    }

    // 检查3: 最终覆盖率
    if (afterCoverage >= 95) {
      allChecks.push({ name: '最终覆盖率', pass: true, message: `✓ 最终覆盖率: ${afterCoverage}%` });
    } else {
      allChecks.push({ name: '最终覆盖率', pass: false, message: `⚠ 最终覆盖率: ${afterCoverage}% (低于95%)` });
    }

    // 检查4: 数据格式
    if (invalidFormatCount === 0) {
      allChecks.push({ name: '数据格式', pass: true, message: '✓ 所有网关ID格式正确' });
    } else {
      allChecks.push({ name: '数据格式', pass: false, message: `⚠ 发现 ${invalidFormatCount} 条格式异常的网关ID` });
    }

    // 打印所有检查结果
    allChecks.forEach(check => {
      console.log(check.message);
    });

    const passedCount = allChecks.filter(c => c.pass).length;
    console.log(`\n总体结果: ${passedCount}/${allChecks.length} 项检查通过`);

    if (passedCount === allChecks.length) {
      console.log('\n✓ 验证通过！更新成功且数据完整。');
    } else {
      console.log('\n⚠ 验证发现问题，请检查上述失败项。');
    }

    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 执行主函数
main();
