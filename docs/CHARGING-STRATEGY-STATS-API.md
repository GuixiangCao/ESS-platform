# 充放电策略统计 API 文档

## 概述

此API提供了各个电站下各网关每天的充放电时长统计功能。系统会自动计算每个时间段的时长，并按充电(ctype=1)、放电(ctype=2)和空闲(ctype=3)进行分类统计。

## 数据说明

### 充放电类型 (ctype)
- **1** - 充电
- **2** - 放电
- **3** - 空闲/待机

### 统计维度
- 电站ID (stationId)
- 网关ID (gatewayId)
- 日期 (date)
- 充电时长 (chargingHours)
- 放电时长 (dischargingHours)
- 空闲时长 (idleHours)

## API 端点

### 1. 获取每日充放电统计

**端点**: `GET /api/charging-strategies/daily-stats`

**查询参数**:
- `stationId` (可选) - 电站ID
- `gatewayId` (可选) - 网关ID
- `startDate` (可选) - 开始日期 (YYYY-MM-DD)
- `endDate` (可选) - 结束日期 (YYYY-MM-DD)
- `page` (可选, 默认: 1) - 页码
- `limit` (可选, 默认: 100) - 每页数量

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "stationId": 173,
      "gatewayId": "c3beb955a08b432tbuqu",
      "date": "2026-01-30T00:00:00.000Z",
      "chargingHours": 12.00,
      "dischargingHours": 9.00,
      "idleHours": 3.00,
      "chargingAvgPower": 280.00,
      "dischargingAvgPower": 700.00,
      "chargingMaxPower": 1000,
      "dischargingMaxPower": 1000,
      "totalHours": 24.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 9381,
    "pages": 94
  }
}
```

### 2. 获取基础统计信息

**端点**: `GET /api/charging-strategies/statistics`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 9381,
    "active": 9381,
    "inactive": 0,
    "byStation": [
      {
        "_id": 173,
        "count": 1236,
        "latestDate": "2026-01-30T00:00:00.000Z"
      }
    ],
    "byCtype": [
      {
        "_id": 1,
        "count": 23145,
        "avgPower": 218.78
      },
      {
        "_id": 2,
        "count": 21442,
        "avgPower": 253.26
      },
      {
        "_id": 3,
        "count": 17729,
        "avgPower": 0.00
      }
    ]
  }
}
```

## 使用示例

### 查询电站173的统计数据

```bash
curl "http://localhost:5001/api/charging-strategies/daily-stats?stationId=173&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 查询指定日期范围

```bash
curl "http://localhost:5001/api/charging-strategies/daily-stats?stationId=205&startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 查询特定网关

```bash
curl "http://localhost:5001/api/charging-strategies/daily-stats?gatewayId=c3beb955a08b432tbuqu" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 本地脚本工具

### 1. 完整统计分析��本

查看所有电站的充放电统计：

```bash
cd backend
node src/scripts/analyzeChargingStats.js
```

输出示例：
```
🏢 电站 173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📡 网关: c3beb955a08b432tbuqu
     ┌─────────────┬──────────┬──────────┬──────────┬──────────┐
     │    日期     │  ��电(h) │  放电(h) │  空闲(h) │  总计(h) │
     ├─────────────┼──────────┼──────────┼──────────┼──────────┤
     │ 2026-01-30 │    12.00 │     9.00 │     3.00 │    24.00 │
     │ 2026-01-29 │    12.00 │     9.00 │     3.00 │    24.00 │
     └─────────────┴──────────┴──────────┴──────────┴──────────┘

     📈 平均值（最近10天）:
        充电: 12.00 小时/天
        放电: 9.00 小时/天
        空闲: 3.00 小时/天
```

### 2. API逻辑测试脚本

测试统计计算逻辑：

```bash
cd backend
node src/scripts/testDailyStats.js
```

## 数据导入

### 导入充放电策略数据

```bash
cd backend
node src/scripts/importChargingStrategies.js --clear
```

参数说明：
- `--clear` - 清空现有数据后导入（可选）

导入结果示例：
```
✓ 插入完成: 成功 9381 条，失败/重复 0 条

✓ 导入完成！
  - 数据库中共有 9381 条充放电策略

前 5 条记录示例:
1. 电站 60 - 2024-08-29
   网关: 0508743a2df541ai07mr
   时间段数量: 8
   充电时长: 10.00 小时
   放电时长: 6.25 小时
```

## 全局统计数据

根据当前数据库统计（9381条记录）：

**充电统计**:
- 总时长: 99,392.75 小时
- 平均功率: 218.78 kW
- 最大功率: 1000 kW
- 记录数: 23,145

**放电统计**:
- 总时长: 71,277.75 小时
- 平均功率: 253.26 kW
- 最大功率: 1000 kW
- 记录数: 21,442

**空闲统计**:
- 总时长: 54,473.50 小时
- 平均功率: 0.00 kW
- 记录数: 17,729

## 涉及的电站

共19个电站: 60, 173, 205, 208, 212, 218, 223, 231, 233, 238, 240, 245, 253, 268, 276, 278, 282, 283, 287

## 典型案例分析

### 电站 173
- 网关: c3beb955a08b432tbuqu
- 最近10天平均:
  - 充电: 12.00 小时/天
  - 放电: 9.00 小时/天
  - 空闲: 3.00 小时/天

### 电站 205 (多网关)
- 4个网关: 3e7cb3021c9d4aco2qgi, 4152b5fc224a4d21c0dm, 5b32b197c0f64ee81zdx, 9351094114fb4aaefjch
- 所有网关统一策略:
  - 充电: 12.00 小时/天
  - 放电: 7.00 小时/天
  - 空闲: 5.00 小时/天

### 电站 223
- 网关: f5be6315eaba418iu7np
- 最近10天平均:
  - 充电: 12.00 小时/天
  - 放电: 10.00 小时/天 (放电时间最长)
  - 空闲: 2.00 小时/天

## 认证

所有API端点都需要JWT认证。在请求头中包含：

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 错误处理

### 常见错误码
- `400` - 请求参数错误
- `401` - 未授权
- `404` - 未找到数据
- `500` - 服务器错误

### 错误响应示例
```json
{
  "success": false,
  "message": "未找到该电站的充放电策略"
}
```

## 性能建议

1. **分页查询**: 大量数据时使用分页参数
2. **日期过滤**: 使用 startDate 和 endDate 限制查询范围
3. **特定查询**: 指定 stationId 或 gatewayId 提高查询效率
4. **缓存**: 考虑在前端缓存统计结果

## 相关文件

- 模型: `backend/src/models/ChargingStrategy.js`
- 控制器: `backend/src/controllers/chargingStrategyController.js`
- 路由: `backend/src/routes/chargingStrategies.js`
- 导入脚本: `backend/src/scripts/importChargingStrategies.js`
- 分析脚本: `backend/src/scripts/analyzeChargingStats.js`
- 测试脚本: `backend/src/scripts/testDailyStats.js`
