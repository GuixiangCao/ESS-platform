const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// 简单测试：不连接数据库，只测试拆分逻辑

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 模拟充放电策略
const mockStrategy = {
  timeslots: [
    { stime: '00:00', etime: '08:00', power: 500, ctype: 1 }, // 充电
    { stime: '08:00', etime: '11:00', power: 0, ctype: 0 },   // 待机
    { stime: '11:00', etime: '14:00', power: 800, ctype: 2 }, // 放电
    { stime: '14:00', etime: '17:00', power: 600, ctype: 1 }, // 充电
    { stime: '17:00', etime: '24:00', power: 0, ctype: 0 }    // 待机（排除）
  ]
};

// 模拟电价数据
const mockPriceData = {
  timingPrice: [
    { startTime: 0, endTime: 480, price: 0.4 },     // 00:00-08:00 谷
    { startTime: 480, endTime: 600, price: 0.7 },   // 08:00-10:00 平
    { startTime: 600, endTime: 780, price: 1.2 },   // 10:00-13:00 峰
    { startTime: 780, endTime: 1020, price: 0.7 },  // 13:00-17:00 平
    { startTime: 1020, endTime: 1440, price: 0.4 }  // 17:00-24:00 谷
  ],
  getPriceAtTime: function(minute) {
    for (const slot of this.timingPrice) {
      if (minute >= slot.startTime && minute < slot.endTime) {
        return slot.price;
      }
    }
    return 0;
  }
};

function getPowerAtTime(strategy, minuteOfDay) {
  if (!strategy || !strategy.timeslots) return null;

  for (const slot of strategy.timeslots) {
    const stime = timeToMinutes(slot.stime);
    const etime = timeToMinutes(slot.etime);

    if (minuteOfDay >= stime && minuteOfDay < etime) {
      return {
        power: slot.power || 0,
        ctype: slot.ctype,
        slotEnd: etime
      };
    }
  }

  return null;
}

// 测试案例
console.log('测试1: 短时间内的告警 (不跨时段)');
console.log('开始: 2025-12-26 12:30 (北京), 结束: 2025-12-26 13:30 (北京)');
console.log('预期: 1个时段, 11:00-14:00放电周期, 电价1.2元\n');

const start1 = new Date('2025-12-26T04:30:00.000Z'); // 12:30 Beijing
const end1 = new Date('2025-12-26T05:30:00.000Z');   // 13:30 Beijing
console.log('开始UTC:', start1);
console.log('结束UTC:', end1);

const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const startLocal = new Date(start1.getTime() + UTC_OFFSET_MS);
const startMinute = startLocal.getUTCHours() * 60 + startLocal.getUTCMinutes();
console.log('开始分钟:', startMinute, `(${Math.floor(startMinute/60)}:${startMinute%60})`);

const powerInfo = getPowerAtTime(mockStrategy, startMinute);
console.log('功率信息:', powerInfo);

const price = mockPriceData.getPriceAtTime(startMinute);
console.log('电价:', price);

const durationMs = end1.getTime() - start1.getTime();
const durationHours = durationMs / 1000 / 60 / 60;
console.log('持续时长:', durationHours, '小时');

const loss = durationHours * powerInfo.power * price;
console.log('损失:', loss.toFixed(2), '元');

console.log('\n' + '─'.repeat(80) + '\n');

console.log('测试2: 跨天告警');
console.log('开始: 2025-12-26 12:51 (北京), 结束: 2025-12-28 09:12 (北京)');
console.log('预期: 拆分成多个时段, 排除17:00-23:59时段\n');

const start2 = new Date('2025-12-26T04:51:33.000Z'); // 12:51:33 Beijing
const end2 = new Date('2025-12-28T01:12:32.000Z');   // 09:12:32 Beijing (28号)
console.log('开始UTC:', start2);
console.log('结束UTC:', end2);
console.log('总持续:', (end2 - start2) / 1000 / 60, '分钟');

// 简单拆分逻辑
console.log('\n手动拆分分析:');
console.log('─'.repeat(80));

// 第一天: 12-26 12:51:33 → 17:00
console.log('\n[第1天: 2025-12-26]');
console.log('  12:51:33 → 14:00 (放电周期结束)');
console.log('    时长: 1.14小时');
console.log('    功率: 800 kW (放电)');
console.log('    电价: 1.2 元/kWh (峰)');
console.log('    损失:', (1.14 * 800 * 1.2).toFixed(2), '元');

console.log('\n  14:00 → 17:00 (充电周期)');
console.log('    时长: 3小时');
console.log('    功率: 600 kW (充电)');
console.log('    电价: 0.7 元/kWh (平)');
console.log('    损失:', (3 * 600 * 0.7).toFixed(2), '元');

console.log('\n  17:00 → 23:59 [排除时段]');

// 第二天: 12-27 00:00 → 17:00
console.log('\n[第2天: 2025-12-27]');
console.log('  00:00 → 08:00 (充电周期)');
console.log('    时长: 8小时');
console.log('    功率: 500 kW (充电)');
console.log('    电价: 0.4 元/kWh (谷)');
console.log('    损失:', (8 * 500 * 0.4).toFixed(2), '元');

console.log('\n  08:00 → 11:00 [待机，不计损失]');

console.log('\n  11:00 → 14:00 (放电周期)');
console.log('    时长: 3小时');
console.log('    功率: 800 kW (放电)');
console.log('    电价: 峰/平混合');
console.log('    11:00-13:00: 2小时 × 800 × 1.2 =', (2 * 800 * 1.2).toFixed(2), '元');
console.log('    13:00-14:00: 1小时 × 800 × 0.7 =', (1 * 800 * 0.7).toFixed(2), '元');

console.log('\n  14:00 → 17:00 (充电周期)');
console.log('    时长: 3小时');
console.log('    功率: 600 kW (充电)');
console.log('    电价: 0.7 元/kWh (平)');
console.log('    损失:', (3 * 600 * 0.7).toFixed(2), '元');

console.log('\n  17:00 → 23:59 [排除时段]');

// 第三天: 12-28 00:00 → 09:12
console.log('\n[第3天: 2025-12-28]');
console.log('  00:00 → 08:00 (充电周期)');
console.log('    时长: 8小时');
console.log('    功率: 500 kW (充电)');
console.log('    电价: 0.4 元/kWh (谷)');
console.log('    损失:', (8 * 500 * 0.4).toFixed(2), '元');

console.log('\n  08:00 → 09:12 [待机，不计损失]');

console.log('\n' + '─'.repeat(80));
const totalLoss =
  (1.14 * 800 * 1.2) +  // 12-26 12:51-14:00
  (3 * 600 * 0.7) +     // 12-26 14:00-17:00
  (8 * 500 * 0.4) +     // 12-27 00:00-08:00
  (2 * 800 * 1.2) +     // 12-27 11:00-13:00
  (1 * 800 * 0.7) +     // 12-27 13:00-14:00
  (3 * 600 * 0.7) +     // 12-27 14:00-17:00
  (8 * 500 * 0.4);      // 12-28 00:00-08:00

console.log('\n预计总损失（按时段拆分）:', totalLoss.toFixed(2), '元');
console.log('原始损失（不拆分）:       3920.28 元');
console.log('差异:                    ', (totalLoss - 3920.28).toFixed(2), '元');
