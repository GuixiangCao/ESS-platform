const mongoose = require('mongoose');
const SocData = require('../models/SocData');
const dotenv = require('dotenv');

dotenv.config();

async function checkSocDataTiming() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const stationId = 205;
    const dateStr = '2026-01-11';

    console.log(`检查电站${stationId}在${dateStr}的SOC数据时间分布\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查询该日期的SOC数据
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log('查询条件:');
    console.log(`  stationId: ${stationId}`);
    console.log(`  timestamp >= ${startOfDay.toISOString()}`);
    console.log(`  timestamp < ${endOfDay.toISOString()}\n`);

    const socData = await SocData.find({
      stationId: parseInt(stationId),
      timestamp: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ timestamp: 1 });

    console.log(`找到 ${socData.length} 条SOC数据\n`);

    if (socData.length === 0) {
      console.log('没有SOC数据');
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

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('每小时数据量分布:\n');

    for (let h = 0; h < 24; h++) {
      const count = hourlyStats[h];
      const bar = '█'.repeat(Math.min(count / 5, 50));
      console.log(`  ${String(h).padStart(2, '0')}:00 - ${String(count).padStart(4, ' ')} 条 ${bar}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('前10条数据:\n');

    socData.slice(0, 10).forEach((data, idx) => {
      const hour = data.timestamp.getUTCHours();
      const minute = data.timestamp.getUTCMinutes();
      const second = data.timestamp.getUTCSeconds();

      console.log(`${idx + 1}. 设备: ${data.serialNumber}`);
      console.log(`   timestamp: ${data.timestamp.toISOString()}`);
      console.log(`   UTC时间: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
      console.log(`   SOC: ${data.soc}%`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('最后10条数据:\n');

    socData.slice(-10).forEach((data, idx) => {
      const hour = data.timestamp.getUTCHours();
      const minute = data.timestamp.getUTCMinutes();
      const second = data.timestamp.getUTCSeconds();

      console.log(`${socData.length - 10 + idx + 1}. 设备: ${data.serialNumber}`);
      console.log(`   timestamp: ${data.timestamp.toISOString()}`);
      console.log(`   UTC时间: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
      console.log(`   SOC: ${data.soc}%`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('总结:\n');

    const firstData = socData[0];
    const lastData = socData[socData.length - 1];
    const firstHour = firstData.timestamp.getUTCHours();
    const lastHour = lastData.timestamp.getUTCHours();

    console.log(`数据开始时间: ${firstData.timestamp.toISOString()}`);
    console.log(`数据开始小时: ${String(firstHour).padStart(2, '0')}:00`);
    console.log(`数据结束时间: ${lastData.timestamp.toISOString()}`);
    console.log(`数据结束小时: ${String(lastHour).padStart(2, '0')}:00\n`);

    // 检查0-15小时是否有数据
    let hasEarlyData = false;
    for (let h = 0; h < 16; h++) {
      if (hourlyStats[h] > 0) {
        hasEarlyData = true;
        break;
      }
    }

    if (!hasEarlyData) {
      console.log('⚠️ 0:00-15:00 没有SOC数据');
      console.log('   这就是为什么图表从16:00才开始显示\n');
    } else {
      console.log('✓ 0:00-15:00 有SOC数据\n');
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

checkSocDataTiming();
