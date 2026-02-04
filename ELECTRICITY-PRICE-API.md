# 浙江电价 API 文档

## 概述

浙江电价 API 提供了完整的电价查询功能,支持按日期、用户类型、电压等级等条件查询电价数据。

## 数据导入状态

✅ **已成功导入 634 条电价记录**

- 工商业用户: 397 条记录
- 居民用户: 237 条记录
- 覆盖电压等级: 1, 2, 3, 5, 6, 8, 10
- 数据时间范围: 2023 年全年

## API 端点

所有 API 端点都需要身份验证（在请求头中包含 `Authorization: Bearer <token>`）

### 1. 获取电价列表

```
GET /api/electricity-prices
```

**查询参数:**
- `regionId` (可选): 地区代码，默认 330000（浙江省）
- `userType` (可选): 用户类型 (0=工商业, 1=居民)
- `voltageType` (可选): 电压等级 (1, 2, 3, 5, 6, 8, 10)
- `startDate` (可选): 开始日期 (ISO 格式)
- `endDate` (可选): 结束日期 (ISO 格式)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页记录数，默认 50

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices?userType=0&voltageType=3&page=1&limit=10"
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "regionId": "330000",
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-31T00:00:00.000Z",
      "userType": 0,
      "priceType": 0,
      "voltageType": 3,
      "timingPrice": [...],
      "sharp": 1.3868,
      "peak": 1.0243,
      "offPeak": 0.4097,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 112,
    "pages": 12
  }
}
```

### 2. 根据日期查询电价

```
GET /api/electricity-prices/by-date
```

**查询参数:**
- `date` (必需): 查询日期 (ISO 格式，如 2023-06-15)
- `regionId` (可选): 地区代码，默认 330000
- `userType` (可选): 用户类型，默认 0（工商业）
- `voltageType` (可选): 电压等级，默认 3

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices/by-date?date=2023-06-15&userType=0&voltageType=3"
```

### 3. 获取特定时刻的电价

```
GET /api/electricity-prices/at-time
```

**查询参数:**
- `datetime` (必需): 查询时间 (ISO 格式，如 2023-06-15T14:30:00)
- `regionId` (可选): 地区代码，默认 330000
- `userType` (可选): 用户类型，默认 0
- `voltageType` (可选): 电压等级，默认 3

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices/at-time?datetime=2023-06-15T14:30:00&userType=0&voltageType=3"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "priceInfo": {...},
    "currentPrice": 1.0243,
    "timeInMinutes": 870,
    "queryTime": "2023-06-15T14:30:00"
  }
}
```

### 4. 获取电价统计

```
GET /api/electricity-prices/stats
```

**查询参数:**
- `regionId` (可选): 地区代码，默认 330000

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices/stats"
```

### 5. 获取可用选项

```
GET /api/electricity-prices/options
```

返回所有可用的地区、用户类型和电压等级列表。

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices/options"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "regions": ["330000"],
    "userTypes": [0, 1],
    "voltageTypes": [1, 2, 3, 5, 6, 8, 10]
  }
}
```

### 6. 获取单个电价记录详情

```
GET /api/electricity-prices/:id
```

**参数:**
- `id`: 电价记录的 MongoDB ObjectId

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/electricity-prices/507f1f77bcf86cd799439011"
```

## 数据模型说明

### 用户类型 (userType)
- `0`: 工商业用户
- `1`: 居民用户

### 价格类型 (priceType)
- `0`: 临时价格
- `1`: 长期价格

### 电压等级 (voltageType)
- `1`: 1kV 及以下
- `2`: 1-10kV
- `3`: 35kV
- `5`: 110kV
- `6`: 220kV 及以上
- `8`: 不满 1kV
- `10`: 10kV

### 时段类型 (timingPrice.type)
- `1`: 尖峰
- `2`: 高峰
- `3`: 平峰
- `4`: 低谷
- `5`: 深谷

### 电价字段
- `sharp`: 尖峰电价 (元/kWh)
- `peak`: 高峰电价 (元/kWh)
- `shoulder`: 平峰电价 (元/kWh)
- `offPeak`: 低谷电价 (元/kWh)
- `deepValley`: 深谷电价 (元/kWh)
- `maxDemand`: 最大需量电价 (元/kW)
- `-1`: 表示不适用

