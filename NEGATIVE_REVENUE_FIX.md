# 负数收益处理修复

## 问题描述

在电站分析页面的每日收益柱状图中，当某天的实际收益为负数时（如10.1号），柱状图显示异常：
- 负数收益的柱子高度反而超过了预期收益
- 柱状图无法正确表示负数值

## 问题原因

原有的图表实现使用简单的比例缩放：
```javascript
const actualHeight = (record.actualRevenue / maxRevenue) * 100;
```

这种方式存在以下问题：
1. 当 `actualRevenue` 为负数时，`actualHeight` 也是负数
2. 负数的高度在CSS中会被忽略或表现异常
3. 没有考虑数据范围可能包含负值的情况

## 解决方案（零轴坐标系）

### 1. 计算零轴位置

零轴位置基于数据范围计算，将整个图表分为正值区域和负值区域：

```javascript
// 计算最大值和最小值
const allValues = recordsWithOptimization.flatMap(r => [
  r.expectedRevenue,
  r.actualRevenue,
  r.totalWithOptimization
]);
const maxRevenue = Math.max(...allValues, 0);
const minRevenue = Math.min(...allValues, 0);
const valueRange = maxRevenue - minRevenue;

// 计算零轴位置（从顶部算起的百分比）
const zeroPosition = valueRange > 0
  ? (maxRevenue / valueRange) * 100
  : 50;
```

### 2. 柱状图从零轴延伸

- **正数收益**：从零轴向上延伸
- **负数收益**：从零轴向下延伸

```javascript
// 计算柱子高度（绝对值）
const actualBarHeight = Math.abs(record.actualRevenue / valueRange) * 100;

// 负数收益：从零轴向下
{isNegative ? (
  <div className="daily-bar-stack negative" style={{ height: `${actualBarHeight}%` }}>
    <div className="daily-bar-segment negative" />
  </div>
) : (
  // 正数收益：从零轴向上
  <div className="daily-bar-stack positive" style={{ height: `${actualBarHeight}%` }}>
    <div className="daily-bar-segment actual" />
  </div>
)}
```

### 3. CSS定位实现

使用绝对定位让柱子相对于零轴定位：

```css
/* 容器设置 */
.daily-bars {
  display: block;
  height: 100%;
  position: relative;
}

.daily-bar-group {
  position: absolute;
  height: 100%;
}

/* 正数收益：底部对齐到零轴，向上延伸 */
.daily-bar-stack.positive {
  bottom: calc(100% - var(--zero-position));
  flex-direction: column-reverse;
}

/* 负数收益：顶部对齐到零轴，向下延伸 */
.daily-bar-stack.negative {
  top: var(--zero-position);
  border: 2px solid #dc2626;
}
```

### 4. 添加零轴线

在SVG中绘制零轴线作为参考：

```jsx
<svg>
  {/* 零轴线 */}
  <line
    x1="0"
    y1={(zeroPosition / 100) * chartHeight}
    x2={totalWidth}
    y2={(zeroPosition / 100) * chartHeight}
    stroke="#94a3b8"
    strokeWidth="1"
    strokeDasharray="3,3"
    opacity="0.5"
  />
</svg>
```

### 5. 更新预期收益折线

折线图使用相同的坐标系统：

```javascript
const expectedLinePath = stationData.dailyRecords.map((record, index) => {
  const x = index * barWidth + barWidth / 2;
  // 计算相对于零点的位置
  let yPercent;
  if (valueRange > 0) {
    yPercent = zeroPosition - (record.expectedRevenue / valueRange) * 100;
  } else {
    yPercent = 50;
  }
  const y = (yPercent / 100) * chartHeight;
  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
}).join(' ');
```

### 6. 负数收益视觉标识

为负数收益添加特殊的视觉标识：

```css
/* 负数收益样式 - 红色渐变，并带有警告条纹 */
.daily-bar-segment.negative {
  background: linear-gradient(180deg, #fca5a5, #ef4444);
  position: relative;
  overflow: hidden;
}

.daily-bar-segment.negative::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.2) 4px,
    rgba(255, 255, 255, 0.2) 8px
  );
}

.daily-bar-stack.negative {
  border: 2px solid #dc2626;
}
```

## 修复效果

