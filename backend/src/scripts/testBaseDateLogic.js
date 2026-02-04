// 测试baseDate构建逻辑

console.log('测试SOC图表baseDate构建逻辑\n');
console.log('═══════════════════════════════════════\n');

// 模拟不同的date格式
const testCases = [
  '2026-01-11',
  '2026-01-11T00:00:00.000Z',
  '2026-01-11T16:00:00.000Z'
];

testCases.forEach((date, idx) => {
  console.log(`测试 ${idx + 1}: date = "${date}"`);

  // 复制前端的逻辑
  const dateStr = date.includes('T') ? date.split('T')[0] : date;
  const [year, month, day] = dateStr.split('-').map(Number);

  // UTC+8的2026-01-11 00:00 = UTC的2026-01-10 16:00
  const baseDate = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0, 0));

  console.log(`  dateStr: ${dateStr}`);
  console.log(`  解析: year=${year}, month=${month}, day=${day}`);
  console.log(`  baseDate: ${baseDate.toISOString()}`);
  console.log(`  baseDate UTC时间: ${baseDate.getUTCFullYear()}-${String(baseDate.getUTCMonth() + 1).padStart(2, '0')}-${String(baseDate.getUTCDate()).padStart(2, '0')} ${String(baseDate.getUTCHours()).padStart(2, '0')}:00`);

  // 生成24小时的时间标签
  console.log('  24小时时间序列:');
  for (let hour = 0; hour < 24; hour += 6) {
    const hourTimestamp = new Date(baseDate.getTime() + hour * 60 * 60 * 1000);
    const label = `${String(hour).padStart(2, '0')}:00`;
    console.log(`    hour=${hour}: ${label} → ${hourTimestamp.toISOString()}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════\n');
console.log('结论:');
console.log('- 无论date是什么格式，都会提取YYYY-MM-DD部分');
console.log('- baseDate始终为目标日期前一天的16:00 UTC');
console.log('- hour=0时，时间戳为baseDate（前一天16:00 UTC）');
console.log('- hour=16时，时间戳为当天08:00 UTC');
console.log('- hour=23时，时间戳为当天15:00 UTC');
console.log('- 这个范围正好覆盖UTC+8时区的00:00-23:00\n');
