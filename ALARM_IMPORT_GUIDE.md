# 告警数据导入功能说明

## 功能概述

告警数据导入功能用于将CSV格式的故障列表导入到MongoDB数据库中，支持自动解析、数据验证、重复处理和统计分析。

## 数据模型

### Alarm 模型

**文件**: `backend/src/models/Alarm.js`

**字段说明**:
- `alarmDate` (Date, required): 告警发生日期（仅年月日）
- `stationId` (Number, required): 电站ID
- `alarmId` (String, required, unique): 告警唯一标识
- `device` (String, required): 告警设备类型
  - 可选值: 'lc', 'pcs', 'cluster', 'meter', 'highMeter', 'ac', 'ems'
- `alarmName` (String, required): 告警名称
- `startTime` (Date, required): 告警开始时间
- `endTime` (Date, required): 告警结束时间
- `duration` (Number): 持续时长（秒）- 自动计算
- `durationMinutes` (Number): 持续时长（分钟）- 自动计算
- `severity` (String): 严重程度
  - 可选值: 'info', 'warning', 'error', 'critical'
  - 默认: 'warning'

**索引**:
- `alarmDate`: 单字段索引
- `stationId`: 单字段索引
- `device`: 单字段索引
- `alarmName`: 单字段索引
- `startTime`: 单字段索引
- `alarmId`: 唯一索引
- `{stationId, alarmDate}`: 复合索引
- `{stationId, startTime}`: 复合索引

**虚拟字段**:
- `durationFormatted`: 格式化的持续时长（如 "2小时30分钟"）

**静态方法**:
```javascript
// 按电站和日期范围查询告警
Alarm.findByStationAndDateRange(stationId, startDate, endDate)

// 获取电站告警统计
Alarm.getAlarmStatsByStation(stationId, startDate, endDate)

// 获取设备告警统计
Alarm.getDeviceStats(startDate, endDate)
```

## 导入脚本

### 脚本位置

**文件**: `backend/import-alarms.js`

### 运行方式

```bash
cd backend
node import-alarms.js
```

### CSV 文件格式

**文件路径**: `../国内2026-1月故障列表.csv`

**字段**:
- `告警发生日期`: "YYYY-MM-DD" 格式（如 "2026-01-01"）
- `电站id`: 电站编号（整数）
- `告警id`: UUID格式的唯一标识
- `告警设备`: 设备代码（lc、pcs、cluster、meter、highMeter、ac、ems）
- `告警名称`: 告警描述文字
- `告警开始时间`: "M/D/YYYY H:MM:SS" 格式（如 "1/1/2026 19:45:48"）
- `告警结束时间`: "M/D/YYYY H:MM:SS" 格式（如 "1/1/2026 19:45:56"）

### 核心功能

#### 1. 日期时间解析

**parseDateTime(dateStr)**
- 解析 "M/D/YYYY H:MM:SS" 格式的日期时间
- 处理特殊值 "1/1/1970 00:00:00"（表示告警未结束）
- 返回JavaScript Date对象或null

**getAlarmDate(dateStr)**
- 支持 "YYYY-MM-DD" 格式（CSV告警发生日期）
- 支持 "M/D/YYYY H:MM:SS" 格式（自动提取日期部分）
- 只保留年月日，去除时分秒

#### 2. 严重程度推断

**inferSeverity(device, alarmName)**

根据告警名称中的关键词自动推断严重程度：

- **Critical（紧急）**:
  - 紧急停机
  - 电池舱开门
  - BMS通讯丢失
  - PCS通讯丢失

- **Error（错误）**:
  - 故障
  - 欠压
  - 欠频
  - 开路
  - 反馈

- **Warning（警告）**:
  - 通讯丢失
  - 通信丢失
  - 连接超时
  - 数据库异常

- **Info（信息）**: 默认级别

#### 3. 结束时间处理

对于未结束的告警（`endTime` 为 "1/1/1970 00:00:00"）：
- 自动设置 `endTime` 为 `startTime`
- 持续时长计算为0

#### 4. 批量导入

```javascript
await Alarm.insertMany(alarms, {
  ordered: false  // 遇到重复继续插入其他记录
});
```

**特性**:
- 批量插入，高效处理大量数据
- `ordered: false` 允许跳过重复记录
- 自动处理duplicate key错误（11000）

#### 5. 统计输出

导入完成后自动显示：
- 数据库总告警数
- 涉及电站数量和列表
- 设备类型列表
- 各电站告警数统计（含设备类型）
- 各设备类型告警数统计（含平均时长）

### 导入流程

```
1. 连接MongoDB
   ↓
2. 读取CSV文件（流式处理）
   ↓
3. 逐行解析数据
   ├─ 解析日期时间
   ├─ 推断严重程度
   ├─ 处理结束时间
   └─ 验证数据有效性
   ↓
4. 批量插入MongoDB
   ├─ 成功记录数
   └─ 重复跳过数
   ↓
5. 统计分析
   ├─ 总数统计
   ├─ 电站统计
   └─ 设备统计
   ↓
6. 关闭连接
```

## 使用示例

### 示例输出

