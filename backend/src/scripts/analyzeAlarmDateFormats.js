const mongoose = require('mongoose');
const Alarm = require('../models/Alarm');
const dotenv = require('dotenv');

dotenv.config();

async function analyzeAlarmDateFormats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    console.log('分析告警数据的日期格式问题\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 取样分析
    const samples = await Alarm.find({ stationId: 205 }).limit(10).sort({ alarmDate: 1 });

    console.log(`取样分析 (电站205的前10条告警):\n`);

    samples.forEach((alarm, idx) => {
      console.log(`告警 ${idx + 1}:`);
      console.log(`  alarmDate 存储值: ${alarm.alarmDate}`);
      console.log(`  alarmDate ISO: ${alarm.alarmDate.toISOString()}`);
      console.log(`  startTime 存储值: ${alarm.startTime}`);
      console.log(`  startTime ISO: ${alarm.startTime.toISOString()}`);
      console.log(`  endTime 存储值: ${alarm.endTime}`);
      console.log(`  endTime ISO: ${alarm.endTime.toISOString()}`);

      // 分析：假设startTime是日-月-年格式被错误解析
      const startISO = alarm.startTime.toISOString();
      const match = startISO.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [_, year, month, day] = match;
        console.log(`  如果是日月年格式，应该是: ${day}-${month}-${year} → ${year}-${month}-${day}`);
        console.log(`  但被错误解析成: ${startISO}`);

        // 尝试转换：假设当前的 YYYY-MM-DD 应该变成 YYYY-DD-MM
        const correctedDate = `${year}-${day}-${month}`;
        console.log(`  正确应该是: ${correctedDate}`);
      }
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('结论:\n');
    console.log('如果原始数据是 "01-11-2026" (日-月-年格式):');
    console.log('  - 被错误解析为 2026-11-01 (年-月-日)');
    console.log('  - 应该正确解析为 2026-01-11 (日是01，月是11 → 应该是11月1日，但存成了1月11日)');
    console.log('\n或者原始数据是 "11-01-2026" (日-月-年格式):');
    console.log('  - 被错误解析为 2026-11-01');
    console.log('  - 应该正确解析为 2026-01-11 (日是11，月是01 → 1月11日)\n');

    console.log('需要确认的问题:');
    console.log('1. 原始导入数据的格式是什么？(DD-MM-YYYY 还是其他)');
    console.log('2. startTime 2026-11-01 对应的原始数据是什么？');
    console.log('3. alarmDate 2026-01-10 对应的原始数据是什么？\n');

  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭\n');
  }
}

analyzeAlarmDateFormats();
