# SOC 数据导入

## 概述

将所有设备的 SOC（State of Charge，电池电量状态）历史数据导入到 MongoDB 数据库中。

## 数据来源

**目录**: `26.01.27/`

该目录包含 33 个 CSV 文件，每个文件对应一个设备（device_id）的 SOC 历史数据。

### 文件格式

每个文件包含两列：
- `time` - 时间戳（ISO 8601 格式）
- `soc` - 电池电量百分比（0-100）

**示例**:
```csv
time,soc
"2025-09-01T00:00:18.749+0000",        3.000000000000000
"2025-09-01T00:00:47.461+0000",        3.000000000000000
"2025-09-01T00:01:17.626+0000",        3.000000000000000
```

### 文件列表

文件名即为 device_id（设备ID）：
- 007bba5f6e91454PPmrd.csv
- 056a847bc7604734Ma6X.csv
- 1656943202bd487QswHc.csv
- 17ffa8ccc8ea408OyaZp.csv
- 26d5340e1e654fb0859925f2139f3553.csv
- ... (共33个文件)

## 数据模型

**文件**: `backend/src/models/SocData.js`

### Schema 结构

```javascript
{
  deviceId: String,      // 设备ID（文件名）
  gatewayId: String,     // 网关ID（MAC地址）
  stationId: Number,     // 电站ID
  timestamp: Date,       // 时间戳
  soc: Number,           // SOC值（0-100）
  dataDate: Date,        // 数据日期（不含时间）
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

### 索引

- `deviceId` + `timestamp` - 查询特定设备的时序数据
- `stationId` + `dataDate` - 查询特定电站某天的数据
- `gatewayId` + `timestamp` - 查询特定网关的数据

### 静态方法

#### findByDevice(deviceId, startDate, endDate)
查询指定设备在时间范围内的 SOC 数据。

**示例**:
```javascript
const socData = await SocData.findByDevice(
  '3e7cb3021c9d4acO2qgI',
  '2025-09-01',
  '2025-09-30'
);
```

#### findByStation(stationId, startDate, endDate)
查询指定电站在时间范围内的所有 SOC 数据。

**示例**:
```javascript
const socData = await SocData.findByStation(
  173,
  '2025-09-01',
  '2025-09-30'
);
```

#### getSocAtTime(deviceId, targetTime)
获取设备在特定时间点的 SOC 值（最接近的历史记录）。

**示例**:
```javascript
const soc = await SocData.getSocAtTime(
  '3e7cb3021c9d4acO2qgI',
  '2025-09-15T12:30:00.000Z'
);
```

## 导入脚本

**文件**: `backend/src/scripts/importSocData.js`

### 功能

1. **读取所有 CSV 文件**: 从 `26.01.27/` 目录
2. **关联设备信息**: 根据 device_id 查找对应的 gateway_id 和 station_id
3. **批量插入**: 每批 1000 条记录
4. **去重处理**: 自动跳过重复记录
5. **进度显示**: 实时显示导入进度

### 运行导入

```bash
cd backend
node src/scripts/importSocData.js
```

### 导入流程

```
1. 连接到 MongoDB
   ↓
2. 扫描目录，找到所有 CSV 文件
   ↓
3. 对每个文件：
   a. 提取 device_id（文件名）
   b. 查找设备映射（StationGateway）
   c. 读取 CSV 数据
   d. 转换时间戳和 SOC 值
   e. 批量插入数据库
   ↓
4. 显示统计信息
```

### 输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
导入SOC数据
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

找到 33 个CSV文件

[1/33] 处理文件: 007bba5f6e91454PPmrd.csv
  ✓ 找到关联: 电站 278, 网关 001497515e3e
  📊 读取到 1,234 条记录
  ✓ 导入成功: 1,234 条, 跳过重复: 0 条

[2/33] 处理文件: 056a847bc7604734Ma6X.csv
  ✓ 找到关联: 电站 253, 网关 001497514cdc
  📊 读取到 245,678 条记录
  ✓ 导入成功: 245,678 条, 跳过重复: 0 条

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
导入完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 处理文件: 33/33
✓ 导入记录: 8,123,456 条
⚠️  跳过重复: 0 条
📊 总计: 8,123,456 条

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总记录数: 8,123,456
设备数量: 33
时间范围: 2025-09-01 至 2026-01-27

设备记录统计（前5个）:

1. 设备 3e7cb3021c9d4acO2qgI
   电站: 205
   记录数: 295,234
   时间范围: 2025-09-01 至 2026-01-27

2. 设备 056a847bc7604734Ma6X
   电站: 253
   记录数: 284,567
   时间范围: 2025-09-01 至 2026-01-27
```

## 数据关联

### 与设备映射表的关联

导入脚本会自动关联 `station_gateways` 集合：

```javascript
const gateway = await StationGateway.findOne({ deviceId });

if (gateway) {
  gatewayId = gateway.gatewayId;  // MAC地址
  stationId = gateway.stationId;   // 电站ID
}
```

### 设备映射示例

