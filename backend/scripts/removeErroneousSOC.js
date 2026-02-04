const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');

/**
 * 删除双流数据中的错误记录
 *
 * 策略:
 * 1. 对于时间间隔<2秒的记录簇,只保留低SOC范围的记录
 * 2. 直接从数据库删除高SOC范围的记录
 */

async function removeErroneousRecords(stationId, startDate, endDate) {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    const devices = await SocData.distinct('deviceId', {
      stationId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    console.log(`找到 ${devices.length} 个设备\n`);

    let totalRemoved = 0;

    for (const deviceId of devices) {
      console.log(`处理设备 ${deviceId}...`);

      // 分批处理,每次1000条
      const batchSize = 5000;
      let skip = 0;
      let deviceRemoved = 0;

      while (true) {
        const records = await SocData.find({
          deviceId,
          timestamp: { $gte: startDate, $lte: endDate }
        })
          .sort({ timestamp: 1 })
          .skip(skip)
          .limit(batchSize)
          .lean();

        if (records.length === 0) break;

        console.log(`  处理第 ${skip + 1}-${skip + records.length} 条记录...`);

        // 找出双流簇中需要删除的记录
        const idsToRemove = [];
        let i = 0;

        while (i < records.length) {
          const clusterStart = records[i];
          const cluster = [clusterStart];

          // 收集时间间隔<2秒的记录
          let j = i + 1;
          while (j < records.length &&
                 records[j].timestamp.getTime() - clusterStart.timestamp.getTime() < 2000) {
            cluster.push(records[j]);
            j++;
          }

          if (cluster.length > 1) {
            // 有双流,需要判断保留哪个
            const socs = cluster.map(r => r.soc);
            const minSoc = Math.min(...socs);
            const maxSoc = Math.max(...socs);

            if (maxSoc - minSoc > 40) {
              // 确实是双流 (差距>40%)
              const midPoint = (minSoc + maxSoc) / 2;

              // 删除高SOC范围的记录
              cluster.forEach(record => {
                if (record.soc >= midPoint) {
                  idsToRemove.push(record._id);
                }
              });
            }
          }

          i = j;
        }

        // 批量删除
        if (idsToRemove.length > 0) {
          const result = await SocData.deleteMany({
            _id: { $in: idsToRemove }
          });

          deviceRemoved += result.deletedCount;
          console.log(`    删除 ${result.deletedCount} 条错误记录`);
        }

        skip += batchSize;

        // 如果这批少于batchSize,说明已经处理完了
        if (records.length < batchSize) {
          break;
        }
      }

      totalRemoved += deviceRemoved;
      console.log(`  设备 ${deviceId} 完成,共删除 ${deviceRemoved} 条错误记录\n`);
    }

    console.log('========================================');
    console.log('删除完成！');
    console.log('========================================');
    console.log(`总共删除: ${totalRemoved} 条错误记录`);
    console.log('========================================\n');

    console.log('⚠️  删除完成后,请运行以下命令应用跳变修正:');
    console.log(`  node backend/scripts/correctSOCJumpsFixed.js ${stationId} ${startDate.toISOString().split('T')[0]} ${endDate.toISOString().split('T')[0]}`);

    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');

  } catch (error) {
    console.error('处理失败:', error);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.length === 0) {
  const stationId = 287;
  const startDate = new Date('2025-12-01T00:00:00.000Z');
  const endDate = new Date('2025-12-31T23:59:59.999Z');

  removeErroneousRecords(stationId, startDate, endDate);
} else if (args.length === 3) {
  const stationId = parseInt(args[0]);
  const startDate = new Date(args[1] + 'T00:00:00.000Z');
  const endDate = new Date(args[2] + 'T23:59:59.999Z');

  removeErroneousRecords(stationId, startDate, endDate);
} else {
  console.log('用法: node removeErroneousSOC.js [stationId] [startDate] [endDate]');
  console.log('示例: node removeErroneousSOC.js 287 2025-12-01 2025-12-31');
  console.log('不带参数时默认处理电站287的12月数据');
  process.exit(1);
}
