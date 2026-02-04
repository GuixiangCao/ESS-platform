/**
 * 更新告警数据库中的网关设备ID
 * 从 Level2.csv 文件读取 alarm_id 和 gateway_device_id，更新到数据库
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 导入模型
const Alarm = require('../models/Alarm');

// MongoDB 连接字符串
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform';

// CSV 文件路径
const CSV_FILE = path.join(__dirname, '../../../Data_Source/alarm/Level2.csv');

/**
 * 连接数据库
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB 连接成功');
  } catch (error) {
    console.error('✗ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
}

/**
 * 读取CSV文件并解析为对象数组
 */
function readCSV() {
  return new Promise((resolve, reject) => {
    const results = [];

    if (!fs.existsSync(CSV_FILE)) {
      reject(new Error(`CSV 文件不存在: ${CSV_FILE}`));
      return;
    }

    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        // CSV 列: alarm_id, device_id, gateway_device_id, station_name, alarm_code, device_type, alarm_level, occur_time, end_time
        if (row.alarm_id && row.gateway_device_id) {
          results.push({
            alarmId: row.alarm_id.trim(),
            gatewayDeviceId: row.gateway_device_id.trim()
          });
        }
      })
      .on('end', () => {
        console.log(`✓ CSV 文件读取完成，共 ${results.length} 条记录`);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * 批量更新告警的网关设备ID
 */
async function updateGatewayIds(records) {
  let updated = 0;
  let notFound = 0;
  let failed = 0;

  console.log('\n开始更新告警数据...\n');

  for (const record of records) {
    try {
      const result = await Alarm.updateOne(
        { alarmId: record.alarmId },
        { $set: { gatewayDeviceId: record.gatewayDeviceId } }
      );

      if (result.matchedCount > 0) {
        updated++;
        if (updated % 100 === 0) {
          console.log(`已更新 ${updated} 条记录...`);
        }
      } else {
        notFound++;
        if (notFound <= 10) {
          console.log(`⚠ 告警ID未找到: ${record.alarmId}`);
        }
      }
    } catch (error) {
      failed++;
      if (failed <= 10) {
        console.error(`✗ 更新失败 (${record.alarmId}):`, error.message);
      }
    }
  }

  return { updated, notFound, failed };
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  更新告警数据库 - 网关设备ID');
  console.log('========================================\n');

  try {
    // 连接数据库
    await connectDB();

    // 读取CSV文件
    console.log(`正在读取文件: ${CSV_FILE}\n`);
    const records = await readCSV();

    if (records.length === 0) {
      console.log('⚠ CSV 文件中没有有效的数据');
      return;
    }

    // 更新数据库
    const stats = await updateGatewayIds(records);

    // 打印统计信息
    console.log('\n========================================');
    console.log('  更新完成');
    console.log('========================================');
    console.log(`✓ 成功更新: ${stats.updated} 条`);
    console.log(`⚠ 未找到: ${stats.notFound} 条`);
    console.log(`✗ 更新失败: ${stats.failed} 条`);
    console.log(`总计: ${records.length} 条`);
    console.log('========================================\n');

    // 验证更新结果
    const sampleCount = await Alarm.countDocuments({ gatewayDeviceId: { $ne: null } });
    console.log(`数据库中已有网关设备ID的告警数量: ${sampleCount}`);

  } catch (error) {
    console.error('\n✗ 执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n✓ 数据库连接已关闭');
  }
}

// 执行主函数
main();
