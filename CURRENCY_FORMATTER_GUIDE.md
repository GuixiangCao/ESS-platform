# 全球货币格式化工具 - 使用文档

## 概述

`CurrencyFormatter` 是一个支持全球主要国家和地区的货币格式化工具，提供标准格式、大额缩写、辅币单位等多种显示方式。

## 支持的国家和地区

| 国家/地区 | 货币代码 | 符号 | 区域代码 |
|----------|---------|------|---------|
| 中国 | CNY | ¥ | zh-CN |
| 美国 | USD | $ | en-US |
| 欧元区 | EUR | € | de-DE |
| 英国 | GBP | £ | en-GB |
| 日本 | JPY | ¥ | ja-JP |
| 韩国 | KRW | ₩ | ko-KR |
| 印度 | INR | ₹ | en-IN |
| 俄罗斯 | RUB | ₽ | ru-RU |
| 巴西 | BRL | R$ | pt-BR |
| 澳大利亚 | AUD | A$ | en-AU |
| 加拿大 | CAD | C$ | en-CA |
| 瑞士 | CHF | CHF | de-CH |
| 新加坡 | SGD | S$ | en-SG |
| 中国香港 | HKD | HK$ | zh-HK |
| 阿联酋 | AED | د.إ | ar-AE |

## 基本使用

### 1. 导入

```javascript
import { currencyFormatter, CurrencyFormatter } from '@/utils/currencyFormatter';
```

### 2. 完整格式显示

```javascript
// 使用默认实例（中国 - 人民币）
currencyFormatter.format(1234567.89);
// 输出: ¥1,234,567.89

// 创建特定区域实例
const usdFormatter = new CurrencyFormatter('en-US');
usdFormatter.format(1234567.89);
// 输出: $1,234,567.89

// 欧元（注意符号位置和分隔符）
const eurFormatter = new CurrencyFormatter('de-DE');
eurFormatter.format(1234567.89);
// 输出: 1.234.567,89 €
```

### 3. 大额缩写显示

```javascript
// 中国 - 使用"万"和"亿"
currencyFormatter.formatAbbreviated(50000);
// 输出: ¥5.00万

currencyFormatter.formatAbbreviated(150000000);
// 输出: ¥1.50亿

// 美国 - 使用 K, M, B, T
const usdFormatter = new CurrencyFormatter('en-US');
usdFormatter.formatAbbreviated(1500);
// 输出: $1.50K

usdFormatter.formatAbbreviated(2500000);
// 输出: $2.50M

usdFormatter.formatAbbreviated(3500000000);
// 输出: $3.50B

// 日本 - 使用"万"、"億"、"兆"
const jpyFormatter = new CurrencyFormatter('ja-JP');
jpyFormatter.formatAbbreviated(50000000);
// 输出: ¥5,000万

jpyFormatter.formatAbbreviated(500000000);
// 输出: ¥5.00億
```

### 4. 智能格式化

根据金额大小自动选择显示方式：

```javascript
// 小额使用完整格式
currencyFormatter.formatSmart(5678);
// 输出: ¥5,678.00

// 大额自动缩写
currencyFormatter.formatSmart(56780000);
// 输出: ¥5,678.00万

// 自定义阈值
currencyFormatter.formatSmart(50000, { threshold: 100000 });
// 输出: ¥50,000.00（未达到阈值，显示完整格式）
```

### 5. 辅币单位显示

```javascript
// 人民币 - 分
currencyFormatter.formatSubunit(123.45);
// 输出: 12,345 分

// 美元 - cents
const usdFormatter = new CurrencyFormatter('en-US');
usdFormatter.formatSubunit(123.45);
// 输出: 12,345 cents

// 英镑 - pence
const gbpFormatter = new CurrencyFormatter('en-GB');
gbpFormatter.formatSubunit(123.45);
// 输出: 12,345 pence
```

## 高级选项

### 格式化选项

