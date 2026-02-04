const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SocData = require('../models/SocData');

// Load environment variables
dotenv.config();

/**
 * 修正SOC数据的时区问题
 *
 * 问题：CSV文件中的时间标记为+0000（UTC），但实际上是UTC+8本地时间
 * 解决：给所有时间戳加8小时
 */
async function fixSocTimezone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('修正SOC数据时区');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('问题：CSV文件中的时间标记为+0000，但实际是UTC+8本地时间');
    console.log('解决：将所有时间戳减去8小时，转换为正确的UTC时间\n');

    // 统计信息
    const totalCount = await SocData.countDocuments();
    console.log(`📊 总记录数: ${totalCount.toLocaleString()}\n`);

    // 显示修正前的样本数据
    console.log('修正前的样本数据（电站231，2026-01-12）:');
    const sampleBefore = await SocData.find({
      stationId: 231,
      timestamp: {
        $gte: new Date('2026-01-12T00:00:00.000Z'),
        $lt: new Date('2026-01-12T00:02:00.000Z')
      }
    }).sort({ timestamp: 1 }).limit(3);

    sampleBefore.forEach(record => {
      console.log(`  数据库（UTC）: ${record.timestamp.toISOString()}, SOC: ${record.soc.toFixed(2)}%`);
      console.log(`  实际含义（UTC+8）: ${new Date(record.timestamp).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
      console.log('');
    });

    // 确认操作
    console.log('⚠️  警告：此操作将修改所有SOC数据的时间戳（-8小时）');
    console.log('   这个操作不可逆，请确保已备份数据！');
    console.log('');

    // 批量更新（给所有时间戳减去8小时）
    const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时的毫秒数

    console.log('🔄 开始批量更新...\n');

    // 分批处理，避免内存溢出
    const BATCH_SIZE = 10000;
    let processed = 0;
    let updated = 0;

    while (processed < totalCount) {
      const records = await SocData.find()
        .skip(processed)
        .limit(BATCH_SIZE)
        .lean();

      const bulkOps = records.map(record => ({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: {
              timestamp: new Date(new Date(record.timestamp).getTime() - UTC_OFFSET_MS)
            }
          }
        }
      }));

      if (bulkOps.length > 0) {
        const result = await SocData.bulkWrite(bulkOps);
        updated += result.modifiedCount;
      }

      processed += records.length;
      console.log(`  进度: ${processed.toLocaleString()}/${totalCount.toLocaleString()} (${((processed/totalCount)*100).toFixed(1)}%)`);
    }

    console.log('\n✓ 批量更新完成\n');
    console.log(`✓ 已更新: ${updated.toLocaleString()} 条记录\n`);

    // 显示修正后的样本数据
    console.log('修正后的样本数据（电站231）:');
    const sampleAfter = await SocData.find({
      stationId: 231,
      timestamp: {
        $gte: new Date('2026-01-11T16:00:00.000Z'),  // 原来的2026-01-12 00:00 - 8小时
        $lt: new Date('2026-01-11T16:02:00.000Z')
      }
    }).sort({ timestamp: 1 }).limit(3);

    sampleAfter.forEach(record => {
      console.log(`  数据库（UTC）: ${record.timestamp.toISOString()}, SOC: ${record.soc.toFixed(2)}%`);
      console.log(`  对应UTC+8时间: ${new Date(record.timestamp.getTime() + UTC_OFFSET_MS).toISOString().replace('Z', '')} (本地)`);
      console.log('');
    });

    // 显示时间范围
    const dateRange = await SocData.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$timestamp' },
          maxDate: { $max: '$timestamp' }
        }
      }
    ]);

    if (dateRange.length > 0) {
      const minDate = new Date(dateRange[0].minDate);
      const maxDate = new Date(dateRange[0].maxDate);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('修正后的时间范围');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`最早（UTC）: ${minDate.toISOString()}`);
      console.log(`最早（UTC+8）: ${new Date(minDate.getTime() + UTC_OFFSET_MS).toISOString().replace('Z', ' +0800')}`);
      console.log(`最晚（UTC）: ${maxDate.toISOString()}`);
      console.log(`最晚（UTC+8）: ${new Date(maxDate.getTime() + UTC_OFFSET_MS).toISOString().replace('Z', ' +0800')}`);
    }

    console.log('\n✅ 时区修正完成！');
    console.log('\n说明：');
    console.log('- 数据库中现在存储的是正确的UTC时间');
    console.log('- CSV中标记为"2026-01-11"的数据，现在对应UTC的"2026-01-11 16:00"开始');
    console.log('- 查询时需要使用UTC时间范围\n');

  } catch (error) {
    console.error('❌ 修正失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

// 运行修正
fixSocTimezone();
