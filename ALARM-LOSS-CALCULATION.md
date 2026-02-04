# 告警损失计算功能

## 概述

实现了基于设备告警的经济损失计算功能。系统会根据告警发生的时间段，结合充放电策略中的功率数据和分时电价数据，自动计算每个告警导致的经济损失。

**损失计算公式**:
```
损失 = 告警持续时间(小时) × 对应时段功率(kW) × 对应时段电价(元/kWh)
```

## 核心功能

### 1. 单个告警损失计算
- 输入：告警ID
- 输出：该告警导致的经济损失

### 2. 电站告警总损失计算
- 输入：电站ID、日期范围
- 输出：时间段内所有告警的总损失、明细列表

### 3. 按设备类型统计损失
- 输入：电站ID、日期范围
- 输出：按设备类型（PCS、EMS、LC等）分组的损失统计

## 实现文件

### 1. 损失计算服务

**文件**: `backend/src/services/alarmLossCalculator.js`

核心函数：

#### `calculateAlarmLoss(alarm, regionId, userType, voltageType)`
计算单个告警的损失

**参数**:
- `alarm` - 告警对象
- `regionId` - 地区代码（默认: '330000' 浙江）
- `userType` - 用户类型（0: 工商业, 1: 居民，默认: 0）
- `voltageType` - 电压等级（默认: 1）

**返回值**:
```javascript
{
  alarmId: "xxx",
  alarmName: "云平台通讯丢失",
  device: "ems",
  startTime: "2025-12-21T19:50:08.000Z",
  endTime: "2025-12-21T20:04:09.000Z",
  durationMinutes: 14,
  durationHours: "0.23",
  loss: 20.63,
  lossDetails: [
    {
      time: "4:00",
      power: 300,
      price: 0.294649,
      ctype: 1,
      hourlyLoss: 88.3947
    }
  ],
  calculationNote: "损失 = 时间长度(小时) × 功率(kW) × 电价(元/kWh)"
}
```

#### `calculateStationAlarmLosses(stationId, startDate, endDate, regionId, userType, voltageType)`
批量计算电站告警损失

**返回值**:
```javascript
{
  stationId: 173,
  dateRange: {
    start: "2025-12-01",
    end: "2025-12-31"
  },
  alarmCount: 50,
  totalLoss: 1234.56,
  averageLossPerAlarm: 24.69,
  alarms: [...], // 所有告警的详细损失数据
  summary: {
    maxLoss: 150.00,
    minLoss: 5.50,
    totalDurationHours: "125.50"
  }
}
```

#### `calculateLossByDevice(stationId, startDate, endDate, regionId, userType, voltageType)`
按设备类型统计告警损失

**返回值**:
```javascript
{
  stationId: 173,
  dateRange: {...},
  totalLoss: 1234.56,
  deviceStats: [
    {
      device: "pcs",
      count: 25,
      totalLoss: 800.00,
      averageLoss: 32.00,
      totalDurationHours: "50.00"
    },
    {
      device: "ems",
      count: 15,
      totalLoss: 300.00,
      averageLoss: 20.00,
      totalDurationHours: "35.50"
    }
  ]
}
```

### 2. API 控制器

**文件**: `backend/src/controllers/alarmController.js`

提供 5 个 API 端点：

1. **获取告警列表** - `getAlarmsByStation`
2. **计算单个告警损失** - `calculateSingleAlarmLoss`
3. **计算电站总损失** - `calculateStationLosses`
4. **按设备统计损失** - `getLossByDevice`
5. **获取告警统计** - `getAlarmStats`

### 3. API 路由

**文件**: `backend/src/routes/alarms.js`

新增路由：

```javascript
// 计算电站告警总损失
GET /api/alarms/station/:stationId/losses

// 按设备类型统计告警损失
GET /api/alarms/station/:stationId/losses/by-device

// 计算单个告警的损失
GET /api/alarms/:alarmId/loss
```

## API 使用示例

### 1. 计算电站告警总损失

