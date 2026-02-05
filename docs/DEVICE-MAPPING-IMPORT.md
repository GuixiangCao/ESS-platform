# 设备 ID 映射导入

## 概述

成功将国内生产环境电站的设备 ID 映射数据导入到数据库中。每个网关（gateway）现在都关联了对应的设备 ID（device_id）和设备型号（device_model）。

## 更新内容

### 1. 数据模型更新

**文件**: `backend/src/models/StationGateway.js`

新增字段：
- `deviceId` - 设备 ID（UUID 格式）
- `deviceModel` - 设备型号

```javascript
deviceId: {
  type: String,
  index: true,
  // 设备 ID (UUID 格式，对应 device_name)
},
deviceModel: {
  type: String,
  // 设备型号
}
```

### 2. 导入脚本

**新增文件**: `backend/src/scripts/importDeviceMapping.js`

功能：
- 读取 `国内生产环境电站.csv` 文件
- 根据 `device_name`（MAC 地址）匹配现有的 `gatewayId`
- 更新 StationGateway 记录，添加 `deviceId` 和 `deviceModel` 字段
- 提供详细的导入日志和统计信息

## 导入结果

### 导入统计

| 类别 | 数量 |
|------|------|
| CSV 总记录数 | 38 |
| 成功更新 | 29 |
| 未找到网关 | 9 |
| 失败 | 0 |

### 数据库统计

| 类别 | 数量 |
|------|------|
| 总网关数 | 29 |
| 已关联设备 ID | 29 |
| 未关联设备 ID | 0 |

**结果**: 数据库中所有现有的 29 个网关都已成功关联设备 ID。

### 未找到的网关

以下 9 个网关在数据库中不存在，因此未能更新：

1. `mockprod1` - 电站 1
2. `001497514c91` - 电站 60
3. `0014970f01c6` - 电站 147
4. `001497514cea` - 电站 159
5. `d6fe760b5aa4` - 电站 179
6. `001497514c40` - 电站 194
7. `001497515e3e` - 电站 278
8. `0014976c15e3` - 电站 287
9. `0014976c14af` - 电站 287

**说明**: 这些网关可能需要先通过 `importStationGateways.js` 导入到数据库，然后再次运行设备映射导入脚本。

## 数据映射示例

### 电站 205 - 喜尔美厨具站（4 个网关）

| 网关 ID | 设备 ID | 设备型号 |
|---------|---------|----------|
| 00149751c3c4 | 3e7cb3021c9d4acO2qgI | m0000001 |
| 001497515e17 | 5b32b197c0f64ee81zdX | m0000001 |
| 001497515e24 | 4152b5fc224a4d21c0dM | m0000001 |
| 001497515e1d | 9351094114fb4aaEfjCH | m0000001 |

### 电站 173 - 德业龙山2号

| 网关 ID | 设备 ID | 设备型号 |
|---------|---------|----------|
| 001497515e08 | c3beb955a08b432tBUQU | m0000001 |

### 电站 238 - 甬微集团（3 个网关）

| 网关 ID | 设备 ID | 设备型号 |
|---------|---------|----------|
| 0014975f6987 | 2fa5130a10a4438DYxah | m0000001 |
| 0014975f6735 | d7932fcc7b0541eXaGPS | m0000001 |
| 0014975f6733 | f2531eb5d21c40cKykPd | m0000001 |

## 使用方法

### 重新导入（如果需要）

```bash
cd backend
node src/scripts/importDeviceMapping.js
```

### 在代码中使用设备 ID

```javascript
const StationGateway = require('./models/StationGateway');

// 通过网关 ID 查询
const gateway = await StationGateway.findByGatewayId('00149751c3c4');
console.log('设备 ID:', gateway.deviceId); // 3e7cb3021c9d4acO2qgI
console.log('设备型号:', gateway.deviceModel); // m0000001

// 查询所有有设备 ID 的网关
const gatewaysWithDevice = await StationGateway.find({
  deviceId: { $exists: true, $ne: null }
});
```

## 数据源

**源文件**: `国内生产环境电站.csv`

字段说明：
- `device_id` - 设备唯一标识符（UUID 格式）
- `device_name` - 设备名称（MAC 地址格式，对应网关 ID）
- `device_model` - 设备型号（所有设备均为 m0000001）
- `name` - 电站名称
- `station_id` - 电站 ID

## 相关文件

- `backend/src/models/StationGateway.js` - 数据模型（已更新）
- `backend/src/scripts/importDeviceMapping.js` - 导入脚本（新建）
- `国内生产环境电站.csv` - 源数据文件

## 注意事项

1. **数据完整性**: 导入脚本会跳过 CSV 中不存在于数据库的网关
2. **重复导入**: 可以安全地重复运行导入脚本，会覆盖现有的设备 ID
3. **新增网关**: 如果需要导入新网关，先运行 `importStationGateways.js`，再运行 `importDeviceMapping.js`
4. **索引**: deviceId 字段已建立索引，便于快速查询

## 后续工作建议

1. **前端显示**: 在电站分析页面的网关信息卡片中显示设备 ID
2. **API 扩展**: 在网关 API 响应中包含设备 ID
3. **数据验证**: 验证设备 ID 的唯一性和格式
4. **导入缺失网关**: 导入 CSV 中未找到的 9 个网关到数据库
