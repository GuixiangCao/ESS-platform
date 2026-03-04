/**
 * 更新脚本：补充数据库中缺失的网关设备ID
 * 功能：从Level2和Level1 CSV文件读取映射关系，批量更新数据库
 * 使用方法：
 *   - 干运行测试: node scripts/updateMissingGatewayIds.js --dry-run
 *   - 实际执行: node scripts/updateMissingGatewayIds.js
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
  dryRun: process.argv.includes('--dry-run'),
  batchSize: 100
};

/**
 * 读取CSV文件并构建Map
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const gatewayMap = new Map();
    let rowCount = 0;

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ CSV 文件不存在: ${filePath}`);
      resolve(gatewayMap);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        if (row.alarm_id && row.gateway_device_id) {
          const alarmId = row.alarm_id.trim();
          const gatewayId = row.gateway_device_id.trim();

          // 只保存第一次出现的映射（如有重复）
          if (!gatewayMap.has(alarmId)) {
            gatewayMap.set(alarmId, {
              gatewayDeviceId: gatewayId,
              stationName: row.station_name,
              deviceType: row.device_type,
              source: path.basename(filePath)
            });
          }
        }
      })
      .on('end', () => {
        console.log(`  ✓ 读取完成: ${path.basename(filePath)}`);
        console.log(`    - 总行数: ${rowCount}`);
        console.log(`    - 有效映射: ${gatewayMap.size}`);
        resolve(gatewayMap);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * 合并两个映射，Level2优先级更高
 */
function mergeMaps(level2Map, level1Map) {
  const combinedMap = new Map(level2Map);

  for (const [alarmId, info] of level1Map) {
    if (!combinedMap.has(alarmId)) {
      combinedMap.set(alarmId, info);
    }
  }

  return combinedMap;
}

/**
 * 批量更新数据库
 */
