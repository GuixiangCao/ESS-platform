# 电站网关对应表 API 文档

## 概述

电站网关对应表 API 提供了电站与网关设备之间的映射关系管理功能，支持查询、搜索、创建和更新操作。

## 数据导入状态

✅ **已成功导入 16 条电站网关映射记录**

- 数据来源: 电站网关对应表.xlsx
- 包含字段: 电站ID、电站名称、网关ID

## API 端点

所有 API 端点都需要身份验证（在请求头中包含 `Authorization: Bearer <token>`）

### 1. 获取所有电站网关映射

```
GET /api/station-gateways
```

**查询参数:**
- `search` (可选): 搜索关键词（搜索电站名称、网关ID或电站ID）
- `isActive` (可选): 过滤激活状态 (true/false)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页记录数，默认 50
- `sortBy` (可选): 排序字段，默认 stationId
- `sortOrder` (可选): 排序方向 (asc/desc)，默认 asc

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways?page=1&limit=10&sortBy=stationName"
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "stationId": 173,
      "stationName": "德业龙山2号",
      "gatewayId": "001497515e08",
      "isActive": true,
      "createdAt": "2026-01-27T02:53:01.099Z",
      "updatedAt": "2026-01-27T02:53:01.099Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 16,
    "pages": 2
  }
}
```

### 2. 根据电站 ID 获取网关信息

```
GET /api/station-gateways/station/:stationId
```

**路径参数:**
- `stationId`: 电站 ID (数字)

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways/station/173"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "stationId": 173,
    "stationName": "德业龙山2号",
    "gatewayId": "001497515e08",
    "isActive": true
  }
}
```

### 3. 根据网关 ID 获取电站信息

```
GET /api/station-gateways/gateway/:gatewayId
```

**路径参数:**
- `gatewayId`: 网关 ID (MAC 地址格式，如 001497515e08)

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways/gateway/001497515e08"
```

### 4. 搜索电站

```
GET /api/station-gateways/search
```

**查询参数:**
- `keyword` (必需): 搜索关键词（最少 2 个字符）

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways/search?keyword=德业"
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "stationId": 173,
      "stationName": "德业龙山2号",
      "gatewayId": "001497515e08"
    }
  ],
  "count": 1
}
```

### 5. 获取统计信息

```
GET /api/station-gateways/statistics
```

返回电站网关的统计信息。

**示例请求:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways/statistics"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "total": 16,
    "active": 16,
    "inactive": 0,
    "byProvince": []
  }
}
```

### 6. 创建或更新单个电站网关映射

```
POST /api/station-gateways
```

**请求体:**
```json
{
  "stationId": 300,
  "stationName": "新电站名称",
  "gatewayId": "0014975xxxxx",
  "location": {
    "province": "浙江省",
    "city": "宁波市",
    "address": "详细地址"
  },
  "capacity": 500,
  "notes": "备注信息"
}
```

**示例请求:**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": 300,
    "stationName": "新电站",
    "gatewayId": "0014975xxxxx"
  }' \
  "http://localhost:5001/api/station-gateways"
```

### 7. 批量创建或更新电站网关映射

```
POST /api/station-gateways/batch
```

**请求体:**
```json
{
  "stations": [
    {
      "stationId": 301,
      "stationName": "电站1",
      "gatewayId": "001497510001"
    },
    {
      "stationId": 302,
      "stationName": "电站2",
      "gatewayId": "001497510002"
    }
  ]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "批量操作完成",
  "results": {
    "created": 2,
    "updated": 0,
    "failed": 0,
    "errors": []
  }
}
```

### 8. 删除电站网关映射（软删除）

```
DELETE /api/station-gateways/:stationId
```

**路径参数:**
- `stationId`: 电站 ID

**示例请求:**
```bash
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/station-gateways/173"
```

## 数据模型说明

### StationGateway 模型

```javascript
{
  stationId: Number,        // 电站 ID（唯一）
  stationName: String,      // 电站名称
  gatewayId: String,        // 网关 ID（唯一，MAC地址格式）
  isActive: Boolean,        // 是否启用，默认 true
  location: {               // 位置信息（可选）
    province: String,
    city: String,
    address: String
  },
  capacity: Number,         // 装机容量 (kW)
  commissionDate: Date,     // 投运日期
  notes: String,            // 备注
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

### 网关 ID 格式

网关 ID 采用 MAC 地址格式：
- 存储格式: `001497515e08` (12位小写十六进制)
- 格式化显示: `00:14:97:51:5e:08` (冒号分隔)

使用 `getFormattedGatewayId()` 方法可以获取格式化的网关 ID：

```javascript
const station = await StationGateway.findByStationId(173);
console.log(station.gatewayId);                    // 001497515e08
console.log(station.getFormattedGatewayId());      // 00:14:97:51:5e:08
```

## 重新导入数据

如需重新导入或更新数据，运行以下命令：

```bash
cd backend
node src/scripts/importStationGateways.js
```

**注意:** 重新导入会清空现有的所有电站网关数据。

## 前端集成示例

### 创建 API 服务

```javascript
// frontend/src/services/stationGatewayService.js
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/station-gateways';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 获取所有电站网关列表
export const getAllStationGateways = async (params = {}) => {
  const response = await axios.get(API_URL, {
    params,
    headers: getAuthHeader()
  });
  return response.data;
};