### 修复前
- ❌ 负数收益显示为超高的柱子
- ❌ 无法区分负数和正数
- ❌ 图表比例失真
- ❌ 没有零轴参考线

### 修复后
- ✅ 显示清晰的零轴线作为参考
- ✅ 正数收益从零轴向上延伸
- ✅ 负数收益从零轴向下延伸
- ✅ 红色渐变 + 斜纹样式清晰标识负数
- ✅ 红色边框额外警示
- ✅ 图表比例准确反映数值关系
- ✅ Tooltip明确提示"负数收益（支付费用）"

## 视觉效果

### 零轴线
- 灰色虚线标识零值位置
- 作为正负收益的分界线

### 正常收益
- 🟢 绿色渐变柱状图
- 从零轴向上延伸
- 高度表示收益金额

### 负数收益
- 🔴 红色渐变 + 白色斜纹警告图案
- 🔴 红色边框
- 从零轴向下延伸
- 高度表示损失金额
- ⚠️ Tooltip带有警告标识

## 技术细节

### 零轴坐标系算法

1. **计算数据范围**：
   ```
   maxRevenue = max(所有收益值, 0)
   minRevenue = min(所有收益值, 0)
   valueRange = maxRevenue - minRevenue
   ```

2. **计算零轴位置**（从顶部算起的百分比）：
   ```
   zeroPosition = (maxRevenue / valueRange) × 100%
   ```

3. **计算柱子高度**（绝对值的百分比）：
   ```
   barHeight = |revenue| / valueRange × 100%
   ```

4. **定位柱子**：
   - 正数：`bottom = 100% - zeroPosition`，向上延伸
   - 负数：`top = zeroPosition`，向下延伸

### 示例计算

假设数据范围：
- 最大收益：200元
- 最小收益：-100元
- 值域范围：300元

**零轴位置**：
```
zeroPosition = (200 / 300) × 100% = 66.67%
```
零轴位置在距离顶部66.67%的位置

**正数收益100元**：
```
barHeight = (100 / 300) × 100% = 33.33%
bottom = 100% - 66.67% = 33.33%
```
从33.33%位置（零轴）向上延伸33.33%

**负数收益-50元**：
```
barHeight = (50 / 300) × 100% = 16.67%
top = 66.67%
```
从66.67%位置（零轴）向下延伸16.67%

### 边界情况处理

1. **所有值都相同**：`valueRange = 0`
   - 零轴位置设为50%

2. **只有正数**：`minRevenue = 0`
   - 零轴位置在底部（100%）
   - 所有柱子向上延伸

3. **只有负数**：`maxRevenue = 0`
   - 零轴位置在顶部（0%）
   - 所有柱子向下延伸

4. **混合正负数**：
   - 零点位于正确的相对位置
   - 负数在零轴下方，正数在零轴上方

## 相关文件

- `frontend/src/pages/StationAnalysis.jsx` (第455-635行)
  - 零轴位置计算
  - 柱状图定位逻辑
  - 负数特殊处理
  - SVG零轴线绘制

- `frontend/src/pages/StationAnalysis.css` (第503-595行)
  - 零轴坐标系布局
  - 绝对定位样式
  - 负数收益样式
  - 警告条纹效果

## 测试建议

1. **正常数据测试**：所有收益为正数，确保零轴在底部，所有柱子向上
2. **负数数据测试**：包含负数收益的日期，确保红色警告显示在零轴下方
3. **混合数据测试**：正负数混合，确保零轴位置正确，比例准确
4. **边界测试**：极大/极小值，确保不溢出
5. **交互测试**：鼠标悬停负数柱状图，确保Tooltip正确显示

## 已知案例

**德业龙山2号电站 - 2024年10月1日**
- 实际收益：负数（支付费用）
- 修复前：柱状图显示异常高
- 修复后：正确显示为红色警告柱，从零轴向下延伸到负值区域

## 更新日志

- **2026-01-15 (最初版本)**: 使用归一化方法修复负数收益显示问题
  - 实现数值归一化算法
  - 添加负数特殊样式

- **2026-01-15 (零轴版本)**: 重构为零轴坐标系
  - 实现真正的正负轴显示
  - 添加零轴参考线
  - 正数向上，负数向下
  - 使用绝对定位实现精确控制
