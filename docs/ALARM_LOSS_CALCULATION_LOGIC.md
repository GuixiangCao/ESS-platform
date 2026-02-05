# 故障产生损失的计算逻辑

## 目录
1. [核心公式](#核心公式)
2. [计算流程](#计算流程)
3. [前置条件检查](#前置条件检查)
4. [时段拆分算法](#时段拆分算法)
5. [重叠告警去重](#重叠告警去重)
6. [节假日处理](#节假日处理)
7. [特殊规则](#特殊规则)

---

## 核心公式

### 单时段损失计算
```
损失 = 持续时长(小时) × 功率(kW) × 电价(元/kWh)
```

### 多时段损失计算（跨天/跨电价区间）
```
总损失 = Σ(各时段损失)
       = Σ(时段持续时长 × 时段功率 × 时段电价)
```

---

## 计算流程

### 第一步：单个告警损失计算 (`calculateAlarmLoss`)

```
输入: 告警对象
  ├─ alarmId: 告警ID
  ├─ stationId: 电站ID
  ├─ startTime: 开始时间(UTC)
  ├─ endTime: 结束时间(UTC)
  ├─ durationMinutes: 持续时长(分钟)
  ├─ device: 设备类型
  └─ alarmName: 告警名称

输出: 损失数据
  ├─ loss: 总损失(元)
  ├─ timeLoss: 时间损失(元)
  ├─ timeslotCount: 拆分时段数
  ├─ lossDetails: 时段明细[]
  │   ├─ startTime: 时段开始
  │   ├─ endTime: 时段结束
  │   ├─ durationHours: 时长
  │   ├─ power: 功率
  │   ├─ price: 电价
  │   ├─ ctype: 充放电类型(1=充电, 2=放电)
  │   └─ calculatedLoss: 时段损失
  ├─ socTargetLoss: SOC目标偏差(仅参考)
  └─ calculationNote: 计算说明
```

### 第二步：电站告警损失汇总 (`calculateStationAlarmLosses`)

```
1. 查询时间范围内的所有告警
2. 标记每个告警的节假日状态
3. 计算每个告警的单独损失（用于展示）
4. 按设备+日期分组，合并时间重叠的告警
5. 只统计工作日告警的去重后损失
6. 返回汇总结果
```

---

## 前置条件检查

### 1. 排除不会造成停机的故障
```javascript
const nonStopAlarms = [
  '直流输入电控开关开路'
];

if (nonStopAlarms.includes(alarmName)) {
  return { loss: 0, reason: '此类故障不会造成停机' };
}
```

### 2. 必需数据检查
```javascript
// 必须存在以下数据才能计算损失：
✓ 电站网关信息 (StationGateway)
✓ 充放电策略 (ChargingStrategy)
✓ 电价数据 (ElectricityPrice)

// 任一缺失返回 loss: 0
```

### 3. 时间排除规则
```javascript
// 排除 17:00-23:59:59 开始的告警
if (startMinuteOfDay >= 1020) { // 1020分钟 = 17:00
  return { loss: 0, reason: '告警发生在排除时段内' };
}

// 注意：从17:00之前开始的告警可以延续到17:00后，
// 但时段拆分算法会自动跳过17:00-23:59时段
```

---

## 时段拆分算法

### 算法目标
将长时间告警拆分为多个独立时段，确保每个时段使用正确的功率和电价。

### 拆分边界
1. **日期边界**: 00:00 (跨天自动拆分)
2. **电价边界**: 电价时段切换点 (如 08:00, 10:00, 13:00, 17:00)
3. **功率边界**: 充放电周期切换点 (如 00:00→08:00→10:00→12:00...)
4. **排除边界**: 17:00 (进入排除时段)

### 拆分流程

```javascript
function splitAlarmIntoTimeslots(startTime, endTime, strategy, priceData) {
  const timeslots = [];
  let currentTime = startTime;

  while (currentTime < endTime) {
    // 1. 转换为北京时间
    const beijingTime = currentTime + 8小时;
    const currentMinute = beijingTime的分钟数;

    // 2. 跳过排除时段 (17:00-23:59)
    if (currentMinute >= 1020) {
      currentTime = 第二天00:00;
      continue;
    }

    // 3. 获取当前功率信息
    const powerInfo = 从充放电策略获取(currentMinute);

    // 4. 跳过非充放电时段
    if (!powerInfo || power <= 0 || (ctype != 1 && ctype != 2)) {
      currentTime = 下一个充放电时段开始时间;
      continue;
    }

    // 5. 确定时段结束时间（取最早者）
    const segmentEnd = Math.min(
      告警结束时间,
      充放电周期结束时间,
      电价时段结束时间,
      17:00,
      23:59
    );

    // 6. 计算时段损失
    const duration = segmentEnd - currentTime;
    const price = 从电价数据获取(currentMinute);
    const loss = duration × power × price;

    timeslots.push({
      startTime, endTime, duration,
      power, price, ctype, loss
    });

    // 7. 移动到下一时段
    currentTime = segmentEnd;
  }

  return timeslots;
}
```

### 示例：跨天告警拆分

**告警**: 2025-12-26 12:51 → 2025-12-28 09:12 (44.35小时)

**充放电策略**:
```
00:00-08:00: 90kW  充电(ctype=1)
08:00-10:00: 0kW   待机(ctype=3) ← 跳过
10:00-12:00: 300kW 放电(ctype=2)
12:00-14:00: 300kW 充电(ctype=1)
14:00-19:00: 120kW 放电(ctype=2)
19:00-24:00: 0kW   待机(ctype=3) ← 跳过
```

**电价数据**:
```
00:00-08:00: 0.29元/kWh (谷)
08:00-10:00: 0.29元/kWh (谷)
10:00-11:00: 1.28元/kWh (峰)
11:00-13:00: 0.29元/kWh (谷)
13:00-15:00: 0.78元/kWh (平)
15:00-17:00: 1.28元/kWh (峰)
17:00-24:00: [自动排除]
```

**拆分结果** (12个时段):

```
日期         时段              时长   功率   电价   类型  损失
─────────────────────────────────────────────────────────
2025-12-26   12:51→13:00      0.14h  300kW  0.29  充电  ¥12.45
2025-12-26   13:00→14:00      1.00h  300kW  0.78  充电  ¥232.62
2025-12-26   14:00→15:00      1.00h  120kW  0.78  放电  ¥93.05
2025-12-26   15:00→17:00      2.00h  120kW  1.28  放电  ¥307.06
             [17:00-23:59 自动跳过]
─────────────────────────────────────────────────────────
2025-12-27   00:00→08:00      8.00h   90kW  0.29  充电  ¥212.15
             [08:00-10:00 待机跳过]
2025-12-27   10:00→11:00      1.00h  300kW  1.28  放电  ¥383.82
2025-12-27   11:00→12:00      1.00h  300kW  0.29  放电  ¥88.39
2025-12-27   12:00→13:00      1.00h  300kW  0.29  充电  ¥88.39
2025-12-27   13:00→14:00      1.00h  300kW  0.78  充电  ¥232.62
2025-12-27   14:00→15:00      1.00h  120kW  0.78  放电  ¥93.05
2025-12-27   15:00→17:00      2.00h  120kW  1.28  放电  ¥307.06
             [17:00-23:59 自动跳过]
─────────────────────────────────────────────────────────
2025-12-28   00:00→08:00      8.00h   90kW  0.29  充电  ¥212.15
             [08:00-09:12 待机跳过]
─────────────────────────────────────────────────────────
总计                                                      ¥2,262.79
```

---

## 重叠告警去重

### 问题场景
同一时刻、同一设备可能存在多个告警，如果直接累加会重复计算损失。

**示例**:
```
告警A: 10:00-11:00, PCS, 损失¥100
告警B: 10:30-11:30, PCS, 损失¥100
─────────────────────────────────
如果直接累加: ¥200 (错误❌)
实际总损失: ¥150 (正确✓)
```

### 去重算法 (`mergeTimeIntervals`)

```javascript
function mergeTimeIntervals(intervals) {
  // 1. 按开始时间排序
  intervals.sort((a, b) => a.start - b.start);

  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];

    // 2. 如果时间重叠或相邻（允许1秒误差）
    if (current.start <= last.end + 1000) {
      // 合并：取最晚的结束时间
      last.end = Math.max(last.end, current.end);
      last.alarmIds.push(current.alarmId);
    } else {
      // 不重叠，添加新区间
      merged.push(current);
    }
  }

  return merged;
}
```

### 去重流程

```
1. 按设备+日期分组告警
   groupKey = `${date}_${device}`

2. 提取每组的时间区间
   intervals = [
     { start: alarm1.startTime, end: alarm1.endTime },
     { start: alarm2.startTime, end: alarm2.endTime },
     ...
   ]

3. 合并重叠区间
   merged = mergeTimeIntervals(intervals)

4. 对每个合并后的区间计算损失
   for (interval of merged) {
     mergedAlarm = { ...sampleAlarm, startTime: interval.start, endTime: interval.end };
     loss = calculateAlarmLoss(mergedAlarm);
     totalLoss += loss;
   }
```

### 示例：时间重叠去重

**原始告警**:
```
告警1: 10:00-11:00, PCS
告警2: 10:30-11:30, PCS
告警3: 12:00-13:00, PCS
```

**合并后**:
```
合并区间1: 10:00-11:30 (包含告警1+2)
合并区间2: 12:00-13:00 (告警3独立)
```

**损失计算**:
```
合并区间1损失 = 1.5小时 × 功率 × 电价
合并区间2损失 = 1.0小时 × 功率 × 电价
总损失 = 区间1 + 区间2
```

---

## 节假日处理

### 节假日标记
```javascript
// 查询每个告警的日期是否为节假日
const alarmDate = alarm.startTime的日期部分;
const isHoliday = Holiday.checkHolidayDates([alarmDate]);
```

### 损失统计规则

```
┌─────────────────────────────────────────────────────────┐
│ 告警类型         │ 是否显示  │ 是否计算损失  │ 是否计入总损失 │
├─────────────────────────────────────────────────────────┤
│ 工作日告警       │    ✓     │      ✓       │      ✓        │
│ 节假日告警       │    ✓     │      ✓       │      ✗        │
└─────────────────────────────────────────────────────────┘
```

**重要说明**:
- 节假日告警**仍然计算损失**（用于展示和记录）
- 但**不计入电站总损失**（totalLoss只统计工作日）
- 节假日损失单独统计在其他模块

### 实现代码
```javascript
// 第一步：计算所有告警损失（含节假日，用于展示）
const alarmsWithLoss = [];
for (const alarm of alarms) {
  const isHoliday = holidayMap[alarm.date];
  const lossData = await calculateAlarmLoss(alarm);

  alarmsWithLoss.push({
    ...lossData,
    isHoliday  // 标记
  });
}

// 第二步：只统计工作日告警的去重损失
for (const [group, alarms] of alarmGroups) {
  const isHoliday = holidayMap[group.date];

  if (isHoliday) {
    continue;  // ← 跳过节假日
  }

  const merged = mergeTimeIntervals(alarms);
  for (const interval of merged) {
    const loss = calculateAlarmLoss(interval);
    workdayLoss += loss;
  }
}

// 返回结果
return {
  totalLoss: workdayLoss,  // 只包含工作日
  alarms: alarmsWithLoss   // 包含所有告警（带isHoliday标记）
};
```

---

## 特殊规则

### 1. SOC达标检查（已改为仅参考）

**原逻辑** (已废弃):
```
如果周期结束时SOC达标 → 损失 = 0
如果周期结束时SOC未达标 → 损失 = 时间损失
```

**当前逻辑** (时段拆分模式):
```
始终计算时间损失
SOC达标情况仅作为参考信息返回，不影响损失计算
```

**原因**: 时段拆分模式下，告警可能跨越多个充放电周期，难以判断单一SOC达标标准。

### 2. 充放电类型 (ctype)
```
ctype = 0: 待机  → 跳过，不计损失
ctype = 1: 充电  → 计算损失
ctype = 2: 放电  → 计算损失
ctype = 3: 其他  → 跳过，不计损失
```

### 3. 功率为0的时段
```
if (power <= 0) {
  跳过该时段，不计损失
}
```

### 4. 时区处理
```
数据库存储: UTC时间
显示/计算: 北京时间 (UTC+8)

转换方式:
const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const beijingTime = new Date(utcTime.getTime() + UTC_OFFSET_MS);
```

### 5. 精度控制
```
时间: 精确到秒
时长: 保留6位小数（微秒级精度）
损失: 保留2位小数（分）
```

---

## 完整计算流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 用户请求: 计算电站287 2025-12-26 的告警损失                    │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 查询告警数据                                          │
│  └─ Alarm.findByStationAndDateRange(287, '2025-12-26')      │
│     → 154个告警                                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 标记节假日                                            │
│  └─ Holiday.checkHolidayDates(['2025-12-26'])               │
│     → 2025-12-26 是工作日                                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 计算每个告警的单独损失（用于展示）                      │
│  for (alarm of 154个告警) {                                   │
│    ├─ 前置检查                                                │
│    │   ├─ ✓ 不在排除列表                                      │
│    │   ├─ ✓ 有网关信息                                        │
│    │   ├─ ✓ 有充放电策略                                      │
│    │   ├─ ✓ 有电价数据                                        │
│    │   └─ ✓ 不在17:00-23:59时段                               │
│    ├─ 时段拆分                                                │
│    │   └─ splitAlarmIntoTimeslots()                          │
│    │       → 跨天告警拆分为12个时段                            │
│    │       → 短告警可能是1-2个时段                             │
│    └─ 计算损失                                                │
│        ├─ 时段1: 0.14h × 300kW × 0.29 = ¥12.45              │
│        ├─ 时段2: 1.00h × 300kW × 0.78 = ¥232.62             │
│        └─ ...                                                 │
│        → 总计: ¥2,262.79                                      │
│  }                                                            │
│  → alarmsWithLoss = [154个告警带损失数据]                      │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 按设备+日期分组                                        │
│  groupKey = `${date}_${device}`                              │
│  → { '2025-12-26_lc': [告警1, 告警2, ...],                    │
│      '2025-12-26_pcs': [告警10, 告警11, ...],                 │
│      ...                                                      │
│    }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: 合并每组内的时间重叠                                   │
│  for (group of groups) {                                     │
│    if (group是节假日) continue; ← 跳过节假日                   │
│                                                               │
│    intervals = 提取时间区间;                                   │
│    merged = mergeTimeIntervals(intervals);                   │
│    → 原始3个告警 → 合并为2个区间                               │
│                                                               │
│    for (interval of merged) {                                │
│      mergedAlarm = { startTime, endTime };                   │
│      loss = calculateAlarmLoss(mergedAlarm);                 │
│      workdayLoss += loss;                                    │
│    }                                                          │
│  }                                                            │
│  → workdayLoss = ¥4,781.27 (去重后)                           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: 返回结果                                              │
│  {                                                            │
│    stationId: 287,                                           │
│    alarmCount: 154,                                          │
│    workdayAlarmCount: 154,                                   │
│    holidayAlarmCount: 0,                                     │
│    totalLoss: 4781.27,  ← 去重后的工作日损失                  │
│    alarms: [                                                 │
│      {                                                        │
│        alarmId: '986a3968...',                               │
│        loss: 2262.79,      ← 单独计算的损失（仅供参考）        │
│        timeslotCount: 12,  ← 拆分时段数                       │
│        lossDetails: [...], ← 12个时段明细                     │
│        isHoliday: false    ← 节假日标记                       │
│      },                                                       │
│      ...                                                      │
│    ]                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据流示意

```
输入数据
  ├─ 告警数据 (Alarm)
  ├─ 充放电策略 (ChargingStrategy)
  ├─ 电价数据 (ElectricityPrice)
  ├─ 网关信息 (StationGateway)
  └─ 节假日数据 (Holiday)
       ↓
前置检查
  ├─ 排除不停机故障
  ├─ 排除17:00-23:59时段
  └─ 验证必需数据
       ↓
时段拆分算法
  ├─ 识别跨天边界
  ├─ 识别电价边界
  ├─ 识别功率边界
  └─ 跳过排除时段
       ↓
单时段损失计算
  └─ 时长 × 功率 × 电价
       ↓
时段损失汇总
  └─ Σ(各时段损失)
       ↓
告警展示用损失
  ├─ 工作日: 显示 + 计入总损失
  └─ 节假日: 显示 + 不计入总损失
       ↓
去重处理
  ├─ 按设备+日期分组
  ├─ 合并时间重叠
  └─ 重新计算合并区间损失
       ↓
最终输出
  ├─ totalLoss: 去重后工作日总损失
  └─ alarms[]: 所有告警带单独损失
```

---

## API调用示例

### 计算单个告警损失
```javascript
const alarm = await Alarm.findOne({ alarmId: '986a3968...' });

const result = await alarmLossCalculator.calculateAlarmLoss(
  alarm,
  '330000',  // regionId
  0,         // userType (工商业)
  1          // voltageType
);

console.log(result.loss);           // ¥2262.79
console.log(result.timeslotCount);  // 12
console.log(result.lossDetails);    // 12个时段明细
```

### 计算电站所有告警损失
```javascript
const result = await alarmLossCalculator.calculateStationAlarmLosses(
  287,            // stationId
  '2025-12-26',   // startDate
  '2025-12-26',   // endDate
  '330000',       // regionId
  0,              // userType
  1               // voltageType
);

console.log(result.totalLoss);        // ¥4781.27 (去重后)
console.log(result.alarmCount);       // 154
console.log(result.alarms.length);    // 154
console.log(result.alarms[0].loss);   // 单个告警损失（参考）
```

---

## 关键文件

- **主文件**: `backend/src/services/alarmLossCalculator.js`
- **测试脚本**:
  - `backend/scripts/testSingleAlarmTimeslot.js` - 单告警测试
  - `backend/scripts/detailedLossAnalysis.js` - 详细分析
  - `backend/scripts/exportAllAlarms.js` - 导出所有告警

---

## 版本历史

- **v1.0** (2025-12): 初始版本，单时间点计算
- **v2.0** (2026-01): 添加去重逻辑
- **v3.0** (2026-02): 实现时段拆分算法 ✨ **当前版本**

---

## 常见问题

### Q1: 为什么告警单独损失之和 ≠ 总损失？
**A**: 因为存在时间重叠的告警，总损失经过去重处理。

示例:
```
告警1单独损失: ¥100
告警2单独损失: ¥100
单独损失之和:   ¥200  ← 用于参考
实际总损失:     ¥150  ← 去重后（正确值）
差异:          -¥50   ← 重叠部分
```

### Q2: 节假日告警为什么显示损失但不计入总损失？
**A**: 节假日损失单独统计在其他模块（如节假日损失分析）。设备停机损失只统计工作日。

### Q3: 为什么17:00-23:59时段被排除？
**A**: 根据业务规则，该时段为计划内停机维护时段，不计算损失。

### Q4: SOC达标检查还在使用吗？
**A**: 在时段拆分模式下，SOC达标检查结果仅作为参考信息返回，不影响损失计算。始终按时间损失计算。

### Q5: 时段拆分后损失变大还是变小？
**A**: 更准确，不是简单的变大或变小。时段拆分确保每个时段使用正确的功率和电价，避免了使用单一时间点数据估算整个告警期间的误差。

示例:
```
不拆分: 用12:51的功率(300kW)和电价(0.29元) × 44.35h = 错误
拆分后: 每个时段用各自的功率和电价 = 准确
```

---

**文档生成时间**: 2026-02-04
**文档版本**: v3.0
**维护者**: ESS Platform Team
