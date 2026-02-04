# SOC曲线详情功能

## 概述

在损失分析页面中新增了SOC（State of Charge，电池电量状态）曲线详情功能，用户可以查看电站内各个设备在指定日期的SOC变化曲线。

## 功能特性

### 1. 页面优化
- ✅ **隐藏充放电时长列**: 简化损失分析表格，隐藏了"充电时长"和"放电时长"列
- ✅ **新增操作列**: 添加"操作"列，包含两个操作按钮

### 2. SOC详情模态框

#### 功能特点
- 📊 **多设备曲线对比**: 支持同时查看电站内多个设备的SOC曲线
- 🎨 **设备选择器**: 可自由选择/取消选择设备，每个设备使用不同颜色标识
- 📈 **交互式图表**: 使用Recharts库绘制交互式曲线图
- 📱 **响应式设计**: 支持桌面和移动设备访问

#### 界面元素
1. **设备选择器**
   - 显示所有设备芯片（chip）
   - 每个设备显示设备名称和数据点数量
   - 点击芯片可切换选择/取消选择
   - 选中的设备用彩色边框标识

2. **SOC曲线图**
   - X轴：时间（HH:MM格式）
   - Y轴：SOC百分比（0-100%）
   - 网格线：辅助读取数据
   - 鼠标悬停：显示具体数值

3. **统计信息**
   - 总设备数
   - 选中设备数
   - 总数据点数

## 技术实现

### 后端实现

#### 1. 控制器 (socController.js)

**新增文件**: `backend/src/controllers/socController.js`

**主要方法**:
- `getStationSocData`: 获取电站在指定日期的所有设备SOC数据
- `getDeviceSocData`: 获取单个设备在指定日期范围的SOC数据
- `getDeviceSocAtTime`: 获取设备在特定时刻的SOC值

**示例响应**:
```json
{
  "success": true,
  "data": {
    "date": "2025-09-15",
    "stationId": 173,
    "stationName": "测试电站",
    "totalDevices": 5,
    "devices": [
      {
        "deviceId": "3e7cb3021c9d4acO2qgI",
        "deviceName": "设备A",
        "gatewayId": "00149751c3c4",
        "data": [
          {
            "timestamp": "2025-09-15T00:00:00.000Z",
            "soc": 85.5
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

#### 2. 路由 (soc.js)

**新增文件**: `backend/src/routes/soc.js`

**API端点**:
```
GET /api/soc/station/:stationId/daily?date=YYYY-MM-DD
GET /api/soc/device/:deviceId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/soc/device/:deviceId/at-time?timestamp=ISO8601
```

#### 3. 服务端入口 (index.js)

**修改文件**: `backend/src/index.js`

添加SOC路由：
```javascript
const socRoutes = require('./routes/soc');
app.use('/api/soc', socRoutes);
```

### 前端实现

#### 1. 服务层 (socService.js)

**新增文件**: `frontend/src/services/socService.js`

封装了所有SOC相关的API调用：
```javascript
import { getStationSocData, getDeviceSocData, getDeviceSocAtTime } from './services/socService';

// 获取电站SOC数据
const data = await getStationSocData(173, '2025-09-15');
```

#### 2. SOC详情模态框组件 (SocDetailModal.jsx)

**新增文件**: `frontend/src/components/SocDetailModal.jsx`

**Props**:
- `isOpen`: 是否打开模态框
- `onClose`: 关闭回调
- `stationId`: 电站ID
- `date`: 查询日期（YYYY-MM-DD格式）
- `stationName`: 电站名称（可选）

**使用示例**:
```jsx
<SocDetailModal
  isOpen={showSocModal}
  onClose={() => setShowSocModal(false)}
  stationId={173}
  date="2025-09-15"
  stationName="测试电站"
