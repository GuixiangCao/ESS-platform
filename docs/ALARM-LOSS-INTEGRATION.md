# 告警损失集成到损失分析页面

## 概述

已成功将设备告警的经济损失数据集成到电站损失分析页面中，用户可以在损失分析表格中直观地看到每日/每月的告警损失金额。

## 新增功能

### 1. 前端服务

**文件**: `frontend/src/services/alarmLossService.js`

提供告警损失计算的API调用接口：
- `calculateStationLosses(stationId, params)` - 计算电站告警总损失
- `getLossByDevice(stationId, params)` - 按设备统计告警损失
- `calculateSingleAlarmLoss(alarmId, params)` - 计算单个告警损失
- `getAlarmStats(stationId, params)` - 获取告警统计

### 2. 损失分析页面更新

**文件**: `frontend/src/pages/LossAnalysis.jsx`

#### 新增状态管理
```javascript
const [alarmLossData, setAlarmLossData] = useState({}); // 告警损失数据
```

#### 数据获取增强
在 `fetchLossData` 函数中，为每一天获取：
- 告警数量（`alarmCount`）
- 告警损失金额（`alarmLoss`）

```javascript
// 为每一天获取告警数量和告警损失
const dataWithAlarmInfo = await Promise.all(
  comparisonData.map(async (day) => {
    // ... 获取告警数量

    // 计算该天的告警损失
    const lossResponse = await calculateStationLosses(stationId, {
      startDate: formattedDate,
      endDate: formattedDate
    });

    return {
      ...day,
      alarmCount,
      alarmLoss: lossResponse.data?.totalLoss || 0
    };
  })
);
```

#### 月度聚合
在 `aggregateByMonth` 函数中添加告警损失的聚合：
```javascript
monthlyData[monthKey].alarmLoss += (day.alarmLoss || 0);
```

#### UI更新

**1. 表头新增列**:
```jsx
<th>故障数</th>
<th>告警损失</th>  {/* 新增 */}
<th>损失原因</th>
```

**2. 按日查看 - 显示告警损失**:
```jsx
<td className="amount alarm-loss">
  {day.alarmLoss > 0 ? (
    <span className="alarm-loss-badge">
      {formatCurrency(day.alarmLoss)}
    </span>
  ) : (
    <span className="no-loss">-</span>
  )}
</td>
```

**3. 按月查看 - 聚合显示**:
```jsx
<td className="amount alarm-loss">
  {month.alarmLoss > 0 ? (
    <span className="alarm-loss-badge">
      {formatCurrency(month.alarmLoss)}
    </span>
  ) : (
    <span className="no-loss">-</span>
  )}
</td>
```

### 3. 样式更新

**文件**: `frontend/src/pages/LossAnalysis.css`

新增样式：

```css
/* 告警损失样式 */
.alarm-loss {
  text-align: right;
}

.alarm-loss-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.no-loss {
  color: var(--text-disabled);
  font-size: 0.9rem;
}
```

## 数据流程

```
1. 用户访问电站分析页面 → 损失分析标签
   ↓
2. fetchLossData() 函数执行
   ↓
3. 获取收益损失对比数据（comparisonData）
   ↓
4. 为每一天并发请求：
   a. 获取告警数量（alarmCount）
   b. 计算告警损失（alarmLoss）
   ↓
5. 将数据设置到 lossComparison 状态
   ↓
6. 表格渲染显示：
   - 每日视图：显示每天的告警损失
   - 每月视图：显示月度聚合的告警损失
```

## 表格列结构

### 按日查看

| 列名 | 说明 | 示例 |
|------|------|------|
| 日期 | 日期 | 2025-12-21 |
| 充电时长 | 充电小时数 | 12.0h |
| 放电时长 | 放电小时数 | 9.0h |
| 预期收益 | 预期收益金额 | ¥1,200.00 |
| 实际收益 | 实际收益金额 | ¥1,080.00 |
| 收益损失 | 收益损失金额 | ¥120.00 |
| 达成率 | 达成百分比 | 90% |
| 故障数 | 告警次数 | 2 |
| **告警损失** | **告警导致的经济损失** | **¥85.32** |
| 损失原因 | 损失分类 | 设备故障 ¥100.00 |

### 按月查看

