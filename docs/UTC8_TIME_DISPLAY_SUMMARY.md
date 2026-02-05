# 时间显示统一为UTC+8 - 修改总结

## 修改概述

将所有收益损失相关的查询和显示统一为UTC+8时区，确保：
1. **数据存储**：CSV中的UTC+0时间 → 直接存储为UTC+0标准时间
2. **数据查询**：用户选择的UTC+8日期 → 减8小时 → 转为UTC时间范围查询
3. **数据显示**：数据库的UTC+0时间 → 加8小时 → 显示为UTC+8本地时间

**核心原则**：用户看到的时间是UTC+8本地时间。例如：
- CSV原始时间：`11/1/2026 19:55:38` (UTC+0)
- 前端显示：`2026-01-12 03:55:38` (UTC+8，加8小时)
- 用户查看"2026-01-12"时会看到这条告警 ✅

## 时间处理原则

1. **数据库存储格式**：UTC+0时间戳（标准UTC时间）
   - 例如：`2026-01-11T19:55:38.000Z` 表示 UTC+0 时间 2026-01-11 19:55:38

2. **显示策略**：将UTC+0时间戳加8小时，转换为UTC+8本地时间显示
   - 转换公式：`new Date(utcTimestamp.getTime() + 8 * 60 * 60 * 1000)`
   - 示例：UTC `2026-01-11T19:55:38.000Z` → 显示为 `2026-01-12 03:55:38` (UTC+8)
   - 使用 `getUTCHours()`, `getUTCMinutes()`, `getUTCDate()` 等方法读取转换后的时间

## 已修改的文件

### 1. 创建统一的时间格式化工具

**文件**: `frontend/src/utils/timeFormatter.js`

**核心逻辑**:
```javascript
const UTC_OFFSET = 8 * 60 * 60 * 1000; // UTC+8偏移量（8小时的毫秒数）

// 将UTC+0时间戳转换为UTC+8时间
function convertToUTC8(datetime) {
  if (!datetime) return null;
  const date = datetime instanceof Date ? datetime : new Date(datetime);
  // 加8小时到UTC时间，得到UTC+8本地时间
  return new Date(date.getTime() + UTC_OFFSET);
}
```

**功能**:
- `formatUTCAsLocal(datetime, includeSeconds)` - 格式化为 "2026-01-12 03:55:38" (UTC+8)
  - 输入: `2026-01-11T19:55:38.000Z` (UTC+0)
  - 输出: `2026-01-12 03:55:38` (UTC+8)
- `formatUTCAsLocalCN(datetime, includeSeconds)` - 格式化为 "2026年01月12日 03:55:38"
- `formatUTCDate(datetime)` - 只格式化日期 "2026-01-12"
- `formatUTCTime(datetime, includeSeconds)` - 只格式化时间 "03:55:38"
- `formatUTCDateCN(datetime)` - 中文日期 "2026年01月12日"
- `formatUTCYearMonth(datetime)` - 年月 "2026年01月"

### 2. AlarmModal.jsx - 告警详情弹窗

**修改内容**:
```javascript
// 导入时间格式化工具
import { formatUTCAsLocal, formatUTCDateCN } from '../utils/timeFormatter';

// 使用UTC+8时间格式化
const formatDateTime = (dateTime) => {
  return formatUTCAsLocal(dateTime, true);
};

// 使用UTC+8时间格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return formatUTCDateCN(dateStr);
};
```

**影响范围**:
- 告警开始时间显示
- 告警结束时间显示
- 告警日期标题显示

### 3. SocDetailModal.jsx - SOC详情弹窗

**已修改状态**: ✅
- 导入时间格式化工具：`import { formatUTCTime, formatUTCDateCN } from '../utils/timeFormatter'`
- 更新 `formatTime` 函数使用 `formatUTCTime`（自动加8小时）
- 更新 `formatDate` 函数使用 `formatUTCDateCN`
- 更新告警时间标记逻辑（lines 229-247）：
  ```javascript
  const UTC_OFFSET = 8 * 60 * 60 * 1000;
  const startTime = new Date(new Date(alarm.startTime).getTime() + UTC_OFFSET);
  const endTime = new Date(new Date(alarm.endTime).getTime() + UTC_OFFSET);
  ```
