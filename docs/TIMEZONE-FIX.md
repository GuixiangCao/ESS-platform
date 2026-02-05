# UTC+8 时区修复说明

## 问题描述

用户在查看SOC详情时遇到 **500 Internal Server Error**，错误信息：
```
CastError: Cast to date failed for value "Invalid Date" (type Date) at path "timestamp"
```

## 根本原因

1. **前端传递格式**：前端传递完整的ISO时间戳（如 `2026-01-12T16:00:00.000Z`）
2. **后端期望格式**：后端代码原本期望简单的日期字符串（如 `2026-01-13`）
3. **时区混乱**：当后端尝试将 ISO 时间戳直接拼接 `T00:00:00+08:00` 时，生成了无效的日期字符串

### 错误示例
```javascript
// 前端传递: "2026-01-12T16:00:00.000Z"
// 旧代码拼接: "2026-01-12T16:00:00.000ZT00:00:00+08:00"
// 结果: Invalid Date ❌
```

## 修复方案（最新）

### 修改文件
- [backend/src/controllers/socController.js](backend/src/controllers/socController.js#L35-L67)

### 修复逻辑

```javascript
// 获取指定日期的SOC数据（UTC+8时区）
// 数据库中的时间戳虽然标记为UTC，但实际含义是UTC+8本地时间
// 提取日期字符串（YYYY-MM-DD格式）
let dateStr;

// 处理不同的日期格式
if (date.includes('T')) {
  // ISO时间戳格式，如 "2026-01-12T16:00:00.000Z"
  // 直接提取日期部分
  dateStr = date.split('T')[0];
} else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
  // 已经是 YYYY-MM-DD 格式
  dateStr = date;
} else {
  // 尝试解析其他格式
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({
      success: false,
      message: '无效的日期格式'
    });
  }
  // 转换为UTC+8时区的日期字符串
  const utc8Date = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  dateStr = `${year}-${month}-${day}`;
}

// 构建查询范围（直接按UTC格式查询，因为数据库存储的就是UTC+8含义的时间戳）
const startOfDay = new Date(dateStr + 'T00:00:00Z');
const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
```

## 时区转换示例

### 案例 1: 前端传递 ISO 时间戳 `2026-01-12T16:00:00.000Z`

这个时间戳表示 **UTC 时间 2026-01-12 16:00**

**提取日期字符串**：
- 使用 `split('T')[0]` 提取：`2026-01-12`

**数据库查询范围**：
- 开始：`2026-01-12T00:00:00Z`
- 结束：`2026-01-12T23:59:59.999Z`

这样就能正确查询到 **2026-01-12** 这一天的所有SOC数据。

### 案例 2: 前端传递简单日期字符串 `2026-01-13`

**直接使用**：
- dateStr = `2026-01-13`

**数据库查询范围**：
- 开始：`2026-01-13T00:00:00Z`
- 结束：`2026-01-13T23:59:59.999Z`

## CSV数据时区说明

原始CSV文件中的时间戳：
```csv
time,soc
"2025-09-01T00:00:22.580+0000",5.000000000000000
```

**重要理解**：
- 虽然时间戳标记为 `+0000` (UTC+0)
- 但这些时间戳的**实际含义是UTC+8本地时间**
- MongoDB中存储的也是这个"看起来像UTC但实际是UTC+8"的时间戳
- 查询时直接使用日期字符串构建UTC格式的查询范围即可

**简单来说**：把这些时间戳当作UTC+8本地时间来理解和使用。

## 验证测试

### 测试脚本
- [backend/src/scripts/testTimezoneFixed.js](backend/src/scripts/testTimezoneFixed.js)
- [backend/src/scripts/testDirectQuery.js](backend/src/scripts/testDirectQuery.js)

### 测试结果

✅ **测试案例 1**：完整ISO时间戳
- 输入：`2026-01-12T16:00:00.000Z`
- 提取日期：`2026-01-12`
- 查询范围：2026-01-12 00:00:00Z - 23:59:59.999Z
- **验证通过**

✅ **测试案例 2**：简单日期字符串
- 输入：`2026-01-13`
- 提取日期：`2026-01-13`
- 查询范围：2026-01-13 00:00:00Z - 23:59:59.999Z
- **验证通过**

## 兼容性

修复后的代码支持多种日期格式：
- ✅ 完整ISO时间戳：`2026-01-12T16:00:00.000Z`
- ✅ 简单日期字符串：`2026-01-13`
- ✅ 本地时间字符串：`2026-01-13T00:00:00`
- ✅ 其他任何可被 `new Date()` 解析的格式

## 数据验证

使用实际数据验证：
```bash
node backend/src/scripts/testDirectQuery.js
```

**结果**：
- 查询日期：2026-01-13 (作为UTC+8理解)
- 总记录数：**139,717** 条
- 第一条记录：`2026-01-13T00:00:00.374Z`
- 最后一条记录：`2026-01-13T23:59:59.826Z`
- ✅ 所有数据都在正确的范围内

## 系统状态

- ✅ 后端运行正常 (端口 5001)
- ✅ 前端运行正常 (端口 3000)
- ✅ MongoDB 连接正常
- ✅ SOC数据查询正确处理时区
- ✅ 500错误已解决
- ✅ 所有日期格式都兼容处理

## 用户体验

现在用户可以：
1. 进入损失分析页面
2. 选择任意日期
3. 点击"查看SOC详情"按钮
4. 正确查看该日期所有设备的SOC曲线
5. X轴显示从00:00到23:00的完整24小时时间范围

## 前端时间轴显示

### 问题：SOC曲线从8点才开始显示

**现象**：虽然数据库中有从00:00开始的数据，但前端图表显示从8点才开始有值。

**根本原因**：
- 数据库中的时间戳格式：`2026-01-13T00:00:29.464Z` （UTC格式）
- 但这个时间戳的实际含义：UTC+8本地时间的00:00（凌晨0点）
- JavaScript的 `getHours()` 使用本地时区解析，会将UTC时间加8小时
- 结果：00:00的数据被解析为08:00

**解决方案**：
在前端使用 `getUTCHours()` 和 `getUTCMinutes()` 而不是 `getHours()` 和 `getMinutes()`，因为数据库中的UTC时间戳实际含义就是UTC+8本地时间。

### SOC曲线图时间轴
在 `frontend/src/components/SocDetailModal.jsx` 中实现了：
- 使用 `getUTCHours()` 和 `getUTCMinutes()` 正确解析时间
- 使用 `setUTCHours(0, 0, 0, 0)` 设置基准时间
- 生成完整24小时时间序列（00:00 - 23:00）
- 每小时一个数据点
- X轴使用 `interval={2}` 显示每3小时的标签（00:00, 03:00, 06:00, ...）
- 确保曲线图始终从00:00开始

## 相关文件

### 修改的文件

1. **backend/src/controllers/socController.js**
   - 简化日期解析逻辑，支持ISO时间戳格式
   - 使用 `alarmDate` 字段查询告警（与损失分析页面保持一致）
   - 返回告警数据给前端显示

2. **frontend/src/components/SocDetailModal.jsx**
   - 修改 `formatTime()` 使用 `getUTCHours()` 和 `getUTCMinutes()`
   - 修改图表数据生成使用 `setUTCHours(0, 0, 0, 0)`
   - 添加告警时段显示功能（ReferenceArea组件）
   - 添加告警切换开关

3. **frontend/src/components/SocDetailModal.css**
   - 添加告警切换按钮样式

### 告警查询字段统一（重要修复）

**问题发现：**
Alarm模型有两个日期字段：
- `alarmDate` - 告警发生日期（索引字段）
- `startTime` - 告警开始时间（精确时间戳）

在某些告警数据中，这两个字段的值不一致，导致：
- 损失分析页面使用 `alarmDate` 查询能找到数据
- SOC详情页面使用 `startTime` 查询找不到数据

**解决方案：**
统一使用 `alarmDate` 字段查询，确保两个页面数据一致性：
```javascript
// backend/src/controllers/socController.js
const alarms = await Alarm.find({
  stationId: parseInt(stationId),
  alarmDate: {
    $gte: startOfDay,
    $lt: endOfDay
  }
}).sort({ startTime: 1 });
```

**数据质量问题：**
部分告警记录的 `alarmDate` 和 `startTime` 不一致，例如：
- `alarmDate`: 2026-01-11
- `startTime`: 2026-11-01（相差10个月）

这可能是数据导入过程中的错误，建议进行数据清洗。

### 创建的测试脚本

1. **backend/src/scripts/checkSocDataTime.js** - 检查SOC数据的时间分布
2. **backend/src/scripts/testAlarmData.js** - 测试告警数据查询
3. **backend/src/scripts/checkAlarmDataRange.js** - 检查告警数据范围
4. **backend/src/scripts/findDaysWithAlarms.js** - 查找有告警数据的日期
5. **backend/src/scripts/checkStation205Alarms.js** - 检查电站205特定日期的告警
6. **backend/src/scripts/findStation205AlarmDays.js** - 列出电站205所有有告警的日期
7. **backend/src/scripts/compareAlarmDateFields.js** - 对比alarmDate和startTime字段查询差异
8. **backend/src/scripts/testSocAlarmQuery.js** - 测试修改后的SOC告警查询逻辑
- [backend/src/controllers/socController.js](backend/src/controllers/socController.js) - 简化时区处理逻辑
- [frontend/src/components/SocDetailModal.jsx](frontend/src/components/SocDetailModal.jsx) - 实现24小时完整时间轴

### 测试文件
- [backend/src/scripts/testTimezone.js](backend/src/scripts/testTimezone.js) - 数据库查询验证
- [backend/src/scripts/testTimezoneFixed.js](backend/src/scripts/testTimezoneFixed.js) - 时区转换逻辑验证
- [backend/src/scripts/testDirectQuery.js](backend/src/scripts/testDirectQuery.js) - 直接UTC查询验证

---

**最后更新**: 2026-01-27
**修复状态**: ✅ 已完成
**测试状态**: ✅ 已验证
**时区策略**: 统一使用UTC+8（数据库时间戳虽标记为UTC，但实际含义是UTC+8本地时间）