**请求**:
```http
GET /api/alarms/station/173/losses?startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer <token>
```

**查询参数**:
- `startDate` (必需) - 开始日期 (YYYY-MM-DD)
- `endDate` (必需) - 结束日期 (YYYY-MM-DD)
- `regionId` (可选) - 地区代码，默认: '330000'
- `userType` (可选) - 用户类型，默认: 0 (工商业)
- `voltageType` (可选) - 电压等级，默认: 1

**响应**:
```json
{
  "success": true,
  "data": {
    "stationId": 173,
    "dateRange": {
      "start": "2025-12-01T00:00:00.000Z",
      "end": "2025-12-31T00:00:00.000Z"
    },
    "alarmCount": 50,
    "totalLoss": 1234.56,
    "averageLossPerAlarm": 24.69,
    "alarms": [
      {
        "alarmId": "xxx",
        "alarmName": "云平台通讯丢失",
        "device": "ems",
        "startTime": "2025-12-21T19:50:08.000Z",
        "endTime": "2025-12-21T20:04:09.000Z",
        "durationMinutes": 14,
        "durationHours": "0.23",
        "loss": 20.63
      }
    ],
    "summary": {
      "maxLoss": 150.00,
      "minLoss": 5.50,
      "totalDurationHours": "125.50"
    }
  }
}
```

### 2. 按设备类型统计损失

**请求**:
```http
GET /api/alarms/station/173/losses/by-device?startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "stationId": 173,
    "dateRange": {
      "start": "2025-12-01T00:00:00.000Z",
      "end": "2025-12-31T00:00:00.000Z"
    },
    "totalLoss": 1234.56,
    "deviceStats": [
      {
        "device": "pcs",
        "count": 25,
        "totalLoss": 800.00,
        "averageLoss": 32.00,
        "totalDurationHours": "50.00",
        "totalDurationMinutes": 3000
      },
      {
        "device": "ems",
        "count": 15,
        "totalLoss": 300.00,
        "averageLoss": 20.00,
        "totalDurationHours": "35.50",
        "totalDurationMinutes": 2130
      }
    ]
  }
}
```

### 3. 计算单个告警损失

**请求**:
```http
GET /api/alarms/e7a7fb8c-355e-4276-8e28-53c60768e6bc/loss
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "alarmId": "e7a7fb8c-355e-4276-8e28-53c60768e6bc",
    "alarmName": "云平台通讯丢失",
    "device": "ems",
    "startTime": "2025-12-21T19:50:08.000Z",
    "endTime": "2025-12-21T20:04:09.000Z",
    "durationMinutes": 14,
    "durationHours": "0.23",
    "loss": 20.63,
    "lossDetails": [
      {
        "time": "4:00",
        "power": 300,
        "price": 0.294649,
        "ctype": 1,
        "hourlyLoss": 88.3947
      }
    ],
    "calculationNote": "损失 = 时间长度(小时) × 功率(kW) × 电价(元/kWh)"
  }
}
```

## 计算逻辑

### 1. 数据来源

损失计算需要三类数据：

1. **告警数据** (Alarm 模型)
   - 告警开始时间 (startTime)
   - 告警结束时间 (endTime)
   - 电站ID (stationId)

2. **充放电策略** (ChargingStrategy 模型)
   - 每日的时段配置 (timeslots)
   - 每个时段的功率 (power)
   - 充电/放电类型 (ctype: 1=充电, 2=放电, 3=空闲)

3. **电价数据** (ElectricityPrice 模型)
   - 分时电价配置
   - 尖峰、高峰、平峰、低谷电价

### 2. 计算步骤

```
1. 获取告警的开始和结束时间
2. 将告警时段分成1分钟的小时段
3. 对于每个1分钟时段：
   a. 查找该时刻的充放电功率（从 ChargingStrategy）
   b. 查找该时刻的电价（从 ElectricityPrice）
   c. 计算该分钟的损失 = 功率(kW) × 1/60小时 × 电价(元/kWh)
4. 累加所有分钟的损失得到总损失
```