- SOC曲线X轴时间和告警标记正确显示为UTC+8

### 4. 后端查询逻辑

**文件**:
- `backend/src/controllers/socController.js`
- `backend/src/routes/alarms.js`

**修改内容**:
- **SOC数据查询**：用户传入的日期是UTC+8本地日期，需要减8小时转为UTC时间范围查询
- **告警数据查询**：基于 `startTime` 字段查询（而不是 `alarmDate`）

**核心逻辑**:
```javascript
// 用户选择 "2026-01-11" (UTC+8本地日期)
const [year, month, day] = dateStr.split('-').map(Number);
const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时的毫秒数

// 构建UTC+8本地时间的00:00和24:00
const localStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
const localEndOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

// 减去8小时，转换为UTC时间范围
const startOfDay = new Date(localStartOfDay.getTime() - UTC_OFFSET_MS);
const endOfDay = new Date(localEndOfDay.getTime() - UTC_OFFSET_MS);

// 查询：2026-01-10T16:00:00.000Z 到 2026-01-11T16:00:00.000Z
const alarms = await Alarm.find({
  stationId: parseInt(stationId),
  startTime: {
    $gte: startOfDay,
    $lt: endOfDay
  }
}).sort({ startTime: 1 });
```

**效果**：
- 用户查看"2026-01-11"的告警时
- 只会显示UTC+8本地时间为"2026-01-11 XX:XX:XX"的告警
- 不会出现"2026-01-12"的告警数据

### 5. 数据导入

**文件**: `backend/src/scripts/clearAndReimportAlarms.js`

**功能**:
- 清除所有旧数据
- 重新导入CSV文件
- 正确解析CSV中的日期格式（日/月/年 → 年-月-日）
- 将CSV中的时间当作UTC+8本地时间，存储为UTC时间戳

**CSV时间格式处理**:
```javascript
// CSV格式：16/1/2026 02:14:43（日/月/年 时:分:秒）
// CSV中的时间是UTC+0标准时间，直接存储
// 存储为：2026-01-16T02:14:43.000Z (UTC+0时间戳)
// 显示时：加8小时 → 2026-01-16 10:14:43 (UTC+8)
```

**注意**：CSV中的时间是UTC+0标准时间，导入时直接存储，不做时区转换。

## 验证结果

### 电站205的告警示例

**示例告警**: `35917343-fec5-468e-85e8-5fd7ad334533`

**时间转换流程**：
- CSV原始时间：`11/1/2026 19:55:38` (UTC+0标准时间)
- 数据库存储：`2026-01-11T19:55:38.000Z` (UTC+0)
- 前端显示：`2026-01-12 03:55:38` (UTC+8，加8小时后) ✅

**查询逻辑验证**：

1. **用户查看 2026-01-11 (UTC+8)**：
   - 查询范围（UTC+0）: `2026-01-10T16:00:00.000Z` 到 `2026-01-11T16:00:00.000Z`
   - 告警时间 `19:55:38` 不在范围内（19:55 > 16:00）
   - **查不到这条告警** ✅

2. **用户查看 2026-01-12 (UTC+8)**：
   - 查询范围（UTC+0）: `2026-01-11T16:00:00.000Z` 到 `2026-01-12T16:00:00.000Z`
   - 告警时间 `19:55:38` 在范围内（16:00 < 19:55 < 次日16:00）
   - **查到4条告警，显示为 2026-01-12 03:55:38 (UTC+8)** ✅

**结论**：用户在"2026-01-12"看到这条告警，显示时间为 `2026-01-12 03:55:38`，符合预期！

### 数据库状态

- ✅ 总告警数：6,105 条
- ✅ 所有alarmId唯一（无重复）
- ✅ 时间格式正确

## 注意事项

1. **CSV和数据库都是UTC+0标准时间**
   - CSV中的时间是UTC+0标准时间
   - 数据库直接存储UTC+0时间戳，不做转换
   - 例如：CSV `11/1/2026 19:55:38` (UTC+0) → 存为 `2026-01-11T19:55:38.000Z` (UTC+0)

