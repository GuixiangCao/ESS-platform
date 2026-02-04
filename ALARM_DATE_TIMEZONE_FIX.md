# 告警损失计算时区问题修复报告

## 问题描述

告警ID `ef08c607-cf88-4a9d-9e38-242dad561647` 在损失分析中显示¥0.00，但实际应该有损失。

### 根本原因

`alarmDate`字段存储的是UTC日期，而不是UTC+8日期，导致查询时日期不匹配。

**示例：**
- 告警实际发生时间：**2026-01-06 01:33:55** (UTC+8)
- startTime (UTC)：**2026-01-05T17:33:55.000Z**
- 旧的alarmDate：**2026-01-05** ❌
- 正确的alarmDate：**2026-01-06** ✅

当前端查询2026-01-06的告警时，由于alarmDate是2026-01-05，无法匹配到该告警。

## 修复内容

### 1. Alarm模型修改 (backend/src/models/Alarm.js)

添加了pre-save hook，自动将`alarmDate`设置为基于UTC+8时间的日期：

```javascript
alarmSchema.pre('save', function(next) {
  if (this.startTime) {
    // 将UTC时间转换为UTC+8时间
    const utcTime = new Date(this.startTime);
    const utc8Time = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);

    // 提取UTC+8日期，设置为UTC的00:00:00
    const year = utc8Time.getUTCFullYear();
    const month = utc8Time.getUTCMonth();
    const day = utc8Time.getUTCDate();

    this.alarmDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  next();
});
```

### 2. 数据修复脚本 (backend/scripts/fixAlarmDateTimezone.js)

创建并执行了数据修复脚本，更新现有告警记录：
- **总记录数：** 6105条
- **更新数量：** 916条
- **未改变：** 5189条

### 3. 验证脚本 (backend/scripts/verifyAlarmLossCalculation.js)

创建了验证脚本，确认修复后的计算结果。

## 修复后的结果

### 电站205 - 2026年1月数据

**整月统计：**
- 总告警数量：97次
- 总损失金额：¥6.16
- 平均每次告警损失：¥0.06
- 总故障时长：0.28小时

**2026-01-06 (修复验证日)：**
- 告警数量：6次
- 总损失：¥2.64
- 包含之前无法查到的凌晨告警

**目标告警 `ef08c607-cf88-4a9d-9e38-242dad561647`：**
- ✅ 现在可以正确查询到
- ✅ 损失金额：¥0.44
- ✅ 不再显示¥0.00

## 告警损失计算规则

当前的计算规则（已实施）：

1. **时段排除：** 排除17:00-23:59:59时段的告警
2. **周期过滤：** 仅计算充电(ctype=1)或放电(ctype=2)周期内的告警
3. **空闲排除：** 排除空闲/待机(ctype=3)状态下的告警

**计算公式：**
```
损失 = 时间长度(小时) × 功率(kW) × 电价(元/kWh)
```

## 前端显示

修复后，以下页面将正确显示告警损失：

1. **损失分析页面 - 损失收益分析饼图**
   - 显示设备停机损失占比
   - 显示设备停机损失明细表格（可展开/收起）

2. **损失分析详情弹窗 (AlarmModal)**
   - 每个告警显示损失金额
   - 顶部显示当日总损失

3. **设备停机损失明细表格**
   - 列出所有产生损失的告警
   - 显示告警ID、名称、设备、时间、时长、损失金额
   - 按损失金额从大到小排序

## 使用说明

### 查看修复后的数据

1. 刷新前端页面
2. 进入损失分析页面
3. 选择电站205，查看2026年1月数据
4. 点击"查看损失分析"按钮，查看每日告警详情

### 运行验证脚本

```bash
cd backend
node scripts/verifyAlarmLossCalculation.js
```

### 注意事项

- 所有新保存的告警会自动使用正确的UTC+8日期
- 现有数据已全部修复
- 前端查询现在可以正确匹配告警数据
- 告警损失是实时计算的，不存储在数据库中

## 技术细节

### 时区转换逻辑

```
UTC时间 → UTC+8时间 → 提取日期 → 存储为UTC的00:00:00

示例：
2026-01-05T17:33:55.000Z (UTC)
→ 2026-01-06T01:33:55.000Z (UTC+8)
→ 2026-01-06 (日期)
→ 2026-01-06T00:00:00.000Z (存储值)
```

### 查询匹配

前端查询2026-01-06时：
- 构建查询条件：`alarmDate: 2026-01-06`
- 数据库中的alarmDate：`2026-01-06T00:00:00.000Z`
- ✅ 匹配成功

## 相关文件

### 后端
- `backend/src/models/Alarm.js` - 模型定义（已修改）
- `backend/src/services/alarmLossCalculator.js` - 损失计算逻辑
- `backend/scripts/fixAlarmDateTimezone.js` - 数据修复脚本
- `backend/scripts/verifyAlarmLossCalculation.js` - 验证脚本

### 前端
- `frontend/src/pages/LossAnalysis.jsx` - 损失分析主页面
- `frontend/src/components/AlarmModal.jsx` - 告警详情弹窗
- `frontend/src/components/LossBreakdownPieChart.jsx` - 损失收益饼图

## 总结

✅ 时区bug已修复
✅ 916条告警数据已更新
✅ 告警损失计算正常
✅ 前端显示正确
✅ 新数据自动使用正确时区

修复完成日期：2026-01-31