/>
```

#### 3. 样式文件 (SocDetailModal.css)

**新增文件**: `frontend/src/components/SocDetailModal.css`

包含：
- 模态框通用样式
- 设备选择器样式
- 图表容器样式
- 响应式设计

#### 4. 损失分析页面更新 (LossAnalysis.jsx)

**修改文件**: `frontend/src/pages/LossAnalysis.jsx`

**变更内容**:
1. 隐藏充放电时长列
2. 添加"操作"列
3. 添加"查看SOC详情"按钮
4. 集成SocDetailModal组件

**新增状态**:
```javascript
const [showSocModal, setShowSocModal] = useState(false);
```

**按钮实现**:
```jsx
<button
  className="view-soc-btn"
  onClick={() => {
    setSelectedDate(day.date);
    setShowSocModal(true);
  }}
>
  <LineChart size={14} />
  查看SOC详情
</button>
```

#### 5. 样式更新 (LossAnalysis.css)

**修改文件**: `frontend/src/pages/LossAnalysis.css`

添加了操作按钮区域样式：
```css
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.view-soc-btn {
  background: #10b981;
}

.view-soc-btn:hover {
  background: #059669;
}
```

## 依赖库

### Recharts

用于绘制交互式图表的React图表库。

**安装**:
```bash
npm install recharts
```

**版本**: ^2.x

**使用的组件**:
- `LineChart`: 线形图容器
- `Line`: 曲线
- `XAxis`, `YAxis`: 坐标轴
- `CartesianGrid`: 网格线
- `Tooltip`: 悬停提示
- `Legend`: 图例
- `ResponsiveContainer`: 响应式容器

## 使用流程

### 用户操作流程

1. **进入损失分析页面**
   - 导航至"电站分析" → "损失分析"标签

2. **选择日期**
   - 在"按日查看"模式下，找到想要查看的日期

3. **打开SOC详情**
   - 点击该日期行的"查看SOC详情"按钮

4. **查看和分析**
   - 模态框显示该电站所有设备的SOC曲线
   - 默认选中所有设备
   - 点击设备芯片可切换显示/隐藏该设备曲线
   - 鼠标悬停在曲线上查看具体数值

5. **关闭详情**
   - 点击右上角关闭按钮或点击背景关闭模态框

### 数据流程

```
用户点击"查看SOC详情"
    ↓
前端调用 getStationSocData(stationId, date)
    ↓
后端 GET /api/soc/station/:stationId/daily?date=YYYY-MM-DD
    ↓
查询 station_gateways 获取设备列表
    ↓
查询 soc_data 获取当天SOC数据
    ↓
按设备分组数据
    ↓
返回包含所有设备SOC数据的JSON
    ↓
