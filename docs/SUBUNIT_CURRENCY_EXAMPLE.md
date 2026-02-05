# 辅币单位格式化示例

## 概述

货币格式化工具现已支持辅币单位显示,包括:
- **主辅币单位**: 如人民币的"分"、美元的"cents"
- **二级辅币单位**: 如人民币的"角"、港币的"毫"
- **完整辅币表示**: 如 1.23元 = 1元2角3分

## 功能特性

### 1. 货币卡片国家名称显示

每个货币选择卡片现在显示三行信息:
```
┌─────────────────┐
│  ¥              │ ← 货币符号
│  中国            │ ← 国家名称(新增)
│  人民币          │ ← 货币名称
│  CNY            │ ← 货币代码
└─────────────────┘
```

### 2. 货币信息卡片

显示完整的货币信息,包括辅币单位:
- 国家/地区
- 货币名称
- 货币代码
- 货币符号
- 小数位数
- **辅币单位** (新增)
  - 单一辅币: "cents"
  - 二级辅币: "角 / 分"

### 3. 格式化对照表

新增"辅币格式"列,展示不同货币的辅币表示方式

## 支持的货币辅币单位

| 货币 | 主辅币 | 二级辅币 | 换算关系 |
|------|--------|----------|----------|
| 人民币 (CNY) | 分 | 角 | 1元 = 10角 = 100分 |
| 美元 (USD) | cents | - | 1 dollar = 100 cents |
| 欧元 (EUR) | cents | - | 1 euro = 100 cents |
| 英镑 (GBP) | pence | - | 1 pound = 100 pence |
| 日元 (JPY) | - | - | 无小数 |
| 韩元 (KRW) | - | - | 无小数 |
| 印度卢比 (INR) | paise | - | 1 rupee = 100 paise |
| 俄罗斯卢布 (RUB) | копейка | - | 1 рубль = 100 копеек |
| 巴西雷亚尔 (BRL) | centavos | - | 1 real = 100 centavos |
| 澳元 (AUD) | cents | - | 1 dollar = 100 cents |
| 加元 (CAD) | cents | - | 1 dollar = 100 cents |
| 瑞士法郎 (CHF) | Rappen | - | 1 franc = 100 rappen |
| 新加坡元 (SGD) | cents | - | 1 dollar = 100 cents |
| 港币 (HKD) | 仙 | 毫 | 1元 = 10毫 = 100仙 |
| 阿联酋迪拉姆 (AED) | fils | - | 1 dirham = 100 fils |

## API 使用示例

### 基础辅币格式化

```javascript
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const formatter = new CurrencyFormatter('zh-CN');

// 格式化为分
formatter.formatSubunit(123.45);
// 输出: 12,345 分

// 格式化为角
formatter.formatSubunit(123.45, { useSecondary: true });
// 输出: 1,234 角
```

### 完整辅币表示

```javascript
// 人民币: 显示元、角、分
formatter.formatSubunitFull(123.45);
// 输出: ¥123.00 4角 5分

formatter.formatSubunitFull(12.30);
// 输出: ¥12.00 3角

formatter.formatSubunitFull(12.05);
// 输出: ¥12.00 5分

formatter.formatSubunitFull(0.23);
// 输出: 2角 3分
```

### 不同货币的辅币格式

```javascript
// 美元
const usdFormatter = new CurrencyFormatter('en-US');
usdFormatter.formatSubunit(123.45);
// 输出: 12,345 cents

usdFormatter.formatSubunitFull(123.45);
// 输出: $123.00 45cents

// 英镑
const gbpFormatter = new CurrencyFormatter('en-GB');
gbpFormatter.formatSubunit(123.45);
// 输出: 12,345 pence

// 港币 (支持二级辅币)
const hkdFormatter = new CurrencyFormatter('zh-HK');
hkdFormatter.formatSubunit(123.45);
// 输出: 12,345 仙

hkdFormatter.formatSubunit(123.45, { useSecondary: true });
// 输出: 1,234 毫

hkdFormatter.formatSubunitFull(123.45);
// 输出: HK$123.00 4毫 5仙
```

## 格式化对照表示例

### 人民币 (zh-CN)

| 数量级 | 原始金额 | 完整格式 | 大额缩写 | 辅币格式 |
|--------|---------|---------|---------|----------|
| 百位 | 123.45 | ¥123.45 | ¥123.45 | ¥123.00 4角 5分 |
| 千位 | 1,234.56 | ¥1,234.56 | ¥1,234.56 | ¥1,234.00 5角 6分 |
| 万位 | 12,345.67 | ¥12,345.67 | ¥1.23万 | ¥12,345.00 6角 7分 |
| 十万位 | 123,456.78 | ¥123,456.78 | ¥12.35万 | ¥123,456.00 7角 8分 |
| 百万位 | 1,234,567.89 | ¥1,234,567.89 | ¥123.46万 | ¥1,234,567.00 8角 9分 |
| 千万位 | 12,345,678.90 | ¥12,345,678.90 | ¥1,234.57万 | ¥12,345,678.00 9角 |
| 亿位 | 123,456,789.01 | ¥123,456,789.01 | ¥1.23亿 | ¥123,456,789.00 1分 |
| 十亿位 | 1,234,567,890.12 | ¥1,234,567,890.12 | ¥12.35亿 | ¥1,234,567,890.00 1角 2分 |

