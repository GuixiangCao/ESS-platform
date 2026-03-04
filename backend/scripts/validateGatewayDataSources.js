/**
 * 验证脚本：检查CSV文件中是否包含缺失的alarm_id
 * 功能：解析Level1和Level2 CSV文件，验证数据可用性
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
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform'
};

/**
 * 读取CSV文件并构建Map
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const gatewayMap = new Map();
    let rowCount = 0;

    if (!fs.existsSync(filePath)) {
      reject(new Error(`CSV 文件不存在: ${filePath}`));
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
              deviceType: row.device_type
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
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  Gateway Data Validation Report');
  console.log('========================================\n');

  try {
    // 连接数据库
    await mongoose.connect(CONFIG.mongoUri);
    console.log('✓ 数据库连接成功\n');

    // 读取CSV文件
    console.log('正在读取CSV文件...\n');

    const level2MapPromise = readCSV(CONFIG.level2Path);
    const level1MapPromise = readCSV(CONFIG.level1Path);

    const [level2Map, level1Map] = await Promise.all([level2MapPromise, level1MapPromise]);

    console.log('\nCSV文件加载完成:');
    console.log(`  Level2映射: ${level2Map.size} 条`);
    console.log(`  Level1映射: ${level1Map.size} 条\n`);

    // 查询数据库中缺失gatewayDeviceId的告警
    console.log('查询数据库中缺失网关ID的告警...\n');

    const missingAlarms = await Alarm.find({
      $or: [
        { gatewayDeviceId: null },
        { gatewayDeviceId: { $exists: false } }
      ]
    }).select('alarmId stationId device alarmName startTime').lean();

    console.log(`缺失网关ID的告警总数: ${missingAlarms.length}\n`);

    if (missingAlarms.length === 0) {
      console.log('✓ 所有告警都已有网关ID！');
      return;
    }

    // 交叉匹配
    console.log('正在匹配数据...\n');

    const matchResults = {
      level2: [],
      level1: [],
      notFound: []
    };

    missingAlarms.forEach(alarm => {
      if (level2Map.has(alarm.alarmId)) {
        matchResults.level2.push({
          alarm,
          gatewayInfo: level2Map.get(alarm.alarmId)
        });
      } else if (level1Map.has(alarm.alarmId)) {
        matchResults.level1.push({
          alarm,
          gatewayInfo: level1Map.get(alarm.alarmId)
        });
      } else {
        matchResults.notFound.push(alarm);
      }
    });

    // 生成验证报告
    console.log('========================================');
    console.log('  匹配结果统计');
    console.log('========================================\n');

    const total = missingAlarms.length;
    const foundInLevel2 = matchResults.level2.length;
    const foundInLevel1 = matchResults.level1.length;
    const notFound = matchResults.notFound.length;
    const totalFound = foundInLevel2 + foundInLevel1;

    console.log(`总计缺失: ${total} 条`);
    console.log(`\n数据可用性分析:`);
    console.log(`  ✓ 在Level2.csv中找到: ${foundInLevel2} (${((foundInLevel2/total)*100).toFixed(1)}%)`);
    console.log(`  ✓ 在Level1.csv中找到: ${foundInLevel1} (${((foundInLevel1/total)*100).toFixed(1)}%)`);
    console.log(`  ✗ 两个文件都没找到: ${notFound} (${((notFound/total)*100).toFixed(1)}%)`);
    console.log(`\n总体匹配率: ${((totalFound/total)*100).toFixed(1)}% (${totalFound}/${total})`);

    // 显示Level2匹配的样例（前10条）
    if (matchResults.level2.length > 0) {
      console.log('\n========================================');
      console.log('  Level2匹配样例（前10条）');
      console.log('========================================\n');

      matchResults.level2.slice(0, 10).forEach((match, i) => {
        console.log(`${i + 1}. alarmId: ${match.alarm.alarmId}`);
        console.log(`   电站: ${match.alarm.stationId}`);
        console.log(`   设备: ${match.alarm.device}`);
        console.log(`   网关: ${match.gatewayInfo.gatewayDeviceId}`);
        console.log(`   告警名称: ${match.alarm.alarmName}`);
        console.log(`   时间: ${match.alarm.startTime.toISOString().split('T')[0]}`);
        console.log('');
      });
    }

    // 显示Level1匹配的样例（如果有）
    if (matchResults.level1.length > 0) {
      console.log('========================================');
      console.log('  Level1匹配样例（前5条）');
      console.log('========================================\n');

      matchResults.level1.slice(0, 5).forEach((match, i) => {
        console.log(`${i + 1}. alarmId: ${match.alarm.alarmId}`);
        console.log(`   电站: ${match.alarm.stationId}`);
        console.log(`   网关: ${match.gatewayInfo.gatewayDeviceId}`);
        console.log('');
      });
    }

    // 显示未找到的告警（如果有）
    if (matchResults.notFound.length > 0) {
      console.log('========================================');
      console.log('  未找到的告警');
      console.log('========================================\n');

      console.log(`共 ${matchResults.notFound.length} 条告警在Level1和Level2中都未找到\n`);

      matchResults.notFound.slice(0, 10).forEach((alarm, i) => {
        console.log(`${i + 1}. alarmId: ${alarm.alarmId}`);
        console.log(`   电站: ${alarm.stationId}, 设备: ${alarm.device}`);
        console.log(`   告警: ${alarm.alarmName}`);
        console.log(`   时间: ${alarm.startTime.toISOString().split('T')[0]}`);
        console.log('');
      });

      if (matchResults.notFound.length > 10) {
        console.log(`... 还有 ${matchResults.notFound.length - 10} 条\n`);
      }
    }

    // 按电站统计
    console.log('========================================');
    console.log('  按电站统计');
    console.log('========================================\n');

    const stationStats = {};
    missingAlarms.forEach(alarm => {
      if (!stationStats[alarm.stationId]) {
        stationStats[alarm.stationId] = { total: 0, found: 0 };
      }
      stationStats[alarm.stationId].total++;
    });

    matchResults.level2.forEach(match => {
      stationStats[match.alarm.stationId].found++;
    });

    matchResults.level1.forEach(match => {
      stationStats[match.alarm.stationId].found++;
    });

    Object.keys(stationStats).sort((a, b) => stationStats[b].total - stationStats[a].total).forEach(stationId => {
      const stat = stationStats[stationId];
      const rate = ((stat.found / stat.total) * 100).toFixed(1);
      console.log(`电站${stationId}: ${stat.found}/${stat.total} 可匹配 (${rate}%)`);
    });

    // 建议
    console.log('\n========================================');
    console.log('  建议');
    console.log('========================================\n');

    const successRate = (totalFound / total) * 100;

    if (successRate >= 95) {
      console.log('✓ 匹配率超过95%，建议继续执行更新脚本');
      console.log('\n下一步:');
      console.log('  1. 运行干运行测试: node scripts/updateMissingGatewayIds.js --dry-run');
      console.log('  2. 确认无误后执行: node scripts/updateMissingGatewayIds.js');
    } else if (successRate >= 80) {
      console.log('⚠ 匹配率在80-95%之间，建议谨慎执行更新');
      console.log('  可以先执行干运行测试查看具体情况');
    } else {
      console.log('✗ 匹配率低于80%，建议检查CSV文件是否完整');
      console.log('  或者考虑其他数据源');
    }

    console.log('\n========================================\n');

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