### 3. 时区处理

- 告警时间存储为 UTC 时间
- 计算时转换为本地时间（UTC+8）
- 充放电策略使用本地时间配置（HH:MM 格式）
- 电价配置使用分钟数（0-1440）

## 测试脚本

**文件**: `backend/src/scripts/testAlarmLoss.js`

运行测试：

```bash
cd backend
node src/scripts/testAlarmLoss.js
```

测试内容：
1. 查看数据库中的告警数据分布
2. 计算单个告警的损失
3. 计算电站在指定日期范围的总损失
4. 按设备类型统计损失
5. 显示 API 使用示例

## 测试结果示例

```
测试告警损失计算（2025-12-21）

告警信息:
  ID: e7a7fb8c-355e-4276-8e28-53c60768e6bc
  名称: 云平台通讯丢失
  设备: ems
  开始: 2025-12-21T19:50:08.000Z
  结束: 2025-12-21T20:04:09.000Z
  时长: 14 分钟

找到充放电策略:
  网关: 001497515e08
  时段数: 8
  示例时段: 00:00 - 12:00, 功率: 300kW, 类型: 1

找到电价数据:
  尖峰: ¥1.279396/kWh
  高峰: ¥1.163088/kWh
  平峰: ¥0.775392/kWh
  低谷: ¥0.294649/kWh

计算损失...

计算结果:
  损失金额: ¥20.63
  计算依据: 14分钟 × 300kW × ¥0.294649/kWh
```

## 数据库状态

当前数据库包含：
- **18 个电站**的告警数据
- **总计 5,103 条告警记录**
- 日期范围：2025-08-30 至 2026-01-14

主要电站告警数量：
- 电站 212: 1,219 条
- 电站 205: 818 条
- 电站 173: 787 条
- 电站 245: 409 条

## 使用场景

### 1. 损失分析页面集成
在损失分析页面中显示告警导致的损失：
- 每日告警损失金额
- 按设备类型分类的损失统计
- 告警损失趋势图表

### 2. 告警优先级排序
根据经济损失对告警进行排序：
- 高损失告警优先处理
- 计算不同告警类型的平均损失
- 识别高影响设备

### 3. 运维成本分析
评估告警对运营的经济影响：
- 月度告警损失统计
- 不同设备的维护成本效益分析
- ROI 计算

## 注意事项

### 1. 数据依赖
损失计算需要三类数据齐全：
- 告警数据
- 充放电策略数据
- 电价数据

如果任一数据缺失，将返回 `loss: 0` 并说明原因。

### 2. 时区问题
- 数据库中的时间使用 UTC 时区
- 计算时自动转换为本地时间（UTC+8）
- 前端显示时需要注意时区转换

### 3. 性能考虑
- 批量计算时使用异步处理
- 大量告警时建议分页查询
- 考虑添加缓存机制

### 4. 计算精度
- 时间精度：1分钟
- 金额精度：保留2位小数
- 功率和电价按实际值计算

## 后续优化建议

1. **缓存机制**: 缓存电价和充放电策略数据
2. **批量优化**: 优化批量计算性能
3. **前端集成**: 在损失分析页面显示告警损失
4. **报表导出**: 支持导出告警损失报表
5. **实时计算**: WebSocket 推送最新告警损失
6. **损失预测**: 基于历史数据预测未来损失
7. **告警分级**: 根据损失金额自动设置告警优先级

## 相关文件

- `backend/src/services/alarmLossCalculator.js` - 损失计算服务
- `backend/src/controllers/alarmController.js` - API 控制器
- `backend/src/routes/alarms.js` - API 路由
- `backend/src/models/Alarm.js` - 告警数据模型
- `backend/src/models/ChargingStrategy.js` - 充放电策略模型
- `backend/src/models/ElectricityPrice.js` - 电价数据模型
- `backend/src/scripts/testAlarmLoss.js` - 测试脚本