前端接收数据并渲染图表
```

## 数据来源

SOC数据来自之前导入的 `soc_data` 集合，包含：
- 33个设备的历史SOC数据
- 时间范围：2025-09-01 至 2026-01-27
- 总记录数：6,378,687条
- 采样频率：约每30秒一条

**数据模型**:
```javascript
{
  deviceId: String,      // 设备ID
  gatewayId: String,     // 网关ID
  stationId: Number,     // 电站ID
  timestamp: Date,       // 时间戳
  soc: Number,           // SOC值（0-100）
  dataDate: Date,        // 数据日期
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

## 性能优化

### 后端优化

1. **索引使用**
   ```javascript
   // 使用复合索引加速查询
   { deviceId: 1, timestamp: 1 }
   { stationId: 1, dataDate: 1 }
   ```

2. **数据分组**
   - 后端按设备分组数据，减少前端处理

3. **日期范围限制**
   - 只查询指定日期的数据（00:00:00 - 23:59:59）

### 前端优化

1. **延迟加载**
   - 只在打开模态框时加载数据

2. **设备选择**
   - 支持动态选择设备，只渲染选中的曲线

3. **响应式图表**
   - 使用ResponsiveContainer自动适配容器大小

4. **数据点优化**
   - 对于超大数据集，可考虑数据采样或分页加载

## 错误处理

### 后端错误处理

```javascript
try {
  // 查询数据
} catch (error) {
  console.error('获取电站SOC数据失败:', error);
  res.status(500).json({
    success: false,
    message: '获取电站SOC数据失败',
    error: error.message
  });
}
```

### 前端错误处理

1. **加载状态**
   ```jsx
   {loading && (
     <div className="loading-state">
       <Loader className="spinner" />
       <p>加载SOC数据中...</p>
     </div>
   )}
   ```

2. **错误状态**
   ```jsx
   {error && (
     <div className="error-state">
       <AlertCircle size={40} />
       <p>{error}</p>
       <button onClick={fetchSocData}>重试</button>
     </div>
   )}
   ```

3. **空数据状态**
   ```jsx
   {devices.length === 0 && (
     <div className="empty-state">
       <Calendar size={48} />
       <p>该日期没有SOC数据</p>
     </div>
   )}
   ```

## 未来改进建议

### 功能扩展

1. **时间范围选择**
   - 支持选择多天的SOC数据对比
   - 添加日期范围选择器

2. **数据导出**
   - 支持导出CSV格式的SOC数据
   - 支持导出图表为PNG图片

3. **统计分析**
   - 显示平均SOC、最高/最低SOC
   - 计算SOC变化率
   - 识别充放电周期

4. **告警关联**
   - 在SOC曲线上标注告警时间点
   - 显示告警发生时的SOC值

5. **实时数据**
   - 集成WebSocket实时更新SOC数据
   - 支持实时监控模式

### 性能优化

1. **数据缓存**
   - 前端缓存已查询的SOC数据
   - 使用Redis缓存热门查询

2. **数据采样**
   - 当数据点过多时（>1000点），自动采样显示
   - 保持曲线形状的同时减少渲染点数

3. **懒加载**
   - 按设备懒加载数据
   - 视口内设备优先加载

### 用户体验

1. **图表交互增强**
   - 支持缩放和平移
   - 支持区域选择
   - 双击重置视图

2. **设备管理**
   - 保存用户的设备选择偏好
   - 支持设备分组显示
   - 添加设备搜索功能

3. **主题支持**
   - 图表自适应深色/浅色主题
   - 配色方案跟随系统主题

## 相关文件清单

### 后端文件
- `backend/src/controllers/socController.js` - SOC数据控制器（新建）
- `backend/src/routes/soc.js` - SOC路由（新建）
- `backend/src/index.js` - 服务端入口（修改）
- `backend/src/models/SocData.js` - SOC数据模型（已存在）

### 前端文件
- `frontend/src/services/socService.js` - SOC服务（新建）
- `frontend/src/components/SocDetailModal.jsx` - SOC详情组件（新建）
- `frontend/src/components/SocDetailModal.css` - 组件样式（新建）
- `frontend/src/pages/LossAnalysis.jsx` - 损失分析页面（修改）
- `frontend/src/pages/LossAnalysis.css` - 页面样式（修改）

### 文档
- `SOC-DETAIL-FEATURE.md` - 本文档（新建）

## 测试清单

### 功能测试
- [ ] 按日查看模式下显示"查看SOC详情"按钮
- [ ] 点击按钮打开SOC详情模态框
- [ ] 模态框显示电站所有设备
- [ ] 默认选中所有设备并显示曲线
- [ ] 点击设备芯片可切换选择状态
- [ ] 曲线图正确显示SOC数据
- [ ] 鼠标悬停显示具体数值
- [ ] 统计信息正确显示
- [ ] 点击关闭按钮关闭模态框
- [ ] 点击背景关闭模态框

### 错误处理测试
- [ ] 无数据时显示空状态
- [ ] API错误时显示错误信息
- [ ] 点击重试按钮重新加载数据
- [ ] 加载时显示加载状态

### 性能测试
- [ ] 大数据量（1000+点）时渲染流畅
- [ ] 多设备（10+）同时显示时不卡顿
- [ ] 切换设备选择响应快速

### 兼容性测试
- [ ] Chrome浏览器正常
- [ ] Firefox浏览器正常
- [ ] Safari浏览器正常
- [ ] Edge浏览器正常
- [ ] 移动端浏览器正常
- [ ] 深色模式显示正常
- [ ] 浅色模式显示正常

### 响应式测试
- [ ] 桌面端（1920x1080）显示正常
- [ ] 平板端（768px）显示正常
- [ ] 手机端（375px）显示正常

---

**最后更新**: 2026-01-27
**版本**: 1.0.0
**作者**: Claude Sonnet 4.5
