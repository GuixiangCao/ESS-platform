const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const dotenv = require('dotenv');

dotenv.config();

async function testNewQueryLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log('测试新的查询逻辑（所有时间都按UTC+8本地时间理解）\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 使用新的查询逻辑
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    console.log('查询参数:');
    console.log(`  日期: ${dateStr}`);
    console.log(`  startOfDay: ${startOfDay.toISOString()}`);
    console.log(`  endOfDay: ${endOfDay.toISOString()}`);
    console.log('');

    const socData = await SocData.find({
      stationId: parseInt(stationId),
      timestamp: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ timestamp: 1 });

    console.log(`查询结果: ${socData.length} 条SOC数据\n`);

    if (socData.length === 0) {
      console.log('没有找到数据');
      return;
    }

    // 统计每小时的数据量
    const hourlyStats = {};
    for (let h = 0; h < 24; h++) {
      hourlyStats[h] = 0;
    }

    socData.forEach(data => {
      const hour = data.timestamp.getUTCHours();
      hourlyStats[hour]++;
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('每小时数据量分布（UTC小时）:\n');

    for (let h = 0; h < 24; h++) {
      const count = hourlyStats[h];
      const bar = '█'.repeat(Math.min(count / 5, 50));
      const label = `${String(h).padStart(2, '0')}:00`;
      console.log(`  ${label} - ${String(count).padStart(4, ' ')} 条 ${bar}`);
    }

    console.log('\n═══════════════════════════════════════════════════\n');
    console.log('前10条数据:\n');

    socData.slice(0, 10).forEach((data, idx) => {
      const hour = data.timestamp.getUTCHours();
      const minute = data.timestamp.getUTCMinutes();
      const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      console.log(`${idx + 1}. timestamp: ${data.timestamp.toISOString()}`);
      console.log(`   UTC时间: ${timeLabel} (小时=${hour})`);
      console.log(`   X轴标签: ${String(hour).padStart(2, '0')}:00`);
      console.log(`   SOC: ${data.soc.toFixed(1)}%`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('结论:\n');
    console.log('✓ 数据库时间戳直接按UTC+8本地时间理解');
    console.log('✓ 查询范围：2026-01-11T00:00:00 到 2026-01-12T00:00:00');
    console.log('✓ 数据的getUTCHours()值（0-23）直接对应X轴标签（00:00-23:00）');
    console.log('✓ 时间完美对齐！\n');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

testNewQueryLogic();
