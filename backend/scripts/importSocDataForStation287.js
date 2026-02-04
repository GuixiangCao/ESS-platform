const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');
const StationGateway = require('../src/models/StationGateway');

/**
 * 从26.01.27文件夹导入287电站的SOC数据
 */
async function importStation287SocData() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    // 获取287电站的网关信息
    const gateways = await StationGateway.find({ stationId: 287 });
    console.log(`电站287的网关数量: ${gateways.length}\n`);

    if (gateways.length === 0) {
      throw new Error('未找到电站287的网关信息');
    }

    const socDataFolder = path.join(__dirname, '../../26.01.27');

    if (!fs.existsSync(socDataFolder)) {
      throw new Error(`SOC数据文件夹不存在: ${socDataFolder}`);
    }

    console.log(`SOC数据文件夹: ${socDataFolder}\n`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // 为每个网关导入SOC数据
    for (const gateway of gateways) {
      const csvFilePath = path.join(socDataFolder, `${gateway.deviceId}.csv`);

      if (!fs.existsSync(csvFilePath)) {
        console.log(`⚠️  文件不存在: ${gateway.deviceId}.csv，跳过`);
        continue;
      }

      console.log(`\n开始处理网关: ${gateway.gatewayId} (${gateway.deviceId})`);
      console.log(`文件路径: ${csvFilePath}`);

      const socRecords = [];
      let lineCount = 0;

      // ���取CSV文件
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on('data', (row) => {
            lineCount++;
            try {
              // 解析时间（CSV中是北京时间UTC+8，需要转换为UTC时间）
              const beijingTime = new Date(row.time);
              const soc = parseFloat(row.soc);

              if (isNaN(beijingTime.getTime())) {
                console.warn(`  ⚠️  第${lineCount}行: 无效的时间格式 - ${row.time}`);
                totalErrors++;
                return;
              }

              if (isNaN(soc)) {
                console.warn(`  ⚠️  第${lineCount}行: 无效的SOC值 - ${row.soc}`);
                totalErrors++;
                return;
              }

              // 将北京时间转换为UTC时间（减去8小时）
              const utcTimestamp = new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);

              // 提取日期（基于北京时间）
              const dataDate = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());

              socRecords.push({
                stationId: 287,
                gatewayId: gateway.gatewayId,
                deviceId: gateway.deviceId,
                timestamp: utcTimestamp,  // 存储UTC时间
                dataDate: dataDate,       // 存储北京时间的日期部分
                soc: soc
              });

            } catch (error) {
              console.error(`  ❌ 第${lineCount}行解析失败:`, error.message);
              totalErrors++;
            }
          })
          .on('end', () => {
            console.log(`  读取完成，共 ${lineCount} 行，解析成功 ${socRecords.length} 条`);
            resolve();
          })
          .on('error', reject);
      });

      if (socRecords.length === 0) {
        console.log(`  ⚠️  没有有效数据，跳过导入`);
        continue;
      }

      // 批量插入数据
      console.log(`  开始批量插入数据...`);
      const batchSize = 1000;
      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < socRecords.length; i += batchSize) {
        const batch = socRecords.slice(i, i + batchSize);

        try {
          // 使用insertMany with ordered: false 以跳过重复数据
          const result = await SocData.insertMany(batch, { ordered: false });
          inserted += result.length;
        } catch (error) {
          if (error.code === 11000) {
            // 重复键错误
            const duplicates = error.writeErrors?.length || 0;
            inserted += batch.length - duplicates;
            skipped += duplicates;
          } else {
            console.error(`  ❌ 批量插入失败:`, error.message);
            totalErrors += batch.length;
          }
        }

        // 显示进度
        const progress = Math.min(i + batchSize, socRecords.length);
        process.stdout.write(`\r  进度: ${progress}/${socRecords.length} (${((progress / socRecords.length) * 100).toFixed(1)}%)`);
      }

      console.log(`\n  ✅ 网关 ${gateway.gatewayId} 导入完成`);
      console.log(`     - 新增: ${inserted} 条`);
      console.log(`     - 跳过: ${skipped} 条（重复）`);

      totalInserted += inserted;
      totalSkipped += skipped;
    }

    console.log('\n========================================');
    console.log('导入完成！');
    console.log('========================================');
    console.log(`新增记录: ${totalInserted}`);
    console.log(`跳过记录: ${totalSkipped} (重复)`);
    console.log(`错误记录: ${totalErrors}`);
    console.log('========================================\n');

    // 验证导入结果
    console.log('验证电站287的SOC数据...');
    const totalCount = await SocData.countDocuments({ stationId: 287 });
    console.log(`电站287的SOC数据总记录数: ${totalCount}`);

    if (totalCount > 0) {
      const earliest = await SocData.findOne({ stationId: 287 }).sort({ timestamp: 1 });
      const latest = await SocData.findOne({ stationId: 287 }).sort({ timestamp: -1 });
      console.log(`最早记录时间: ${earliest.timestamp.toISOString()}`);
      console.log(`最新记录时间: ${latest.timestamp.toISOString()}`);

      // 按日期统计
      const dailyStats = await SocData.aggregate([
        { $match: { stationId: 287 } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$dataDate',
                timezone: '+08:00'
              }
            },
            count: { $sum: 1 },
            minSoc: { $min: '$soc' },
            maxSoc: { $max: '$soc' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      console.log(`\n按日期统计（共 ${dailyStats.length} 天）:`);
      dailyStats.slice(0, 10).forEach(day => {
        console.log(`  ${day._id}: ${day.count} 条, SOC范围 ${day.minSoc.toFixed(1)}%-${day.maxSoc.toFixed(1)}%`);
      });

      if (dailyStats.length > 10) {
        console.log(`  ... (还有 ${dailyStats.length - 10} 天)`);
      }
    }

    // 提示用户运行SOC跳变修正
    console.log('\n========================================');
    console.log('⚠️  数据导入完成！');
    console.log('建议运行SOC跳变检查和修正：');
    console.log('  node backend/scripts/correctSOCJumps.js');
    console.log('========================================');

  } catch (error) {
    console.error('导入失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行导入
importStation287SocData();
