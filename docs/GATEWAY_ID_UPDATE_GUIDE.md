# 告警网关设备ID更新指南

## 概述

本文档说明如何从CSV文件导入告警的网关设备ID（gatewayDeviceId），用于记录告警的来源设备。

## 功能说明

### 1. 数据库模型更新

已在 `Alarm` 模型中新增字段：

```javascript
gatewayDeviceId: {
  type: String,
  default: null,
  index: true  // 添加索引以提升查询性能
}
```

该字段用于记录每条告警来自哪个网关设备。

### 2. 数据来源

CSV文件格式（`Data_Source/alarm/Level2.csv`）：

| 列名 | 说明 |
|------|------|
| alarm_id | 告警ID（唯一标识） |
| device_id | 设备ID |
| gateway_device_id | 网关设备ID（告警来源） |
| station_name | 电站名称 |
| alarm_code | 告警代码 |
| device_type | 设备类型 |
| alarm_level | 告警级别 |
| occur_time | 发生时间（Unix时间戳） |
| end_time | 结束时间（Unix时间戳） |

## 使用方法

### 执行导入脚本

```bash
cd backend
node src/scripts/updateGatewayIds.js
```

### 脚本功能

1. 读取CSV文件 `Data_Source/alarm/Level2.csv`
2. 根据 `alarm_id` 匹配数据库中的告警记录
3. 更新对应告警的 `gatewayDeviceId` 字段
4. 显示详细的执行统计信息

### 执行结果示例

```
========================================
  更新告警数据库 - 网关设备ID
========================================

✓ MongoDB 连接成功
正在读取文件: /path/to/Level2.csv

✓ CSV 文件读取完成，共 7225 条记录

开始更新告警数据...

已更新 6000 条记录...

========================================
  更新完成
========================================
✓ 成功更新: 6105 条
⚠ 未找到: 1120 条
✗ 更新失败: 0 条
总计: 7225 条
========================================

数据库中已有网关设备ID的告警数量: 6105

✓ 数据库连接已关闭
```

## API查询示例

### 按网关设备ID查询告警

```javascript
// 查询特定网关设备的所有告警
const alarms = await Alarm.find({
  gatewayDeviceId: 'd7932fcc7b0541eXaGPS'
});

// 统计每个网关设备的告警数量
const stats = await Alarm.aggregate([
  { $match: { gatewayDeviceId: { $ne: null } } },
  { $group: {
    _id: '$gatewayDeviceId',
    count: { $sum: 1 },
    devices: { $addToSet: '$device' }
  }},
  { $sort: { count: -1 } }
]);
```

### 前端API调用

如果需要在前端查询某个网关的告警，可以在现有的告警API中添加网关ID过滤：

```javascript
// 示例：获取特定网关的告警
const response = await api.get('/alarms', {
  params: {
    gatewayDeviceId: 'd7932fcc7b0541eXaGPS',
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  }
});
```

## 数据统计

当前数据库状态：

- 总告警数：6105 条
- 已有网关ID：6105 条（100%）
- 未有网关ID：0 条（0%）

CSV文件中有部分告警ID（约1120条）在当前数据库中未找到，这些可能是：
- 尚未导入的告警数据
- 已被删除的历史告警
- 测试数据

## 注意事项

1. **重复执行安全**：脚本使用 `updateOne` 方法，重复执行只会更新数据，不会造成数据重复
2. **数据完整性**：`gatewayDeviceId` 字段为可选字段，历史数据如无此信息将保持为 `null`
3. **性能优化**：已为 `gatewayDeviceId` 添加索引，查询效率高
4. **错误处理**：脚本会记录未找到的告警ID和更新失败的记录（最多显示前10条）

## 故障排查

### MongoDB未运行

```
✗ MongoDB 连接失败: connect ECONNREFUSED
```

解决方法：
```bash
# macOS
brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 mongo
```

### CSV文件未找到

```
✗ 执行失败: CSV 文件不存在: /path/to/Level2.csv
```

解决方法：检查文件路径是否正确，确保 CSV 文件位于 `Data_Source/alarm/Level2.csv`

### 网关ID未更新

如果发现某些告警的网关ID未更新，可能原因：
1. CSV文件中没有该告警的记录
2. alarmId 不匹配（检查是否有空格或特殊字符）
3. 数据库中该告警不存在

可以手动查询验证：
```bash
node -e "
const mongoose = require('mongoose');
const Alarm = require('./src/models/Alarm');
mongoose.connect('mongodb://localhost:27017/ess-platform').then(async () => {
  const alarm = await Alarm.findOne({ alarmId: 'your-alarm-id' });
  console.log(alarm);
  await mongoose.connection.close();
});
"
```

## 未来扩展

可以基于 `gatewayDeviceId` 实现以下功能：

1. **网关设备监控**：统计每个网关设备的告警频率和类型
2. **故障溯源**：快速定位告警来源设备
3. **设备健康度评估**：根据网关设备的告警数量评估设备状态
4. **告警聚合分析**：按网关设备聚合分析告警趋势

## 相关文件

- 模型定义：`backend/src/models/Alarm.js`
- 导入脚本：`backend/src/scripts/updateGatewayIds.js`
- 数据源：`Data_Source/alarm/Level2.csv`