async function performBatchUpdate(missingAlarms, gatewayMap) {
  const updates = [];
  const notFoundIds = [];

  // 构建更新操作列表
  missingAlarms.forEach(alarm => {
    if (gatewayMap.has(alarm.alarmId)) {
      const info = gatewayMap.get(alarm.alarmId);
      updates.push({
        alarm,
        gatewayInfo: info
      });
    } else {
      notFoundIds.push(alarm.alarmId);
    }
  });

  if (CONFIG.dryRun) {
    // 干运行模式：只显示不执行
    console.log('\n========================================');
    console.log('  [DRY RUN] 预览更新操作');
    console.log('========================================\n');

    console.log(`将要更新 ${updates.length} 条告警记录\n`);

    // 按数据源统计
    const fromLevel2 = updates.filter(u => u.gatewayInfo.source === 'Level2.csv').length;
    const fromLevel1 = updates.filter(u => u.gatewayInfo.source === 'Level1.csv').length;

    console.log('数据源统计:');
    console.log(`  - 来自Level2.csv: ${fromLevel2}`);
    console.log(`  - 来自Level1.csv: ${fromLevel1}`);

    // 显示前10条样例
    console.log('\n前10条更新样例:\n');
    updates.slice(0, 10).forEach((update, i) => {
      console.log(`${i + 1}. alarmId: ${update.alarm.alarmId}`);
      console.log(`   电站: ${update.alarm.stationId}`);
      console.log(`   设备: ${update.alarm.device}`);
      console.log(`   网关: ${update.gatewayInfo.gatewayDeviceId}`);
      console.log(`   数据源: ${update.gatewayInfo.source}`);
      console.log('');
    });

    // 显示未找到的
    if (notFoundIds.length > 0) {
      console.log(`\n⚠ 有 ${notFoundIds.length} 条告警在CSV中未找到:`);
      notFoundIds.slice(0, 5).forEach(id => console.log(`  - ${id}`));
      if (notFoundIds.length > 5) {
        console.log(`  ... 还有 ${notFoundIds.length - 5} 条`);
      }
    }

    console.log('\n========================================');
    console.log('  [DRY RUN] 未对数据库进行任何修改');
    console.log('========================================\n');
    console.log('如需执行实际更新，请运行:');
    console.log('  node scripts/updateMissingGatewayIds.js');
    console.log('');

    return {
      updated: 0,
      notFound: notFoundIds.length,
      failed: 0,
      dryRun: true
    };
  }

  // 实际执行模式：批量更新
  console.log('\n========================================');
  console.log('  执行批量更新');
  console.log('========================================\n');

  let successCount = 0;
  let failedCount = 0;

  // 分批执行更新
  const totalBatches = Math.ceil(updates.length / CONFIG.batchSize);

  for (let i = 0; i < updates.length; i += CONFIG.batchSize) {
    const batch = updates.slice(i, i + CONFIG.batchSize);
    const batchNum = Math.floor(i / CONFIG.batchSize) + 1;

    try {
      const bulkOps = batch.map(update => ({
        updateOne: {
          filter: {
            alarmId: update.alarm.alarmId,
            $or: [
              { gatewayDeviceId: null },
              { gatewayDeviceId: { $exists: false } }
            ]
          },
          update: {
            $set: {
              gatewayDeviceId: update.gatewayInfo.gatewayDeviceId
            }
          }
        }
      }));

      const result = await Alarm.bulkWrite(bulkOps);
      successCount += result.modifiedCount;

      console.log(`  批次 ${batchNum}/${totalBatches}: 更新 ${result.modifiedCount}/${batch.length} 条... ✓`);
    } catch (error) {
      failedCount += batch.length;
      console.error(`  批次 ${batchNum}/${totalBatches}: 失败 ✗`);
      console.error(`    错误: ${error.message}`);
    }
  }

  return {
    updated: successCount,
    notFound: notFoundIds.length,
    failed: failedCount,
    dryRun: false
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  更新缺失的网关设备ID');
  console.log('========================================\n');

  if (CONFIG.dryRun) {
    console.log('🔍 运行模式: 干运行测试 (DRY RUN)\n');
  } else {
    console.log('⚡ 运行模式: 实际执行\n');
  }

  try {
    // 连接数据库
    await mongoose.connect(CONFIG.mongoUri);
    console.log('✓ 数据库连接成功\n');

    // 读取CSV文件
    console.log('正在读取CSV文件...\n');

    const [level2Map, level1Map] = await Promise.all([
      readCSV(CONFIG.level2Path),
      readCSV(CONFIG.level1Path)
    ]);

    console.log('\nCSV文件加载完成:');
    console.log(`  Level2映射: ${level2Map.size} 条`);
    console.log(`  Level1映射: ${level1Map.size} 条`);

    // 合并映射（Level2优先）
    const gatewayMap = mergeMaps(level2Map, level1Map);
    console.log(`  合并后总映射: ${gatewayMap.size} 条\n`);

    // 查询数据库中缺失gatewayDeviceId的告警
    console.log('查询数据库中缺失网关ID的告警...');

    const missingAlarms = await Alarm.find({
      $or: [
        { gatewayDeviceId: null },
        { gatewayDeviceId: { $exists: false } }
      ]
    }).select('alarmId stationId device alarmName startTime').lean();

    console.log(`  找到: ${missingAlarms.length} 条\n`);

    if (missingAlarms.length === 0) {
      console.log('✓ 所有告警都已有网关ID！');
      return;
    }

    // 执行批量更新
    const stats = await performBatchUpdate(missingAlarms, gatewayMap);

    // 打印最终统计
    if (!stats.dryRun) {
      console.log('\n========================================');
      console.log('  更新完成');
      console.log('========================================');
      console.log(`✓ 成功更新: ${stats.updated} 条`);
      console.log(`⚠ CSV中未找到: ${stats.notFound} 条`);
      console.log(`✗ 更新失败: ${stats.failed} 条`);
      console.log(`总计处理: ${missingAlarms.length} 条`);

      // 查询更新后的覆盖率
      const totalAlarms = await Alarm.countDocuments();
      const withGateway = await Alarm.countDocuments({
        gatewayDeviceId: { $ne: null, $exists: true }
      });
      const coverage = ((withGateway / totalAlarms) * 100).toFixed(2);

      console.log(`\n最终覆盖率: ${coverage}% (${withGateway}/${totalAlarms})`);
      console.log('========================================\n');
    }

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