| device_id | gateway_id | station_id | station_name |
|-----------|------------|------------|--------------|
| 3e7cb3021c9d4acO2qgI | 00149751c3c4 | 205 | 喜尔美厨具站 |
| 056a847bc7604734Ma6X | 001497514cdc | 253 | 好点烟具储能电站 |
| 2fa5130a10a4438DYxah | 0014975f6987 | 238 | 甬微集团 |

## 使用场景

### 1. 查询设备SOC历史

```javascript
const SocData = require('./models/SocData');

// 查询某设备9月份的SOC数据
const data = await SocData.findByDevice(
  '3e7cb3021c9d4acO2qgI',
  '2025-09-01',
  '2025-09-30'
);

// 分析SOC变化趋势
data.forEach(record => {
  console.log(`${record.timestamp}: SOC ${record.soc}%`);
});
```

### 2. 查询电站SOC状态

```javascript
// 查询电站205在某天的所有设备SOC
const stationData = await SocData.findByStation(
  205,
  '2025-09-15',
  '2025-09-15'
);

// 按设备分组
const deviceGroups = {};
stationData.forEach(record => {
  if (!deviceGroups[record.deviceId]) {
    deviceGroups[record.deviceId] = [];
  }
  deviceGroups[record.deviceId].push(record);
});
```

### 3. 获取特定时刻的SOC

```javascript
// 获取告警发生时的SOC值
const alarmTime = '2025-09-15T14:30:00.000Z';
const soc = await SocData.getSocAtTime(
  '3e7cb3021c9d4acO2qgI',
  alarmTime
);

console.log(`告警时SOC: ${soc}%`);
```

### 4. 计算SOC变化率

```javascript
// 查询1小时的数据
const startTime = new Date('2025-09-15T14:00:00.000Z');
const endTime = new Date('2025-09-15T15:00:00.000Z');

const records = await SocData.find({
  deviceId: '3e7cb3021c9d4acO2qgI',
  timestamp: { $gte: startTime, $lte: endTime }
}).sort({ timestamp: 1 });

if (records.length >= 2) {
  const socChange = records[records.length - 1].soc - records[0].soc;
  const timeSpan = (endTime - startTime) / 3600000; // 小时
  const changeRate = socChange / timeSpan;

  console.log(`SOC变化率: ${changeRate.toFixed(2)}%/小时`);
}
```

## 数据统计

### 预计数据量

- **文件数量**: 33 个
- **平均文件大小**: ~20 MB
- **预计总记录数**: 800万 - 1000万条
- **时间跨度**: 2025-09-01 至 2026-01-27（约5个月）
- **采样频率**: 约每30秒一条记录

### 存储估算

- 单条记录大小: ~100 bytes
- 1000万条记录: ~1 GB
- 加上索引: ~1.5 GB

## 性能优化

### 查询优化

1. **使用索引**: 所有查询都应使用已建立的索引
2. **限制时间范围**: 避免查询过长时间跨度
3. **分页查询**: 大量数据时使用 limit + skip
4. **聚合查询**: 使用 aggregation pipeline 进行统计

### 示例：按小时聚合

```javascript
const hourlyAvg = await SocData.aggregate([
  {
    $match: {
      deviceId: '3e7cb3021c9d4acO2qgI',
      timestamp: {
        $gte: new Date('2025-09-01'),
        $lt: new Date('2025-09-02')
      }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%dT%H:00:00',
          date: '$timestamp'
        }
      },
      avgSoc: { $avg: '$soc' },
      minSoc: { $min: '$soc' },
      maxSoc: { $max: '$soc' },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## API 集成建议

### 创建 SOC 查询 API

```javascript
// backend/src/controllers/socController.js
exports.getSocData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, interval = 'raw' } = req.query;

    let data;

    if (interval === 'hourly') {
      // 按小时聚合
      data = await SocData.aggregate([...]);
    } else {
      // 原始数据
      data = await SocData.findByDevice(deviceId, startDate, endDate);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### API 路由

```javascript
// backend/src/routes/soc.js
router.get('/device/:deviceId', socController.getSocData);
router.get('/station/:stationId', socController.getStationSocData);
router.get('/device/:deviceId/at-time', socController.getSocAtTime);
```

## 注意事项

1. **数据量大**: SOC数据量很大，查询时注意性能
2. **时区处理**: 时间戳已包含时区信息，使用时注意转换
3. **缺失数据**: 部分设备可能有数据缺失，需要处理空值
4. **重复导入**: 脚本支持重复运行，会自动跳过重复数据
5. **内存管理**: 大文件导入时使用流式处理，避免内存溢出

## 相关文件

- `backend/src/models/SocData.js` - SOC 数据模型
- `backend/src/scripts/importSocData.js` - 导入脚本
- `backend/src/models/StationGateway.js` - 设备映射模型
- `26.01.27/*.csv` - 原始 SOC 数据文件

## 后续工作建议

1. **创建 SOC API**: 提供查询接口
2. **前端可视化**: 显示 SOC 变化曲线图
3. **告警关联**: 在告警记录中显示当时的 SOC 值
4. **SOC 分析**: 计算充放电效率、容量衰减等指标
5. **实时数据**: 集成实时 SOC 数据采集
6. **数据导出**: 支持导出指定时间段的 SOC 数据