```javascript
// 不显示货币符号
currencyFormatter.format(1234.56, { showSymbol: false });
// 输出: 1,234.56

// 自定义小数位数
currencyFormatter.format(1234.56789, { decimals: 4 });
// 输出: ¥1,234.5679

// 大额缩写不强制小数位
currencyFormatter.formatAbbreviated(1500000, { forceDecimals: false });
// 输出: ¥150万
```

### 动态切换区域

```javascript
const formatter = new CurrencyFormatter('zh-CN');

formatter.format(1234.56);
// 输出: ¥1,234.56

formatter.setLocale('en-US');
formatter.format(1234.56);
// 输出: $1,234.56

formatter.setLocale('de-DE');
formatter.format(1234.56);
// 输出: 1.234,56 €
```

## 在 React 组件中使用

### 示例 1: 收益统计卡片

```javascript
import React from 'react';
import { currencyFormatter } from '@/utils/currencyFormatter';

const RevenueCard = ({ revenue }) => {
  return (
    <div className="stat-card">
      <div className="stat-label">总收益</div>
      <div className="stat-value">
        {currencyFormatter.formatAbbreviated(revenue)}
      </div>
      <div className="stat-detail">
        完整金额: {currencyFormatter.format(revenue)}
      </div>
    </div>
  );
};

// 使用
<RevenueCard revenue={125680000} />
// 显示: ¥1.26亿
//      完整金额: ¥125,680,000.00
```

### 示例 2: 多语言表格

```javascript
import React, { useState } from 'react';
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const RevenueTable = ({ data }) => {
  const [locale, setLocale] = useState('zh-CN');
  const formatter = new CurrencyFormatter(locale);

  return (
    <div>
      <select onChange={(e) => setLocale(e.target.value)}>
        <option value="zh-CN">人民币 (¥)</option>
        <option value="en-US">美元 ($)</option>
        <option value="de-DE">欧元 (€)</option>
        <option value="en-GB">英镑 (£)</option>
      </select>

      <table>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{formatter.formatSmart(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 示例 3: 自定义 Hook

```javascript
import { useState, useMemo } from 'react';
import { CurrencyFormatter } from '@/utils/currencyFormatter';

export const useCurrencyFormatter = (initialLocale = 'zh-CN') => {
  const [locale, setLocale] = useState(initialLocale);

  const formatter = useMemo(() => {
    return new CurrencyFormatter(locale);
  }, [locale]);

  return {
    formatter,
    locale,
    setLocale,
    format: (value, options) => formatter.format(value, options),
    formatAbbreviated: (value, options) => formatter.formatAbbreviated(value, options),
    formatSmart: (value, options) => formatter.formatSmart(value, options),
    getCurrencyInfo: () => formatter.getCurrencyInfo()
  };
};

// 在组件中使用
const MyComponent = () => {
  const { format, formatAbbreviated, setLocale } = useCurrencyFormatter();

  return (
    <div>
      <p>完整: {format(1234567.89)}</p>
      <p>缩写: {formatAbbreviated(1234567.89)}</p>
      <button onClick={() => setLocale('en-US')}>切换到美元</button>
    </div>
  );
};
```

## 各国缩写规则详解

### 中国（zh-CN）
- **万**: 10,000 (1e4)
- **亿**: 100,000,000 (1e8)
- 示例: 156,780,000 → ¥1.57亿

### 美国/英国/加拿大/澳大利亚（en-US/en-GB/en-CA/en-AU）
- **K**: 1,000 (Thousand)
- **M**: 1,000,000 (Million)
- **B**: 1,000,000,000 (Billion)
- **T**: 1,000,000,000,000 (Trillion)
- 示例: 2,500,000 → $2.50M

### 德国/欧元区（de-DE）
- **Tsd.**: 1,000 (Tausend)
- **Mio.**: 1,000,000 (Million)
- **Mrd.**: 1,000,000,000 (Milliarde)
- **Bio.**: 1,000,000,000,000 (Billion)
- 示例: 3,500,000 → 3,50 Mio. €

### 日���（ja-JP）
- **万**: 10,000
- **億**: 100,000,000
- **兆**: 1,000,000,000,000
- 示例: 50,000,000 → ¥5,000万

### 印度（en-IN）
- **K**: 1,000
- **L**: 100,000 (Lakh)
- **Cr**: 10,000,000 (Crore)
- 示例: 5,000,000 → ₹50.00L

## 精度和可读性设计

### 小数点保留规则
- 所有大额缩写默认保留 **2 位小数**
- 保证精度：¥1.57亿 而不是 ¥2亿
- 保持一致性：所有级别使用相同的小数位数

### 千位分隔符
根据各国习惯自动处理：
- 中国/美国: `,` (逗号)
- 德国/欧元区: `.` (点号)
- 瑞士: `'` (撇号)
- 俄罗斯: ` ` (空格)