// 根据电站 ID 查询
export const getStationByStationId = async (stationId) => {
  const response = await axios.get(`${API_URL}/station/${stationId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// 根据网关 ID 查询
export const getStationByGatewayId = async (gatewayId) => {
  const response = await axios.get(`${API_URL}/gateway/${gatewayId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// 搜索电站
export const searchStations = async (keyword) => {
  const response = await axios.get(`${API_URL}/search`, {
    params: { keyword },
    headers: getAuthHeader()
  });
  return response.data;
};

// 获取统计信息
export const getStatistics = async () => {
  const response = await axios.get(`${API_URL}/statistics`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// 创建或更新电站网关
export const createOrUpdateStation = async (stationData) => {
  const response = await axios.post(API_URL, stationData, {
    headers: getAuthHeader()
  });
  return response.data;
};
```

### React 组件示例

```javascript
import { useState, useEffect } from 'react';
import { getAllStationGateways, getStationByStationId } from '../services/stationGatewayService';

function StationGatewayList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const fetchStations = async () => {
    setLoading(true);
    try {
      const result = await getAllStationGateways({
        page: pagination.page,
        limit: pagination.limit
      });
      setStations(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('获取电站列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [pagination.page]);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h2>电站网关对应表</h2>
      <table>
        <thead>
          <tr>
            <th>电站 ID</th>
            <th>电站名称</th>
            <th>网关 ID</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(station => (
            <tr key={station.stationId}>
              <td>{station.stationId}</td>
              <td>{station.stationName}</td>
              <td>{station.gatewayId}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          disabled={pagination.page === 1}
          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
        >
          上一页
        </button>
        <span>第 {pagination.page} / {pagination.pages} 页</span>
        <button
          disabled={pagination.page === pagination.pages}
          onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export default StationGatewayList;
```

## 使用场景

### 场景 1: 根据设备数据查找所属电站

当从网关设备接收到数据时，使用网关 ID 查找对应的电站信息：

```javascript
const gatewayId = '001497515e08';  // 从设备数据中获取
const result = await getStationByGatewayId(gatewayId);

if (result.success) {
  console.log(`网关 ${gatewayId} 属于电站: ${result.data.stationName}`);
  console.log(`电站 ID: ${result.data.stationId}`);
}
```

### 场景 2: 电站管理界面

在电站管理界面中显示电站与网关的对应关系：

```javascript
// 获取所有电站列表
const stations = await getAllStationGateways({
  page: 1,
  limit: 50,
  sortBy: 'stationName'
});

// 搜索特定电站
const searchResults = await searchStations('储能');
```

### 场景 3: 数据导入和同步

批量导入或更新电站网关映射：

```javascript
const stationsToImport = [
  { stationId: 301, stationName: '新电站1', gatewayId: '001497510001' },
  { stationId: 302, stationName: '新电站2', gatewayId: '001497510002' }
];

const result = await axios.post('/api/station-gateways/batch', {
  stations: stationsToImport
}, {
  headers: getAuthHeader()
});

console.log(`成功导入 ${result.data.results.created} 条记录`);
```

## 常见问题

### Q: 为什么导入时只有 16 条记录而不是 29 条？

可能是由于 Excel 文件中存在重复的电站 ID 或网关 ID。数据库中这两个字段都设置了唯一索引，重复的记录会被自动跳过。

### Q: 网关 ID 的格式是什么？

网关 ID 使用 MAC 地址格式，存储时统一转换为小写的 12 位十六进制字符串（如 `001497515e08`）。可以使用 `getFormattedGatewayId()` 方法获取冒号分隔的格式化版本。

### Q: 如何添加位置信息或其他自定义字段？

在创建或更新时传入额外的字段：

```javascript
await createOrUpdateStation({
  stationId: 173,
  stationName: "德业龙山2号",
  gatewayId: "001497515e08",
  location: {
    province: "浙江省",
    city: "宁波市",
    address: "龙山镇工业园区"
  },
  capacity: 500,
  commissionDate: new Date('2023-01-15'),
  notes: "一期项目"
});
```

### Q: 删除操作是永久删除吗？

不是。DELETE 操作执行的是软删除，只是将 `isActive` 字段设置为 `false`。记录仍然保留在数据库中，但不会在普通查询中返回。

## 技术支持

如有问题，请查看：
- 后端日志: `backend/logs/`
- MongoDB 数据库: `ess-platform` 数据库，`station_gateways` 集合
- Excel 数据源: `电站网关对应表.xlsx`