2. **显示时需要加8小时转换为UTC+8**
   - 转换公式：`new Date(utcTime.getTime() + 8 * 60 * 60 * 1000)`
   - 然后使用 `getUTCHours()`, `getUTCMinutes()` 等方法读取
   - 不要使用 `toLocaleString()` 等方法，会进行浏览器时区转换
   - 例如：`2026-01-11T19:55:38.000Z` (UTC+0) → 显示 `2026-01-12 03:55:38` (UTC+8)

3. **查询时需要将用户日期转换为UTC时间范围**
   - 用户选择的日期是UTC+8本地日期
   - 查询前需要减去8小时转为UTC时间范围
   - 例如：用户选择 "2026-01-12" → 查询 `2026-01-11T16:00:00.000Z` 到 `2026-01-12T16:00:00.000Z`
   - **这样才能查到所有UTC+8时间在该日期的告警**

4. **使用统一的 timeFormatter.js 工具**
   - 所有时间显示都应使用 `timeFormatter.js` 中的函数
   - 这些函数内部已经处理了+8小时的转换
   - 不要直接对UTC时间戳使用 `getUTCHours()` 等方法

5. **查询告警时使用 startTime 字段**
   - 不要使用 `alarmDate` 字段（会有时区偏移问题）
   - 使用UTC时间范围查询 `startTime` 字段

## 后续维护

### 前端时间显示

如果需要添加新的时间显示功能，请：

1. 导入 `timeFormatter.js` 工具
   ```javascript
   import { formatUTCAsLocal, formatUTCTime, formatUTCDate, formatUTCDateCN } from '../utils/timeFormatter';
   ```

2. 使用相应的格式化函数
   - **完整日期时间**：`formatUTCAsLocal(datetime, true)` → "2026-01-12 03:55:38"
     - 输入：`2026-01-11T19:55:38.000Z` (UTC+0)
     - 输出：`2026-01-12 03:55:38` (UTC+8)
   - **仅时间**：`formatUTCTime(datetime, true)` → "03:55:38"
   - **仅日期**：`formatUTCDate(datetime)` → "2026-01-12"
   - **中文日期**：`formatUTCDateCN(datetime)` → "2026年01月12日"

3. **不要直接操作UTC时间戳**
   - ❌ 错误：`date.getUTCHours()` 直接读取
   - ✅ 正确：使用 `formatUTCTime(date)` 或先加8小时再读取

### 后端时间查询

如果需要添加新的日期查询功能，请：

1. **将用户传入的日期（UTC+8）转换为UTC时间范围**
   ```javascript
   // 用户传入的日期是UTC+8本地日期
   const [year, month, day] = dateStr.split('-').map(Number);
   const UTC_OFFSET_MS = 8 * 60 * 60 * 1000; // 8小时的毫秒数

   // 构建UTC+8本地时间的00:00
   const localStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
   const localEndOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

   // 减去8小时，转换为UTC时间范围
   const startOfDay = new Date(localStartOfDay.getTime() - UTC_OFFSET_MS);
   const endOfDay = new Date(localEndOfDay.getTime() - UTC_OFFSET_MS);
   ```

2. **使用 `startTime` 字段查询**
   ```javascript
   const alarms = await Alarm.find({
     stationId: parseInt(stationId),
     startTime: {
       $gte: startOfDay,
       $lt: endOfDay
     }
   }).sort({ startTime: 1 });
   ```

3. **测试验证**
   - 确认显示的时间是UTC+8本地时间（比UTC+0时间多8小时）
   - 例如：
     - 数据库存储: `2026-01-11T19:55:38.000Z` (UTC+0)
     - 前端显示: `2026-01-12 03:55:38` (UTC+8)
   - 用户查看某个UTC+8日期时，会看到所有UTC+8时间在该日期的告警

## 相关文件列表

**前端**:
- `frontend/src/utils/timeFormatter.js` (新建)
- `frontend/src/components/AlarmModal.jsx` (已修改)
- `frontend/src/components/SocDetailModal.jsx` (已修改)
- `frontend/src/pages/LossAnalysis.jsx` (使用formatDate, formatDateTime)

**后端**:
- `backend/src/controllers/socController.js` (已修改)
- `backend/src/scripts/clearAndReimportAlarms.js` (新建)
- `backend/src/scripts/verifyImportedData.js` (新建)

**数据**:
- `国内9-11故障.csv`
- `2025-12月故障告警.csv`
- `国内2026-1月故障列表.csv`
