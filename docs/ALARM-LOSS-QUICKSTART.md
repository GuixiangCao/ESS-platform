# 告警损失计算功能 - 快速开始

## 功能概述

自动计算设备告警导致的经济损失：**损失 = 告警时长 × 功率 × 电价**

## 测试结果

### 电站 173（2025年10-12月）

| 指标 | 数值 |
|------|------|
| 告警总数 | 78 次 |
| 总损失 | ¥85,253.61 |
| 平均损失 | ¥1,093/次 |
| 总时长 | 600.93 小时 |

### 按设备类型分布

| 设备类型 | 告警次数 | 总损失(¥) | 平均损失(¥) | 占比 |
|---------|---------|----------|------------|------|
| LC设备 | 56 | 73,722.79 | 1,316.48 | 86.5% |
| EMS系统 | 8 | 6,767.12 | 845.89 | 7.9% |
| 高压电表 | 2 | 4,763.70 | 2,381.85 | 5.6% |

## API 端点

### 1. 计算电站总损失
```http
GET /api/alarms/station/:stationId/losses?startDate=2025-10-01&endDate=2025-12-31
```

### 2. 按设备统计
```http
GET /api/alarms/station/:stationId/losses/by-device?startDate=2025-10-01&endDate=2025-12-31
```

### 3. 单个告警损失
```http
GET /api/alarms/:alarmId/loss
```

## 测试命令

```bash
cd backend
node src/scripts/testAlarmLoss.js
```

## 使用示例

```bash
# 使用 curl 测试 API
curl "http://localhost:5001/api/alarms/station/173/losses?startDate=2025-10-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 核心文件

- `backend/src/services/alarmLossCalculator.js` - 损失计算逻辑
- `backend/src/controllers/alarmController.js` - API 控制器
- `backend/src/routes/alarms.js` - API 路由
- `backend/src/scripts/testAlarmLoss.js` - 测试脚本

## 详细文档

完整文档请查看：[ALARM-LOSS-CALCULATION.md](ALARM-LOSS-CALCULATION.md)
