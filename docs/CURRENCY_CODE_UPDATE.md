# 货币代码显示更新

## 概述

将完整格式和大额缩写中的货币符号替换为货币代码,以提供更清晰、更标准的显示方式。

## 修改内容

### 1. 货币格式化工具更新

#### 文件: `frontend/src/utils/currencyFormatter.js`

添加 `useCode` 参数支持:

**format() 方法**
```javascript
format(value, options = {}) {
  const {
    showSymbol = true,
    decimals = this.config.decimals,
    showSubunit = false,
    useCode = false  // 新增参数
  } = options;

  const formattedNumber = this.formatNumber(value, decimals);

  if (!showSymbol) {
    return formattedNumber;
  }

  // 使用货币代码或符号
  const displaySymbol = useCode ? this.config.currency : this.config.symbol;

  // 根据符号位置返回格式化结果
  if (this.config.symbolPosition === 'before') {
    return useCode ? `${displaySymbol} ${formattedNumber}` : `${displaySymbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${displaySymbol}`;
  }
}
```

**formatAbbreviated() 方法**
```javascript
formatAbbreviated(value, options = {}) {
  const {
    showSymbol = true,
    forceDecimals = true,
    useCode = false  // 新增参数
  } = options;

  // ... 计算逻辑 ...

  // 使用货币代码或符号
  const displaySymbol = useCode ? this.config.currency : this.config.symbol;

  // 根据符号位置返回格式化结果
  if (this.config.symbolPosition === 'before') {
    return useCode ? `${displaySymbol} ${result}` : `${displaySymbol}${result}`;
  } else {
    return `${result} ${displaySymbol}`;
  }
}
```

### 2. 界面组件更新

#### 文件: `frontend/src/pages/RevenueView.jsx`

在格式化对照表中启用货币代码显示:

```javascript
const fullFormat = formatter.format(amount.value, { useCode: true });
const abbrevFormat = formatter.formatAbbreviated(amount.value, { useCode: true });
```

## 显示效果对比

### 人民币 (CNY)

#### 修改前
| 完整格式 | 大额缩写 |
|---------|---------|
| ¥123.45 | ¥123.45 |
| ¥1,234.56 | ¥1,234.56 |
| ¥12,345.67 | ¥1.23万 |
| ¥1,234,567.89 | ¥123.46万 |
| ¥123,456,789.01 | ¥1.23亿 |

#### 修改后
| 完整格式 | 大额缩写 |
|---------|---------|
| CNY 123.45 | CNY 123.45 |
| CNY 1,234.56 | CNY 1,234.56 |
| CNY 12,345.67 | CNY 1.23万 |
| CNY 1,234,567.89 | CNY 123.46万 |
| CNY 123,456,789.01 | CNY 1.23亿 |

### 美元 (USD)

#### 修改前
| 完整格式 | 大额缩写 |
|---------|---------|
| $123.45 | $123.45 |
| $1,234.56 | $1.23K |
| $12,345.67 | $12.35K |
| $1,234,567.89 | $1.23M |
| $1,234,567,890.12 | $1.23B |

#### 修改后
| 完整格式 | 大额缩写 |
|---------|---------|
| USD 123.45 | USD 123.45 |
| USD 1,234.56 | USD 1.23K |
| USD 12,345.67 | USD 12.35K |
| USD 1,234,567.89 | USD 1.23M |
| USD 1,234,567,890.12 | USD 1.23B |

### 日元 (JPY)

#### 修改前
| 完整格式 | 大额缩写 |
|---------|---------|
| ¥123 | ¥123 |
| ¥1,235 | ¥1,235 |
| ¥12,346 | ¥1.23万 |
| ¥1,234,568 | ¥123.46万 |
| ¥123,456,789 | ¥1.23億 |

#### 修改后
| 完整格式 | 大额缩写 |
|---------|---------|
| JPY 123 | JPY 123 |
| JPY 1,235 | JPY 1,235 |
| JPY 12,346 | JPY 1.23万 |
| JPY 1,234,568 | JPY 123.46万 |
| JPY 123,456,789 | JPY 1.23億 |

### 越南盾 (VND) - 后置符号

#### 修改前
| 完整格式 | 大额缩写 |
|---------|---------|
| 123 ₫ | 123 ₫ |
| 1.235 ₫ | 1.23 nghìn ₫ |
| 12.346 ₫ | 12.35 nghìn ₫ |
| 1.234.568 ₫ | 1.23 triệu ₫ |
| 1.234.567.890 ₫ | 1.23 tỷ ₫ |

#### 修改后
| 完整格式 | 大额缩写 |
|---------|---------|
| 123 VND | 123 VND |
| 1.235 VND | 1.23 nghìn VND |
| 12.346 VND | 12.35 nghìn VND |
| 1.234.568 VND | 1.23 triệu VND |
| 1.234.567.890 VND | 1.23 tỷ VND |

### 泰铢 (THB)

#### 修改前
| 完整格式 | 大额缩写 |
|---------|---------|
| ฿123.45 | ฿123.45 |
| ฿1,234.56 | ฿1.23 พัน |
| ฿1,234,567.89 | ฿1.23 ล้าน |
| ฿1,234,567,890.12 | ฿1.23 พันล้าน |

#### 修改后
| 完整格式 | 大额缩写 |
|---------|---------|
| THB 123.45 | THB 123.45 |
| THB 1,234.56 | THB 1.23 พัน |
| THB 1,234,567.89 | THB 1.23 ล้าน |
| THB 1,234,567,890.12 | THB 1.23 พันล้าน |

## 优势分析

### 1. **标准化**
- 货币代码是 ISO 4217 国际标准
- 全球金融系统通用
- 避免符号混淆(如 ¥ 可表示人民币或日元)

### 2. **清晰度**
- 代码明确指示具体货币
- 更易于阅读和理解
- 适合多语言环境

### 3. **一致性**
- 所有货币使用统一的3字母代码
- 前置货币代码后加空格,格式统一
- 后置货币代码前加空格,格式统一

### 4. **专业性**
- 符合金融行业标准
- 更适合商业和财务报表
- 便于数据导出和处理

### 5. **可扩展性**
- 添加新货币时不需要特殊符号支持
- 避免字体不支持某些符号的问题
- 代码在任何环境下都能正确显示

## 支持的所有货币代码

| 货币代码 | 货币名称 | 国家/地区 |
|---------|---------|----------|
| CNY | 人民币 | 中国 |
| USD | US Dollar | 美国 |
| EUR | Euro | 欧元区 |
| GBP | Pound Sterling | 英国 |
| JPY | 円 | 日本 |
| KRW | 원 | 韩国 |
| INR | Rupee | 印度 |
| RUB | Рубль | 俄罗斯 |
| BRL | Real | 巴西 |
| AUD | Australian Dollar | 澳大利亚 |
| CAD | Canadian Dollar | 加拿大 |
| CHF | Schweizer Franken | 瑞士 |
| SGD | Singapore Dollar | 新加坡 |
| HKD | 港幣 | 中國香港 |
| AED | Dirham | 阿联酋 |
| IDR | Rupiah | 印度尼西亚 |
| THB | Baht | 泰国 |
| VND | Đồng | 越南 |
| MYR | Ringgit | 马来西亚 |
| PHP | Peso | 菲律宾 |

## API 使用示例

### 基础用法

```javascript
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const formatter = new CurrencyFormatter('zh-CN');

// 使用货币代码
formatter.format(1234.56, { useCode: true });
// 输出: CNY 1,234.56

// 使用货币符号(默认)
formatter.format(1234.56);
// 输出: ¥1,234.56

// 大额缩写使用货币代码
formatter.formatAbbreviated(12345678, { useCode: true });
// 输出: CNY 1,234.57万

// 大额缩写使用货币符号(默认)
formatter.formatAbbreviated(12345678);
// 输出: ¥1,234.57万
```

### 不同货币示例

```javascript
// 美元
const usdFormatter = new CurrencyFormatter('en-US');
usdFormatter.format(1234.56, { useCode: true });
// USD 1,234.56

// 欧元
const eurFormatter = new CurrencyFormatter('de-DE');
eurFormatter.format(1234.56, { useCode: true });
// 1.234,56 EUR

// 日元
const jpyFormatter = new CurrencyFormatter('ja-JP');
jpyFormatter.format(123456, { useCode: true });
// JPY 123,456

// 越南盾(后置)
const vndFormatter = new CurrencyFormatter('vi-VN');
vndFormatter.format(1234567, { useCode: true });
// 1.234.567 VND

// 泰铢
const thbFormatter = new CurrencyFormatter('th-TH');
thbFormatter.format(1234.56, { useCode: true });
// THB 1,234.56
```

### React 组件中使用

```javascript
const PriceDisplay = ({ amount, locale, showCode = false }) => {
  const formatter = new CurrencyFormatter(locale);

  return (
    <div className="price-display">
      <div className="full-price">
        {formatter.format(amount, { useCode: showCode })}
      </div>
      <div className="abbreviated-price">
        {formatter.formatAbbreviated(amount, { useCode: showCode })}
      </div>
    </div>
  );
};

// 使用示例
<PriceDisplay amount={1234567.89} locale="zh-CN" showCode={true} />
// 显示:
// CNY 1,234,567.89
// CNY 123.46万

<PriceDisplay amount={1234567.89} locale="zh-CN" showCode={false} />
// 显示:
// ¥1,234,567.89
// ¥123.46万
```

## 格式化规则

### 前置货币(大部分货币)
- **货币代码**: `CODE 数字` (有空格)
- **货币符号**: `符号数字` (无空格)

示例:
```
CNY 1,234.56  vs  ¥1,234.56
USD 1,234.56  vs  $1,234.56
THB 1,234.56  vs  ฿1,234.56
```

### 后置货币(欧元、卢布、越南盾等)
- **货币代码**: `数字 CODE` (有空格)
- **货币符号**: `数字 符号` (有空格)

示例:
```
1.234,56 EUR  vs  1.234,56 €
1 234,56 RUB  vs  1 234,56 ₽
1.234.567 VND  vs  1.234.567 ₫
```

## 注意事项

### 1. 辅币格式不受影响
辅币格式化(formatSubunit 和 formatSubunitFull)仍然使用货币符号,因为:
- 辅币单位通常不使用货币代码
- 保持传统习惯(如"123分"而非"CNY 123分")
- 辅币格式主要用于本地化场景

### 2. 向后兼容
- `useCode` 参数默认为 `false`
- 现有代码不需要修改即可继续工作
- 只在需要时显式启用货币代码

### 3. 性能影响
- 没有性能影响
- 只是简单的字符串替换
- 不增加计算开销

## 构建状态

```bash
✓ 编译成功
✓ CSS: 59.75 KB (gzip: 9.10 KB)
✓ JS: 285.14 KB (gzip: 88.31 KB)
✓ 生产就绪
```

## 版本信息

- **更新日期**: 2026-01-13
- **版本**: 2.4.0
- **状态**: ✅ 已完成并测试通过
- **影响范围**: 完整格式和大额缩写显示

---

**总结**: 此更新提供了更专业、更标准化的货币显示方式,特别适合金融、电商和跨境业务场景。通过 `useCode` 参数,开发者可以灵活选择使用货币代码或货币符号。