### 小数分隔符
- 中国/美国/英国: `.` (点号)
- 德国/欧元区/巴西: `,` (逗号)

## API 参考

### CurrencyFormatter 类

#### 构造函数
```javascript
new CurrencyFormatter(locale = 'zh-CN')
```

#### 方法

##### format(value, options)
完整格式显示
- `value`: 金额数值
- `options.showSymbol`: 是否显示货币符号（默认 true）
- `options.decimals`: 小数位数（默认使用配置值）

##### formatAbbreviated(value, options)
大额缩写显示
- `value`: 金额数值
- `options.showSymbol`: 是否显示货币符号（默认 true）
- `options.forceDecimals`: 是否强制显示小数位（默认 true）

##### formatSmart(value, options)
智能格式化
- `value`: 金额数值
- `options.threshold`: 缩写阈值（默认 10000）
- `options.showSymbol`: 是否显示货币符号

##### formatSubunit(value, options)
辅币单位格式化
- `value`: 金额数值
- `options.showSymbol`: 是否显示单位名称

##### setLocale(locale)
切换区域设置
- `locale`: 区域代码

##### getCurrencyInfo()
获取当前货币信息

#### 静态方法

##### CurrencyFormatter.getSupportedLocales()
获取所有支持的区域列表

```javascript
const locales = CurrencyFormatter.getSupportedLocales();
// [
//   { locale: 'zh-CN', currency: 'CNY', symbol: '¥', name: '人民币' },
//   { locale: 'en-US', currency: 'USD', symbol: '$', name: 'US Dollar' },
//   ...
// ]
```

## 测试示例

```javascript
import { currencyFormatter, CurrencyFormatter } from '@/utils/currencyFormatter';

// 测试各种金额
const testValues = [
  123.45,           // 小额
  1234.56,          // 千级
  12345.67,         // 万级
  123456.78,        // 十万级
  1234567.89,       // 百万级
  12345678.90,      // 千万级
  123456789.01,     // 亿级
  1234567890.12,    // 十亿级
];

testValues.forEach(value => {
  console.log('完整:', currencyFormatter.format(value));
  console.log('缩写:', currencyFormatter.formatAbbreviated(value));
  console.log('智能:', currencyFormatter.formatSmart(value));
  console.log('---');
});
```

## 扩展新的区域

如需添加新的国家/地区支持，在 `CURRENCY_CONFIGS` 中添加配置：

```javascript
'fr-FR': {
  currency: 'EUR',
  symbol: '€',
  name: 'Euro',
  subunit: 'centimes',
  decimals: 2,
  thousandsSeparator: ' ',
  decimalSeparator: ',',
  symbolPosition: 'after',
  abbreviations: [
    { value: 1e12, suffix: ' Md€', decimals: 2 },
    { value: 1e9, suffix: ' Md€', decimals: 2 },
    { value: 1e6, suffix: ' M€', decimals: 2 },
    { value: 1e3, suffix: ' k€', decimals: 2 },
  ]
}
```

---

**版本**: 1.0.0
**更新时间**: 2026-01-13
**作者**: Claude Code
