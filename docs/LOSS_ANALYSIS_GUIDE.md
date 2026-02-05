# 电站收益损失分析功能

## 功能概述

电站收益损失分析功能用于记录和分析每个电站每天收益损失的原因，帮助运营团队了解损失的来源并采取相应的改进措施。

## 损失类型分类

损失原因分为三大类：

### 1. 计划性停运 (planned_shutdown)
- **颜色标识**: 蓝色
- **图标**: 📅 日历
- **说明**: 预先计划的维护、检修、升级等活动导致的停机
- **典型原因**:
  - 定期保养
  - 系统升级
  - 设备检修
  - 预防性维护

### 2. 设备故障 (equipment_failure)
- **颜色标识**: 红色
- **图标**: ⚡ 闪电
- **说明**: 设备突发故障导致的非计划停机
- **典型原因**:
  - 逆变器故障
  - 电池系统异常
  - 控制器失效
  - 线路故障
  - 传感器损坏

### 3. 外界因素 (external_factors)
- **颜色标识**: 橙色
- **图标**: ☁️ 云朵
- **说明**: 外部环境或不可控因素导致的损失
- **典型原因**:
  - 极端天气
  - 电网波动
  - 供电中断
  - 自然灾害影响
  - 温度异常

## 数据模型

### RevenueLoss 模型字段

```javascript
{
  stationId: Number,        // 电站ID
  date: Date,              // 发生日期
  lossType: String,        // 损失类型 (planned_shutdown/equipment_failure/external_factors)
  lossAmount: Number,      // 损失金额（元）
  description: String,     // 简短描述
  reason: String,         // 详细原因
  duration: Number        // 持续时间（小时）
}
```

## API 接口

### 1. 获取电站损失统计
```
GET /api/revenue/station/:stationId/loss-stats
```

**查询参数**:
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期

**返回数据**:
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "lossType": "planned_shutdown",
        "lossTypeName": "计划性停运",
        "totalLoss": 47836.30,
        "count": 9,
        "avgLoss": 5315.14,
        "totalDuration": 45.5
      }
    ],
    "totalLoss": 139544.47,
    "summary": {
      "totalIncidents": 28,
      "totalDuration": 123.8
    }
  }
}
```

### 2. 获取每日损失详情
```
GET /api/revenue/station/:stationId/daily-losses
```

### 3. 获取收益与损失对比
```
GET /api/revenue/station/:stationId/loss-comparison
```

### 4. 添加损失记录
```
POST /api/revenue/station/:stationId/loss
```

**请求体**:
```json
{
  "date": "2026-01-15",
  "lossType": "equipment_failure",
  "lossAmount": 5000,
  "description": "逆变器故障",
  "reason": "逆变器过热导致自动保护",
  "duration": 4.5
}
```

### 5. 更新损失记录
```
PUT /api/revenue/loss/:lossId
```

### 6. 删除损失记录
```
DELETE /api/revenue/loss/:lossId
```

## 前端界面

### 访问路径
在电站分析页面 (`/revenue/station-analysis`) 中，点击顶部的 "损失分析" 标签即可查看。

### 功能模块

#### 1. 损失统计概览卡片
- 总损失金额
- 各类型损失分类展示
- 事件次数和平均损失
- 总持续时间

#### 2. 损失类型占比饼图
- 可视化展示各类型损失的占比
- 鼠标悬停显示详细信息

#### 3. 每日收益损失详情表格
- 日期
- 预期收益 vs 实际收益
- 收益损失金额
- 达成率
- 损失原因分类

## 使用示例

### 1. 添加示例数据

运行以下命令添加示例损失数据：

```bash
cd backend
node add-sample-losses.js
```

这将为电站1、2、3添加过去30天的随机损失记录。

### 2. 手动添加损失记录

使用 API 接口添加损失记录：

```bash
curl -X POST http://localhost:5001/api/revenue/station/1/loss \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-15",
    "lossType": "equipment_failure",
    "lossAmount": 5000,
    "description": "逆变器故障",
    "reason": "逆变器过热导致自动保护",
    "duration": 4.5
  }'
```

### 3. 查看损失分析

1. 登录系统
2. 进入"电站分析"页面
3. 选择要查看的电站
4. 点击"损失分析"标签
5. 查看统计数据、饼图和详情表格

## 数据分析建议

### 损失趋势分析
- 观察不同类型损失的占比变化
- 识别高频发生的损失类型
- 计算平均损失金额和持续时间

### 改进措施
- **计划性停运**: 优化维护计划，减少停机时间
- **设备故障**: 加强设备监控，提前预警，及时维修
- **外界因素**: 提升系统抗干扰能力，增加备用方案

### KPI指标
- 总损失金额 / 总预期收益 = 损失率
- 故障次数 / 运行天数 = 故障频率
- 平均修复时间 (MTTR)
- 平均故障间隔时间 (MTBF)

## 技术实现细节

### 后端
- **模型**: `RevenueLoss` (MongoDB)
- **路由**: `/api/revenue/*` (Express Router)
- **聚合查询**: MongoDB Aggregation Pipeline

### 前端
- **组件**: `LossAnalysis.jsx`
- **样式**: `LossAnalysis.css`
- **集成**: 在 `StationAnalysis.jsx` 中作为标签页显示

## 注意事项

1. **权限控制**: 所有 API 都需要通过身份验证
2. **数据一致性**: 损失记录的日期应与收益记录的日期对应
3. **金额计算**: 损失金额应基于实际收益与预期收益的差值
4. **数据备份**: 定期备份损失分析数据

## 未来扩展

- [ ] 损失记录的批量导入功能
- [ ] 损失原因的自动识别和推荐
- [ ] 损失趋势预测
- [ ] 损失报告自动生成
- [ ] 多维度数据对比分析
- [ ] 移动端损失记录输入
- [ ] 实时告警和通知

## 相关文件

### 后端
- `backend/src/models/RevenueLoss.js` - 数据模型
- `backend/src/routes/revenueLoss.js` - API路由
- `backend/add-sample-losses.js` - 示例数据生成脚本

### 前端
- `frontend/src/pages/LossAnalysis.jsx` - 损失分析组件
- `frontend/src/pages/LossAnalysis.css` - 样式文件
- `frontend/src/pages/StationAnalysis.jsx` - 主页面集成

## 支持与反馈

如有问题或建议，请联系开发团队。