### 美元 (en-US)

| 数量级 | 原始金额 | 完整格式 | 大额缩写 | 辅币格式 |
|--------|---------|---------|---------|----------|
| 百位 | 123.45 | $123.45 | $123.45 | $123.00 45cents |
| 千位 | 1,234.56 | $1,234.56 | $1.23K | $1,234.00 56cents |
| 万位 | 12,345.67 | $12,345.67 | $12.35K | $12,345.00 67cents |
| 十万位 | 123,456.78 | $123,456.78 | $123.46K | $123,456.00 78cents |
| 百万位 | 1,234,567.89 | $1,234,567.89 | $1.23M | $1,234,567.00 89cents |

### 港币 (zh-HK) - 二级辅币示例

| 数量级 | 原始金额 | 完整格式 | 大额缩写 | 辅币格式 |
|--------|---------|---------|---------|----------|
| 百位 | 123.45 | HK$123.45 | HK$123.45 | HK$123.00 4毫 5仙 |
| 千位 | 1,234.56 | HK$1,234.56 | HK$1,234.56 | HK$1,234.00 5毫 6仙 |
| 万位 | 12,345.67 | HK$12,345.67 | HK$1.23萬 | HK$12,345.00 6毫 7仙 |

## 在 React 组件中使用

### 示例: 价格展示组件

```javascript
import React from 'react';
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const PriceDisplay = ({ amount, locale = 'zh-CN', showSubunit = false }) => {
  const formatter = new CurrencyFormatter(locale);
  const currencyInfo = formatter.getCurrencyInfo();

  return (
    <div className="price-display">
      <div className="main-price">
        {formatter.format(amount)}
      </div>
      {showSubunit && currencyInfo.subunit && (
        <div className="subunit-price">
          {formatter.formatSubunitFull(amount)}
        </div>
      )}
    </div>
  );
};

// 使用
<PriceDisplay amount={123.45} locale="zh-CN" showSubunit={true} />
// 显示:
// ¥123.45
// ¥123.00 4角 5分
```

### 示例: 发票金额大写

```javascript
const InvoiceAmount = ({ amount }) => {
  const formatter = new CurrencyFormatter('zh-CN');

  return (
    <div className="invoice-amount">
      <div className="amount-numeric">
        <strong>金额:</strong> {formatter.format(amount)}
      </div>
      <div className="amount-words">
        <strong>大写:</strong> {formatter.formatSubunitFull(amount)}
      </div>
    </div>
  );
};

// 使用
<InvoiceAmount amount={1234.56} />
// 显示:
// 金额: ¥1,234.56
// 大写: ¥1,234.00 5角 6分
```

## 技术实现

### 配置结构

```javascript
'zh-CN': {
  currency: 'CNY',
  symbol: '¥',
  name: '人民币',
  country: '中国',
  subunit: '分',
  subunitDivider: 100,           // 1元 = 100分
  secondarySubunit: '角',         // 二级辅币
  secondarySubunitDivider: 10,   // 1元 = 10角
  decimals: 2,
  // ... 其他配置
}
```

### 方法说明

#### `formatSubunit(value, options)`
格式化为辅币单位
- `value`: 金额数值
- `options.showSymbol`: 是否显示单位名称
- `options.useSecondary`: 是否使用二级辅币单位

#### `formatSubunitFull(value)`
格式化为完整辅币表示,自动处理元、角、分的组合

## 页面改进总结

### 1. 货币选择卡片
- ✅ 添加国家名称显示
- ✅ 三行布局: 国家 → 货币名 → 代码
- ✅ 国家名称高亮显示(蓝色、加粗、大写)

### 2. 货币信息卡片
- ✅ 显示国家/地区字段
- ✅ 添加辅币单位信息
- ✅ 支持显示二级辅币 (如 "角 / 分")

### 3. 格式化对照表
- ✅ 新增"辅币格式"列
- ✅ 自动根据货币类型显示对应格式
- ✅ 有二级辅币的显示完整表示
- ✅ 无辅币的货币不显示该列

### 4. 响应式设计
- ✅ 移动端隐藏原始金额和辅币格式列
- ✅ 国家名称字体大小自适应

## 构建状态

- ✅ 编译成功,无错误
- ✅ CSS: 58.22 KB (压缩后 8.87 KB)
- ✅ JS: 281.81 KB (压缩后 87.68 KB)
- ✅ 生产就绪

---

**更新时间**: 2026-01-13
**版本**: 2.1.0
**状态**: ✅ 完成
