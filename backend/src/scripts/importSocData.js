const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const SocData = require('../models/SocData');
const StationGateway = require('../models/StationGateway');

// Load environment variables
dotenv.config();

// 数据目录
const DATA_DIR = path.join(__dirname, '../../../26.01.27');

// 批量插入大小
const BATCH_SIZE = 1000;

async function importSocData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    // 检查目录是否存在
    if (!fs.existsSync(DATA_DIR)) {
      console.error(`❌ 数据目录不存在: ${DATA_DIR}`);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('导入SOC数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 获取所有CSV文件
    const files = fs.readdirSync(DATA_DIR)
      .filter(file => file.endsWith('.csv'))
      .sort();

    console.log(`找到 ${files.length} 个CSV文件\n`);

    let totalImported = 0;
    let totalSkipped = 0;
    let filesProcessed = 0;

    for (const file of files) {
      const deviceId = file.replace('.csv', '');
      const filePath = path.join(DATA_DIR, file);

      console.log(`[${filesProcessed + 1}/${files.length}] 处理文件: ${file}`);

      try {
        // 查找设备对应的网关和电站信息
        const gateway = await StationGateway.findOne({ deviceId });

        let gatewayId = null;
        let stationId = null;

        if (gateway) {
          gatewayId = gateway.gatewayId;
          stationId = gateway.stationId;
          console.log(`  ✓ 找到关联: 电站 ${stationId}, 网关 ${gatewayId}`);
        } else {
          console.log(`  ⚠️  未找到设备映射，使用默认值`);
        }

        // 读取CSV文件
        const records = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
              try {
                const timestamp = new Date(row.time);
                const soc = parseFloat(row.soc);

                if (!isNaN(timestamp.getTime()) && !isNaN(soc)) {
                  // 提取日期部分（不含时间）
                  const dataDate = new Date(timestamp);
                  dataDate.setHours(0, 0, 0, 0);

                  records.push({
                    deviceId,
                    gatewayId,
                    stationId,
                    timestamp,
                    soc,
                    dataDate
                  });
                }
              } catch (error) {
                console.error(`  ⚠️  解析行数据���败:`, error.message);
              }
            })
            .on('end', resolve)
            .on('error', reject);
        });

        console.log(`  📊 读取到 ${records.length} 条记录`);

        // 批量插入
        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, i + BATCH_SIZE);

          try {
            await SocData.insertMany(batch, { ordered: false });
            imported += batch.length;
          } catch (error) {
            // 处理重复键错误
            if (error.code === 11000) {
              // 计算成功插入的数量
              const successCount = error.result?.nInserted || 0;
              imported += successCount;
              skipped += (batch.length - successCount);
            } else {
              throw error;
            }
          }
        }

        console.log(`  ✓ 导入成功: ${imported} 条, 跳过重复: ${skipped} 条\n`);

        totalImported += imported;
        totalSkipped += skipped;
        filesProcessed++;

      } catch (error) {
        console.error(`  ❌ 处理文件失败: ${error.message}\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('导入完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✓ 处理文件: ${filesProcessed}/${files.length}`);
    console.log(`✓ 导入记录: ${totalImported} 条`);
    console.log(`⚠️  跳过重复: ${totalSkipped} 条`);
    console.log(`📊 总计: ${totalImported + totalSkipped} 条\n`);

    // 显示数据库统计
    const totalCount = await SocData.countDocuments();
    const deviceCount = await SocData.distinct('deviceId').then(arr => arr.length);
    const dateRange = await SocData.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$timestamp' },
          maxDate: { $max: '$timestamp' }
        }
      }
    ]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('数据库统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`总记录数: ${totalCount.toLocaleString()}`);
    console.log(`设备数量: ${deviceCount}`);

    if (dateRange.length > 0) {
      const minDate = new Date(dateRange[0].minDate).toISOString().split('T')[0];
      const maxDate = new Date(dateRange[0].maxDate).toISOString().split('T')[0];
      console.log(`时间范围: ${minDate} 至 ${maxDate}`);
    }

    // 显示前5个设备的记录数
    console.log('\n设备记录统计（前5个）:');
    const deviceStats = await SocData.aggregate([
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          stationId: { $first: '$stationId' },
          minTime: { $min: '$timestamp' },
          maxTime: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    deviceStats.forEach((stat, index) => {
      console.log(`\n${index + 1}. 设备 ${stat._id.substring(0, 20)}...`);
      console.log(`   电站: ${stat.stationId || '未知'}`);
      console.log(`   记录数: ${stat.count.toLocaleString()}`);
      console.log(`   时间范围: ${new Date(stat.minTime).toISOString().split('T')[0]} 至 ${new Date(stat.maxTime).toISOString().split('T')[0]}`);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ 导入失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

importSocData();