```
正在连接MongoDB...
MongoDB连接成功!

开始导入数据（不清空现有数据）...

正在读取CSV文件: /path/to/国内2026-1月故障列表.csv

CSV文件读取完成，共读取 291 行数据
成功解析: 291 条
解析失败: 0 条

正在批量插入告警数据到MongoDB...
准备插入的告警数: 291
✅ 成功插入 291 条告警记录

📊 数据统计:
  - 数据库总告警数: 291
  - 涉及电站数: 11
  - 电站列表: 173, 205, 208, 231, 238, 245, 276, 278, 282, 283, 287
  - 设备类型: ac, cluster, ems, highMeter, lc, meter, pcs

📈 各电站告警数统计:
  - 电站 173: 23 条告警，设备: ems, lc
  - 电站 205: 97 条告警，设备: lc
  - 电站 208: 40 条告警，设备: pcs, lc, cluster
  - 电站 231: 1 条告警，设备: lc
  - 电站 238: 53 条告警，设备: lc, pcs, cluster, ems, ac
  - 电站 245: 5 条告警，设备: lc
  - 电站 276: 15 条告警，设备: ac, meter, pcs
  - 电站 278: 45 条告警，设备: lc, pcs, ems, highMeter, cluster
  - 电站 282: 1 条告警，设备: ems
  - 电站 283: 8 条告警，设备: lc
  - 电站 287: 3 条告警，设备: ems

🔧 各设备类型告警数统计:
  - lc: 213 条，平均时长: 626.89 分钟
  - pcs: 47 条，平均时长: 2822.91 分钟
  - ems: 13 条，平均时长: 10.92 分钟
  - cluster: 9 条，平均时长: 1.78 分钟
  - highMeter: 5 条，平均时长: 8830.60 分钟
  - ac: 3 条，平均时长: 22.67 分钟
  - meter: 1 条，平均时长: 3.00 分钟

✅ MongoDB连接已关闭

🎉 导入完成!
```

### 查询示例

```javascript
const Alarm = require('./src/models/Alarm');

// 查询某电站的告警
const alarms = await Alarm.find({ stationId: 205 })
  .sort({ startTime: -1 })
  .limit(10);

// 查询特定日期范围的告警
const dateAlarms = await Alarm.findByStationAndDateRange(
  205,
  '2026-01-01',
  '2026-01-31'
);

// 获取电站告警统计
const stats = await Alarm.getAlarmStatsByStation(
  205,
  '2026-01-01',
  '2026-01-31'
);

// 按设备类型查询
const lcAlarms = await Alarm.find({ device: 'lc' })
  .sort({ startTime: -1 });

// 按严重程度查询
const criticalAlarms = await Alarm.find({ severity: 'critical' })
  .sort({ startTime: -1 });
```

## 错误处理

### 重复记录

当 `alarmId` 重复时：
- 跳过重复记录
- 继续插入其他记录
- 显示成功插入数和跳过数

### 无效数据

跳过以下情况的数据：
- 告警开始时间无效
- 告警发生日期无效
- 必填字段缺失

错误记录会被收集并在最后显示前5条错误。

### 连接错误

- MongoDB连接失败时终止导入
- 插入错误时回滚并显示详细错误信息
- 确保在任何情况下都关闭数据库连接

## 数据分析洞察

### 2026年1月告警概况

基于291条告警记录的分析：

**电站表现**:
- 电站205（97条）、电站238（53条）、电站278（45条）为高发电站
- 需重点关注这些电站的运维状况

**设备类型**:
- **LC设备（213条，36.3%）**: 最高频，平均持续10.4小时
- **PCS设备（47条，16.2%）**: 第二高频，平均持续47小时
- **HighMeter设备**: 虽然仅5条，但平均持续时长达147小时，需要重点关注

**运维建议**:
1. 加强LC设备的通讯稳定性监控
2. PCS设备故障持续时间较长，需优化响应流程
3. HighMeter长时间故障可能影响计量准确性

## 未来扩展

- [ ] 支持增量导入（仅导入新数据）
- [ ] 添加API接口查询告警数据
- [ ] 前端页面展示告警列表和统计图表
- [ ] 告警趋势分析和预警
- [ ] 与收益损失分析联动
- [ ] 导出告警报告（PDF/Excel）
- [ ] 告警工单管理系统集成

## 相关文件

### 后端
- [backend/src/models/Alarm.js](backend/src/models/Alarm.js) - 告警数据模型
- [backend/import-alarms.js](backend/import-alarms.js) - 导入脚本

### 数据文件
- `国内2026-1月故障列表.csv` - CSV源数据文件

## 依赖包

```json
{
  "csv-parser": "^3.2.0",
  "mongoose": "^8.0.0"
}
```

## 注意事项

1. **时区处理**: 日期时间存储为UTC时间，查询时需注意时区转换
2. **数据完整性**: CSV文件必须包含所有必填字段
3. **设备代码**: 设备类型必须是预定义的枚举值之一
4. **唯一性**: `alarmId` 必须唯一，重复会被自动跳过
5. **连接配置**: 默认连接 `mongodb://localhost:27017/ess-platform`，可通过环境变量修改

## 更新日志

- **2026-01-15 v1.0**: 初始实现告警数据导入功能
  - 创建Alarm模型
  - 实现CSV导入脚本
  - 支持日期时间解析
  - 自动推断严重程度
  - 批量导入和重复处理
  - 统计分析功能
  - 修复MongoDB连接生命周期问题
  - 修复日期格式解析问题