## 分时电价时段示例

```json
{
  "timingPrice": [
    {"type": 4, "startTime": 0, "endTime": 480},      // 00:00-08:00 低谷
    {"type": 2, "startTime": 480, "endTime": 660},    // 08:00-11:00 高峰
    {"type": 4, "startTime": 660, "endTime": 780},    // 11:00-13:00 低谷
    {"type": 2, "startTime": 780, "endTime": 1140},   // 13:00-19:00 高峰
    {"type": 1, "startTime": 1140, "endTime": 1260},  // 19:00-21:00 尖峰
    {"type": 2, "startTime": 1260, "endTime": 1320},  // 21:00-22:00 高峰
    {"type": 4, "startTime": 1320, "endTime": 1440}   // 22:00-24:00 低谷
  ]
}
```

时间以分钟数表示 (0-1440)：
- 0 = 00:00
- 480 = 08:00
- 1440 = 24:00

## 重新导入数据

如需重新导入或更新数据，运行以下命令：

```bash
cd backend
node src/scripts/importElectricityPrices.js
```

**注意:** 重新导入会清空现有的所有电价数据。

## 前端集成示例

### 创建 API 服务

```javascript
// frontend/src/services/electricityPriceService.js
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/electricity-prices';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 根据日期查询电价
export const getPriceByDate = async (date, userType = 0, voltageType = 3) => {
  const response = await axios.get(`${API_URL}/by-date`, {
    params: { date, userType, voltageType },
    headers: getAuthHeader()
  });
  return response.data;
};

// 获取特定时刻的电价
export const getPriceAtTime = async (datetime, userType = 0, voltageType = 3) => {
  const response = await axios.get(`${API_URL}/at-time`, {
    params: { datetime, userType, voltageType },
    headers: getAuthHeader()
  });
  return response.data;
};

// 获取电价列表
export const getPriceList = async (filters = {}) => {
  const response = await axios.get(API_URL, {
    params: filters,
    headers: getAuthHeader()
  });
  return response.data;
};

// 获取可用选项
export const getAvailableOptions = async () => {
  const response = await axios.get(`${API_URL}/options`, {
    headers: getAuthHeader()
  });
  return response.data;
};
```

### React 组件示例

```javascript
import { useState, useEffect } from 'react';
import { getPriceByDate } from '../services/electricityPriceService';

function ElectricityPriceViewer() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const result = await getPriceByDate('2023-06-15', 0, 3);
      setPrice(result.data);
    } catch (error) {
      console.error('获取电价失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (!price) return <div>暂无数据</div>;

  return (
    <div>
      <h2>浙江电价信息</h2>
      <p>尖峰电价: {price.sharp > 0 ? `${price.sharp} 元/kWh` : '不适用'}</p>
      <p>高峰电价: {price.peak > 0 ? `${price.peak} 元/kWh` : '不适用'}</p>
      <p>低谷电价: {price.offPeak > 0 ? `${price.offPeak} 元/kWh` : '不适用'}</p>
    </div>
  );
}
```

## 常见问题

### Q: 如何查询当前时刻的电价？

使用 `/at-time` 端点并传入当前时间：

```javascript
const now = new Date().toISOString();
const result = await getPriceAtTime(now, 0, 3);
console.log('当前电价:', result.data.currentPrice);
```

### Q: 电价数据多久更新一次？

电价数据需要手动更新。当有新的电价文件时，将 CSV 文件放在项目根目录并运行导入脚本。

### Q: 支持其他省份的电价吗？

目前仅支持浙江省 (regionId: 330000)。要添加其他省份，需要准备相应的 CSV 文件并修改导入脚本。

### Q: 如何计算某个时段的用电成本？

```javascript
// 示例：计算 14:30 的用电成本
const result = await getPriceAtTime('2023-06-15T14:30:00', 0, 3);
const consumption = 100; // 100 kWh
const cost = consumption * result.data.currentPrice;
console.log(`用电成本: ${cost.toFixed(2)} 元`);
```

## 技术支持

如有问题，请查看：
- 后端日志: `backend/logs/`
- MongoDB 数据库: `ess-platform` 数据库，`electricity_prices` 集合
- API 测试工具: Postman 或 curl
