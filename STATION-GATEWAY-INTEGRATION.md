# 电站网关信息集成说明

## 概述

已成功将电站网关信息集成到电站分析详情页面中。用户现在可以在查看电站分析时看到该电站对应的网关 ID 信息。

## 集成位置

网关信息显示在**电站分析页面**（Station Analysis）的电站选择器下方，作为一个独立的信息卡片展示。

**页面路径**: `/station-analysis`

## 功能特性

### 1. 自动获取网关信息

当用户选择一个电站时，系统会自动:
- 查询该电站对应的网关信息
- 如果找到网关信息，显示网关信息卡片
- 如果没有网关信息，不显示卡片（静默处理）

### 2. 网关信息展示

网关信息卡片包含:
- **网关图标**: 紫色渐变背景的网络图标
- **网关 ID**: 原始格式（12位十六进制，如 `001497515e08`）
- **格式化显示**: MAC地址标准格式（如 `00:14:97:51:5e:08`）

### 3. 视觉设计

- **渐变背景**: 紫色渐变半透明背景
- **悬停效果**: 鼠标悬停时卡片轻微上浮并增强阴影
- **响应式布局**: 在移动设备上自动调整为垂直布局
- **等宽字体**: 网关 ID 使用 Courier New 字体，便于阅读

## 实现细节

### 前端组件

**文件**: `frontend/src/pages/StationAnalysis.jsx`

添加的功能:
1. 导入网关服务: `import { getStationByStationId } from '../services/stationGatewayService'`
2. 添加状态管理: `const [gatewayInfo, setGatewayInfo] = useState(null)`
3. 在获取电站数据时同时获取网关信息
4. 渲染网关信息卡片

### API 服务

**文件**: `frontend/src/services/stationGatewayService.js`

提供的方法:
- `getAllStationGateways()`: 获取所有电站网关列表
- `getStationByStationId(stationId)`: 根据电站ID查询网关信息
- `getStationByGatewayId(gatewayId)`: 根据网关ID查询电站信息
- `searchStations(keyword)`: 搜索电站
- `getStatistics()`: 获取统计信息
- `createOrUpdateStation(stationData)`: 创建或更新电站网关

### 样式文件

**文件**: `frontend/src/pages/StationAnalysis.css`

添加的样式类:
- `.gateway-info-card`: 网关信息卡片容器
- `.gateway-icon`: 网关图标
- `.gateway-content`: 内容区域
- `.gateway-label`: 标签文字
- `.gateway-value`: 网关ID主要显示
- `.gateway-formatted`: 格式化的网关ID

## 使用示例

### 查看电站的网关信息

1. 访问电站分析页面: http://localhost:3000/station-analysis
2. 在电站选择器中选择一个电站
3. 如果该电站有网关信息，会在选择器下方看到网关信息卡片
4. 卡片显示网关 ID 的两种格式

### 示例电站

以下电站已有网关信息（从导入的数据中）:
- 电站 ID 173 - 德业龙山2号 - 网关: `001497515e08`
- 电站 ID 205 - 喜尔美厨具站 - 网关: `00149751c3c4`
- 电站 ID 208 - 科宁达站 - 网关: `00149751c39b`
- 电站 ID 212 - 隆源二厂储能电站 - 网关: `0014975147c7`

## 技术架构

```
┌─────────────────────────────────────────┐
│     StationAnalysis.jsx                 │
│  (电站分析页面组件)                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 电站选择器                       │   │
│  └─────────────────────────────────┘   │
│                ↓                        │
│  ┌─────────────────────────────────┐   │
│  │ 网关信息卡片                     │   │
│  │ - 网关图标                       │   │
│  │ - 网关 ID (原始)                 │   │
│  │ - 网关 ID (格式化)               │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
                 ↓ API 调用
┌─────────────────────────────────────────┐
│  stationGatewayService.js               │
│  (前端 API 服务层)                       │
└─────────────────────────────────────────┘
                 ↓ HTTP 请求
┌─────────────────────────────────────────┐
│  Backend API                            │
│  /api/station-gateways/station/:id     │
│                                         │
│  ├─ stationGatewayController.js        │
│  ├─ stationGatewayRoutes.js            │
│  └─ StationGateway Model                │
└─────────────────────────────────────────┘
                 ↓ 数据库查询
┌─────────────────────────────────────────┐
│  MongoDB                                │
│  Collection: station_gateways           │
│  - stationId (索引)                     │
│  - stationName                          │
│  - gatewayId (唯一索引)                 │
└─────────────────────────────────────────┘
```

