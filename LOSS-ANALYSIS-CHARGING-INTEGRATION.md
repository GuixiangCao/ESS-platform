# 损失分析页面 - 充放电时长集成

## 概述

在损失分析页面中新增了每日的充电和放电时间显示，帮助用户更全面地了解电站的运行状况。

## 更新内容

### 1. 前端服务层

**新增文件**: `frontend/src/services/chargingStrategyService.js`

提供了充放电策略API的前端调用接口：
- `getDailyChargingStats(params)` - 获取每日充放电统计
- `getAllStrategies(params)` - 获取所有充放电策略
- `getByStationId(stationId, params)` - 根据电站ID获取策略
- `getByGatewayId(gatewayId, params)` - 根据网关ID获取策略
- `getStatistics()` - 获取统计信息

### 2. 损失分析页面更新

**文件**: `frontend/src/pages/LossAnalysis.jsx`

#### 新增功能：

**a. 状态管理**
```javascript
const [chargingStats, setChargingStats] = useState({}); // 充放电统计数据
```

**b. 数据获取**
- 在`fetchLossData`函数中添加了充放电统计数据的获取
- 使用`getDailyChargingStats` API获取指定电站的充放电数据
- 将数据按日期索引存储在`chargingStats`状态中

**c. 数据处理**
```javascript
// 获取指定日期的充放电数据
const getChargingDataForDate = (date) => {
  const dateKey = new Date(date).toISOString().split('T')[0];
  const stats = chargingStats[dateKey];

  if (!stats || stats.length === 0) {
    return null;
  }

  // 汇总所有网关的充放电时长
  const total = stats.reduce((acc, stat) => ({
    chargingHours: acc.chargingHours + (stat.chargingHours || 0),
    dischargingHours: acc.dischargingHours + (stat.dischargingHours || 0),
    idleHours: acc.idleHours + (stat.idleHours || 0)
  }), { chargingHours: 0, dischargingHours: 0, idleHours: 0 });

  return total;
};
```

**d. 月度数据聚合**
- 更新`aggregateByMonth`函数以包含充放电时长的聚合

**e. UI更新**

1. **表头添加新列**：
```jsx
<th>充电时长</th>
<th>放电时长</th>
```

2. **按日查看 - 显示充放电时长**：
```jsx
<td className="charging-hours">
  {chargingData ? (
    <span className="hours-badge charging">
      <Battery size={14} />
      {chargingData.chargingHours.toFixed(1)}h
    </span>
  ) : (
    <span className="hours-badge no-data">-</span>
  )}
</td>
<td className="discharging-hours">
  {chargingData ? (
    <span className="hours-badge discharging">
      <BatteryCharging size={14} />
      {chargingData.dischargingHours.toFixed(1)}h
    </span>
  ) : (
    <span className="hours-badge no-data">-</span>
  )}
</td>
```

3. **按月查看 - 聚合显示**：
- 显示整月的充放电时长总计
- 使用相同的徽章样式

### 3. 样式更新

**文件**: `frontend/src/pages/LossAnalysis.css`

新增样式：
- `.charging-hours`, `.discharging-hours` - 充放电时长列样式
- `.hours-badge` - 时长徽章基础样式
- `.hours-badge.charging` - 充电徽章样式（绿色主题）
- `.hours-badge.discharging` - 放电徽章样式（蓝色主题）
- `.hours-badge.no-data` - 无数据徽章样式
- 响应式布局支持

### 4. 图标引入

新增Lucide React图标：
- `Battery` - 充电图标
- `BatteryCharging` - 放电图标

## 数据展示示例

### 按日查看

| 日期 | 充电时长 | 放电时长 | 预期收益 | 实际收益 | 收益损失 | 达成率 | 故障数 | 损失原因 |
|------|----------|----------|----------|----------|----------|--------|--------|----------|
| 2026-01-30 | 🔋 12.0h | ⚡ 9.0h | ¥1,200 | ¥1,080 | ¥120 | 90% | 2 | ... |
| 2026-01-29 | 🔋 12.0h | ⚡ 9.0h | ¥1,200 | ¥1,150 | ¥50 | 95.8% | 1 | ... |

### 按月查看

| 月份 | 充电时长 | 放电时长 | 预期收益 | 实际收益 | 收益损失 | 达成率 | 故障数 | 损失原因 |
|------|----------|----------|----------|----------|----------|--------|--------|----------|
| 2026年01月 | 🔋 372.0h | ⚡ 279.0h | ¥37,200 | ¥34,500 | ¥2,700 | 92.7% | 15 | ... |

## 特性说明

### 1. 多网关支持
- 自动汇总同一电站下所有网关的充放电时长
- 适配多网关电站（如电站205有4个网关）

### 2. 数据缺失处理
- 当某天没有充放电策略数据时，显示"-"
- 不会影响其他列的正常显示

### 3. 视觉设计
- **充电**：绿色主题 + 电池图标
- **放电**：蓝色主题 + 充电图标
- 悬停效果：增强交互反馈
- 响应式设计：移动端自适应

### 4. 性能优化
- 一次性获取所有数据，避免多次API调用
- 使用日期索引快速查找
- 前端聚合计算，减少后端负载

## 技术栈

- **前端框架**: React
- **图标库**: Lucide React
- **HTTP客户端**: Axios
- **状态管理**: React Hooks (useState, useEffect)

## API集成

使用的后端API端点：
```
GET /api/charging-strategies/daily-stats?stationId={id}&limit={num}
```

响应格式：
```json
{
  "success": true,
  "data": [
    {
      "stationId": 173,
      "gatewayId": "c3beb955a08b432tbuqu",
      "date": "2026-01-30T00:00:00.000Z",
      "chargingHours": 12.0,
      "dischargingHours": 9.0,
      "idleHours": 3.0,
      "totalHours": 24.0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1236,
    "pages": 13
  }
}
```

## 使用方法

1. 进入电站分析页面
2. 选择具体电站
3. 切换到"损失分析"标签
4. 在表格中查看每日/每月的充放电时长
5. 可切换"按日查看"和"按月查看"

## 浏览器支持

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- 移动端浏览器: ✅

## 注意事项

1. **数据依赖**: 需要后端充放电策略数据已导入
2. **性能**: 大量数据时（>1000条记录）可能需要分页优化
3. **缓存**: 当前未实现数据缓存，每次切换电站都会重新获取

## 相关文件

- `frontend/src/services/chargingStrategyService.js` - API服务
- `frontend/src/pages/LossAnalysis.jsx` - 主要页面
- `frontend/src/pages/LossAnalysis.css` - 样式文件
- `backend/src/controllers/chargingStrategyController.js` - 后端控制器
- `backend/src/routes/chargingStrategies.js` - 后端路由

## 后续优化建议

1. **数据缓存**: 实现Redux或Context缓存，避免重复请求
2. **加载优化**: 添加骨架屏或加载动画
3. **错误处理**: 更友好的错误提示
4. **导出功能**: 支持导出包含充放电时长的Excel报表
5. **图表展示**: 添加充放电时长趋势图
6. **实时更新**: WebSocket推送最新数据

## 测试建议

1. 测试有充放电数据的电站（如173、205）
2. 测试无充放电数据的电站
3. 测试按日/按月视图切换
4. 测试多网关电站的数据汇总
5. 测试移动端响应式布局
