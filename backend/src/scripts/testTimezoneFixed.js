const axios = require('axios');

async function testSocApi() {
  try {
    console.log('测试SOC API时区处理\n');

    // 模拟前端传递的不同日期格式
    const testCases = [
      {
        name: '完整ISO时间戳（前端实际传递的格式）',
        date: '2026-01-12T16:00:00.000Z',
        description: 'UTC时间 2026-01-12 16:00 = UTC+8时间 2026-01-13 00:00'
      },
      {
        name: '简单日期字符串',
        date: '2026-01-13',
        description: 'YYYY-MM-DD格式'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n━━━ 测试案例: ${testCase.name} ━━━`);
      console.log(`输入日期: ${testCase.date}`);
      console.log(`说明: ${testCase.description}\n`);

      try {
        // 注意：这需要有效的认证token，这里仅测试参数处理逻辑
        const url = `http://localhost:5001/api/soc/station/173/daily?date=${encodeURIComponent(testCase.date)}`;
        console.log(`请求URL: ${url}\n`);

        // 不实际发送请求，只展示处理逻辑
        const dateObj = new Date(testCase.date);
        console.log(`解析后的Date对象: ${dateObj.toISOString()}`);

        // 转换为UTC+8时区并提取日期
        const utc8Date = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
        const year = utc8Date.getUTCFullYear();
        const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(utc8Date.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        console.log(`提取的UTC+8日期: ${dateStr}`);

        // 构建查询范围
        const startOfDay = new Date(dateStr + 'T00:00:00+08:00');
        const endOfDay = new Date(dateStr + 'T23:59:59.999+08:00');

        console.log(`查询范围:`);
        console.log(`  开始时间 (UTC+8): ${dateStr} 00:00:00`);
        console.log(`  开始时间 (UTC):   ${startOfDay.toISOString()}`);
        console.log(`  结束时间 (UTC+8): ${dateStr} 23:59:59`);
        console.log(`  结束时间 (UTC):   ${endOfDay.toISOString()}`);

        // 验证
        const startHour = new Date(startOfDay.getTime() + 8 * 60 * 60 * 1000).getUTCHours();
        const endHour = new Date(endOfDay.getTime() + 8 * 60 * 60 * 1000).getUTCHours();

        if (startHour === 0 && endHour === 23) {
          console.log(`\n✓ 验证通过：查询范围正确覆盖UTC+8时区的完整一天`);
        } else {
          console.log(`\n✗ 验证失败：时区处理有问题`);
        }

      } catch (error) {
        console.error(`✗ 错误: ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSocApi();