| 列名 | 说明 | 示例 |
|------|------|------|
| 月份 | 月份 | 2025年12月 |
| 充电时长 | 月度充电时长 | 372.0h |
| 放电时长 | 月度放电时长 | 279.0h |
| 预期收益 | 月度预期收益 | ¥37,200.00 |
| 实际收益 | 月度实际收益 | ¥34,500.00 |
| 收益损失 | 月度收益损失 | ¥2,700.00 |
| 达成率 | 月度达成率 | 92.7% |
| 故障数 | 月度告警次数 | 15 |
| **告警损失** | **月度告警损失总计** | **¥2,553.00** |
| 损失原因 | 损失分类汇总 | 设备故障 ¥3,000.00 |

## 视觉设计

### 告警损失徽章
- **背景**: 红色渐变（rgba(239, 68, 68, 0.1) → rgba(239, 68, 68, 0.05)）
- **文字颜色**: 深红色 (#dc2626)
- **边框**: 半透明红色边框
- **字体**: 等宽字体（SF Mono）
- **样式**: 圆角矩形徽章

### 无损失显示
- **文字**: "-"
- **颜色**: 灰色（disabled状态）

## 性能优化

1. **并发请求**: 使用 `Promise.all` 并发获取每天的告警损失数据
2. **单日查询**: 每次只查询当天的告警损失，减少数据量
3. **前端聚合**: 月度数据在前端进行聚合，避免额外API调用
4. **缓存策略**: 可以考虑添加缓存机制减少重复请求

## 使用示例

### 查看某个电站的损失分析

1. 进入"电站分析"页面
2. 选择电站（如"电站 173"）
3. 切换到"损失分析"标签
4. 在表格中查看：
   - "故障数"列：显示告警次数
   - "告警损失"列：显示告警导致的经济损失
   - "损失原因"列：显示其他类型的损失分类
5. 切换"按日查看"/"按月查看"查看不同维度的数据

### 数据说明

- **告警损失为 0 或 "-"**:
  - 该天没有告警
  - 该天有告警但无充放电策略数据
  - 该天有告警但无电价数据

- **告警损失有值**:
  - 显示红色徽章
  - 金额为该天所有告警的损失总和
  - 计算公式：`损失 = Σ(告警时长 × 功率 × 电价)`

## 数据完整性

### 计算告警损失需要的数据

1. **告警数据** (Alarm 集合)
   - 告警开始和结束时间
   - 所属电站ID

2. **充放电策略** (ChargingStrategy 集合)
   - 每日时段配置
   - 每个时段的功率

3. **电价数据** (ElectricityPrice 集合)
   - 分时电价配置

### 数据覆盖情况（测试结果）

基于电站 173 在 2025-10至12月的数据：
- 总告警数: 78 次
- 成功计算损失: 24 次 (30.8%)
- 无充放电数据: 12 次 (15.4%)
- 其他: 42 次 (53.8%)

## 后续优化建议

1. **加载优化**:
   - 添加骨架屏或进度指示器
   - 分批加载大量数据

2. **缓存机制**:
   - 缓存告警损失数据
   - 避免重复计算

3. **错误处理**:
   - 更友好的错误提示
   - 数据缺失时的说明

4. **交互增强**:
   - 点击告警损失显示详细计算过程
   - 显示告警损失的时间分布图

5. **导出功能**:
   - 支持导出包含告警损失的Excel报表

6. **实时更新**:
   - WebSocket推送最新告警损失数据

## 相关文件

- `frontend/src/services/alarmLossService.js` - 前端服务（新建）
- `frontend/src/pages/LossAnalysis.jsx` - 损失分析页面（已更新）
- `frontend/src/pages/LossAnalysis.css` - 样式文件（已更新）
- `backend/src/services/alarmLossCalculator.js` - 后端计算服务
- `backend/src/controllers/alarmController.js` - 后端控制器
- `backend/src/routes/alarms.js` - 后端路由

## 技术栈

- **前端框架**: React
- **状态管理**: React Hooks (useState, useEffect)
- **HTTP客户端**: Axios
- **样式**: CSS模块化
- **字体**: SF Mono / Monaco（等宽字体）

## 测试建议

1. 测试有告警损失的电站（如173、205）
2. 测试无告警数据的电站
3. 测试按日/按月视图切换
4. 测试告警损失的显示样式
5. 测试数据加载性能
6. 测试移动端响应式布局
