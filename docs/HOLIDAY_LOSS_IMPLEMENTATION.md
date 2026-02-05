# 节假日损失统计功能实现方案

## 功能需求

将中国法定节假日及周六日的损失收益单独统计，排除调休上班日。在损失分析页面的饼图中新增"节假日损失"分类。

## 已完成

1. ✅ 创建节假日配置模型 `Holiday.js`
2. ✅ 初始化2025-2026年节假日数据
3. ✅ 规划实现任务

## 待实现

### 1. 修改损失计算服务

文件：`backend/src/services/alarmLossService.js`

在 `calculateStationLosses` 函数中：
- 导入 Holiday 模型
- 获取时间范围内所有日期
- 批量查询节假日标记
- 为每个告警添加 `isHoliday` 字段
- 分别统计节���日损失和工作日损失

### 2. 修改告警控制器

文件：`backend/src/controllers/alarmController.js`

在 `getLossByDevice` 方法中：
- 新增节假日损失统计维度
- 返回数据结构示例：
```json
{
  "byDevice": [...],
  "byHoliday": {
    "holidayLoss": 2827.24,
    "workdayLoss": 15234.56,
    "holidayPercent": 15.6,
    "workdayPercent": 84.4
  }
}
```

### 3. 创建节假日损失饼图组件

文件：`frontend/src/components/HolidayLossPieChart.jsx`

基于 `AlarmPieChart.jsx` 修改，显示：
- 节假日损失（红色）
- 工作日损失（蓝色）

### 4. 集成到损失分析页面

文件：`frontend/src/pages/LossAnalysis.jsx`

在设备分布饼图旁边添加节假日损失饼图。

## 数据示例

电站245，2026年1月1-3日（元旦）：
- 1月1日损失：¥1791.40 → 节假日损失
- 1月2日损失：¥507.54 → 节假日损失
- 1月3日损失：¥528.30 → 节假日损失
- 1月4日损失：¥XXX → 工作日损失（调休上班）

## 实现优先级

由于代码改动较大，建议分步实现：
1. 先实现后端API修改
2. 创建新的饼图组件
3. 最后集成到页面