## 错误处理

### 网关信息不存在

如果某个电站没有对应的网关信息:
- 不会显示网关信息卡片
- 不会显示错误消息
- 只在控制台输出日志: "该电站暂无网关信息"
- 用户体验不受影响

### API 调用失败

如果 API 调用失败:
- 网关信息卡片不会显示
- 错误会被捕获并记录到控制台
- 页面其他功能正常运行

## 扩展功能建议

### 1. 添加网关状态显示

```jsx
<div className="gateway-status">
  <span className={`status-dot ${gatewayInfo.isOnline ? 'online' : 'offline'}`}></span>
  <span>{gatewayInfo.isOnline ? '在线' : '离线'}</span>
</div>
```

### 2. 添加网关详情链接

```jsx
<button
  className="gateway-details-btn"
  onClick={() => navigate(`/gateway/${gatewayInfo.gatewayId}`)}
>
  查看网关详情
</button>
```

### 3. 显示网关位置信息

```jsx
{gatewayInfo.location && (
  <div className="gateway-location">
    <MapPin size={16} />
    <span>{gatewayInfo.location.city}</span>
  </div>
)}
```

### 4. 添加复制功能

```jsx
<button
  className="copy-btn"
  onClick={() => {
    navigator.clipboard.writeText(gatewayInfo.gatewayId);
    // 显示复制成功提示
  }}
>
  <Copy size={16} />
  复制
</button>
```

## 测试

### 手动测试步骤

1. **测试有网关信息的电站**
   ```
   1. 访问 http://localhost:3000/station-analysis
   2. 选择电站 ID 173
   3. 验证网关信息卡片显示
   4. 确认显示: 001497515e08 和 00:14:97:51:5e:08
   ```

2. **测试无网关信息的电站**
   ```
   1. 选择一个新添加的电站（如果有）
   2. 验证不显示网关信息卡片
   3. 确认页面其他功能正常
   ```

3. **测试响应式布局**
   ```
   1. 调整浏览器窗口大小
   2. 在移动设备尺寸下查看
   3. 验证卡片布局调整为垂直方向
   ```

### API 测试

```bash
# 测试根据电站 ID 查询网关
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/station-gateways/station/173"

# 预期响应:
# {
#   "success": true,
#   "data": {
#     "stationId": 173,
#     "stationName": "德业龙山2号",
#     "gatewayId": "001497515e08",
#     "isActive": true
#   }
# }
```

## 数据维护

### 添加新的电站网关映射

通过 API 添加:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": 300,
    "stationName": "新电站名称",
    "gatewayId": "0014975xxxxx"
  }' \
  "http://localhost:5001/api/station-gateways"
```

或者更新 Excel 文件后重新导入:

```bash
cd backend
node src/scripts/importStationGateways.js
```

## 相关文档

- [电站网关 API 完整文档](../STATION-GATEWAY-API.md)
- [后端 API 说明](../BACKEND.md)
- [前端开发文档](../FRONTEND.md)

## 技术支持

如有问题或需要帮助，请查看:
- MongoDB 数据库: `ess-platform` 数据库，`station_gateways` 集合
- 前端控制台日志
- 后端服务日志

## 更新日志

### 2026-01-27
- ✅ 创建电站网关 API 服务 (`stationGatewayService.js`)
- ✅ 集成网关信息到电站分析页面
- ✅ 添加网关信息卡片样式
- ✅ 实现自动查询和显示功能
- ✅ 添加响应式布局支持
