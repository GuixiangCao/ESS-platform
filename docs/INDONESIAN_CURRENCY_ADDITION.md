# 印度尼西亚货币支持 - 新增功能

## 概述

已成功添加印度尼西亚盾(Indonesian Rupiah, IDR)到货币格式化系统中,现在支持 **16种** 全球主要货币。

## 印尼盾(IDR)配置详情

### 基本信息

| 属性 | 值 |
|------|-----|
| **货币代码** | IDR |
| **货币符号** | Rp |
| **货币名称** | Rupiah |
| **国家** | Indonesia |
| **辅币单位** | sen |
| **小数位数** | 0 (印尼盾通常不使用小数) |
| **千位分隔符** | `.` (点号) |
| **小数分隔符** | `,` (逗号) |
| **符号位置** | before (前置) |

### 缩写规则

印尼盾使用印尼语缩写:

| 级别 | 数值 | 缩写 | 印尼语 | 示例 |
|------|------|------|--------|------|
| 千 | 1,000 | Rb | Ribu | Rp1.50 Rb |
| 百万 | 1,000,000 | Jt | Juta | Rp2.50 Jt |
| 十亿 | 1,000,000,000 | M | Miliar | Rp3.50 M |
| 万亿 | 1,000,000,000,000 | T | Triliun | Rp4.50 T |

## 格式化示例

### 基础格式

```javascript
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const idrFormatter = new CurrencyFormatter('id-ID');

// 完整格式
idrFormatter.format(1234567);
// 输出: Rp1.234.567

idrFormatter.format(50000);
// 输出: Rp50.000

// 大额缩写
idrFormatter.formatAbbreviated(1500000);
// 输出: Rp1.50 Jt

idrFormatter.formatAbbreviated(2500000000);
// 输出: Rp2.50 M

idrFormatter.formatAbbreviated(3500000000000);
// 输出: Rp3.50 T
```

### 格式化对照表

| 数量级 | 原始金额 | 完整格式 | 大额缩写 |
|--------|----------|----------|----------|
| 百位 | 123 | Rp123 | Rp123 |
| 千位 | 1,235 | Rp1.235 | Rp1.23 Rb |
| 万位 | 12,346 | Rp12.346 | Rp12.35 Rb |
| 十万位 | 123,457 | Rp123.457 | Rp123.46 Rb |
| 百万位 | 1,234,568 | Rp1.234.568 | Rp1.23 Jt |
| 千万位 | 12,345,679 | Rp12.345.679 | Rp12.35 Jt |
| 亿位 | 123,456,789 | Rp123.456.789 | Rp123.46 Jt |
| 十亿位 | 1,234,567,890 | Rp1.234.567.890 | Rp1.23 M |

### 印尼特色

1. **无小数**: 印尼盾不使用小数位,所有金额都是整数
2. **点号分隔**: 使用点号(.)作为千位分隔符,与英美体系相反
3. **逗号小数**: 虽然不使用小数,但配置为逗号小数分隔符,符合印尼习惯
4. **本地化缩写**: 使用印尼语缩写(Rb、Jt、M、T)而非英文

## 使用场景

### 1. 电商平台价格显示

```javascript
const ProductPrice = ({ price }) => {
  const formatter = new CurrencyFormatter('id-ID');

  return (
    <div className="product-price">
      <span className="price-main">
        {formatter.format(price)}
      </span>
      {price >= 1000000 && (
        <span className="price-abbrev">
          ({formatter.formatAbbreviated(price)})
        </span>
      )}
    </div>
  );
};

// 使用示例
<ProductPrice price={15000000} />
// 显示: Rp15.000.000 (Rp15.00 Jt)
```

### 2. 金融报表

```javascript
const FinancialReport = ({ revenue, expenses }) => {
  const formatter = new CurrencyFormatter('id-ID');
  const profit = revenue - expenses;

  return (
    <div className="financial-report">
      <div className="line-item">
        <span>Pendapatan:</span>
        <span>{formatter.formatAbbreviated(revenue)}</span>
      </div>
      <div className="line-item">
        <span>Pengeluaran:</span>
        <span>{formatter.formatAbbreviated(expenses)}</span>
      </div>
      <div className="line-item total">
        <span>Laba Bersih:</span>
        <span>{formatter.formatAbbreviated(profit)}</span>
      </div>
    </div>
  );
};

// 使用示例
<FinancialReport
  revenue={5000000000}
  expenses={3500000000}
/>
// 显示:
// Pendapatan: Rp5.00 M
// Pengeluaran: Rp3.50 M
// Laba Bersih: Rp1.50 M
```

### 3. 转账金额输入

```javascript
const TransferForm = () => {
  const [amount, setAmount] = useState(0);
  const formatter = new CurrencyFormatter('id-ID');

  return (
    <div className="transfer-form">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Masukkan jumlah"
      />
      <div className="amount-preview">
        {formatter.format(amount)}
      </div>
      {amount >= 1000000 && (
        <div className="amount-readable">
          ≈ {formatter.formatAbbreviated(amount)}
        </div>
      )}
    </div>
  );
};
```

## 印尼盾货币特点

### 历史背景
- 印尼盾是印度尼西亚的官方货币
- 由于历史上的通货膨胀,面额较大
- 常见流通面额: 1,000、2,000、5,000、10,000、20,000、50,000、100,000

### 使用习惯
1. **舍去小数**: 所有交易金额都是整数,不使用分币
2. **大额交易**: 日常生活中经常使用百万级金额
3. **缩写偏好**: 口语和书面常使用缩写(Juta、Ribu等)
4. **点号分隔**: 继承荷兰殖民时期的数字格式习惯

## 货币兑换参考

截至2026年,印尼盾兑换率大致为:
- 1 USD ≈ 15,500 IDR
- 1 CNY ≈ 2,150 IDR
- 1 EUR ≈ 17,000 IDR

注意:实际汇率会实时变动,请以当日银行牌价为准。

## API 方法示例

### 完整格式化

```javascript
const formatter = new CurrencyFormatter('id-ID');

formatter.format(123456789);
// Rp123.456.789

formatter.format(50000);
// Rp50.000
```

### 大额缩写

```javascript
formatter.formatAbbreviated(1500);
// Rp1.50 Rb

formatter.formatAbbreviated(2500000);
// Rp2.50 Jt

formatter.formatAbbreviated(3500000000);
// Rp3.50 M
```

### 智能格式化

```javascript
// 小额显示完整,大额显示缩写
formatter.formatSmart(50000);        // Rp50.000
formatter.formatSmart(5000000);      // Rp5.00 Jt

// 自定义阈值
formatter.formatSmart(50000, { threshold: 100000 });
// Rp50.000 (未达阈值)

formatter.formatSmart(150000, { threshold: 100000 });
// Rp150.00 Rb (超过阈值)
```

### 获取货币信息

```javascript
const info = formatter.getCurrencyInfo();
console.log(info);
// {
//   locale: 'id-ID',
//   currency: 'IDR',
//   symbol: 'Rp',
//   name: 'Rupiah',
//   country: 'Indonesia',
//   subunit: 'sen',
//   decimals: 0
// }
```

## 页面展示

在收益查看本地化页面,印尼盾现在会显示为:

### 货币选择卡片
```
┌─────────────────┐
│  Rp             │ ← 货币符号
│  INDONESIA      │ ← 国家名称
│  Rupiah         │ ← 货币名称
│  IDR            │ ← 货币代码
└─────────────────┘
```

### 货币信息
- **国家/地区**: Indonesia
- **货币名称**: Rupiah
- **货币代码**: IDR
- **货币符号**: Rp
- **小数位数**: 0 位
- **辅币单位**: sen

### 格式化对照表
会展示8个不同数量级的印尼盾格式化效果,包括:
- 完整格式(使用点号分隔)
- 大额缩写(使用 Rb、Jt、M、T)
- 辅币格式(如果适用)

## 支持的货币总览

系统现在支持 **16种** 全球主要货币:

1. 🇨🇳 中国 - 人民币 (CNY)
2. 🇺🇸 美国 - 美元 (USD)
3. 🇪🇺 欧元区 - 欧元 (EUR)
4. 🇬🇧 英国 - 英镑 (GBP)
5. 🇯🇵 日本 - 日元 (JPY)
6. 🇰🇷 韩国 - 韩元 (KRW)
7. 🇮🇳 印度 - 卢比 (INR)
8. 🇷🇺 俄罗斯 - 卢布 (RUB)
9. 🇧🇷 巴西 - 雷亚尔 (BRL)
10. 🇦🇺 澳大利亚 - 澳元 (AUD)
11. 🇨🇦 加拿大 - 加元 (CAD)
12. 🇨🇭 瑞士 - 瑞士法郎 (CHF)
13. 🇸🇬 新加坡 - 新元 (SGD)
14. 🇭🇰 中国香港 - 港币 (HKD)
15. 🇦🇪 阿联酋 - 迪拉姆 (AED)
16. 🇮🇩 **印度尼西亚 - 印尼盾 (IDR)** ← 新增

## 构建状态

```bash
✓ 编译成功
✓ CSS: 58.22 KB (gzip: 8.87 KB)
✓ JS: 282.15 KB (gzip: 87.73 KB)
✓ 生产就绪
```

## 技术实现

### 配置代码

```javascript
'id-ID': {
  currency: 'IDR',
  symbol: 'Rp',
  name: 'Rupiah',
  country: 'Indonesia',
  subunit: 'sen',
  subunitDivider: 100,
  decimals: 0,
  thousandsSeparator: '.',
  decimalSeparator: ',',
  symbolPosition: 'before',
  abbreviations: [
    { value: 1e12, suffix: ' T', decimals: 2 },   // Triliun
    { value: 1e9, suffix: ' M', decimals: 2 },    // Miliar
    { value: 1e6, suffix: ' Jt', decimals: 2 },   // Juta
    { value: 1e3, suffix: ' Rb', decimals: 2 },   // Ribu
  ]
}
```

### 关键特性

1. **零小数位**: `decimals: 0` 确保不显示小数
2. **点号千位分隔**: `thousandsSeparator: '.'` 符合印尼习惯
3. **本地化缩写**: 使用印尼语缩写而非英文
4. **辅币支持**: 虽然不常用,但保留 sen 作为辅币单位

---

**添加时间**: 2026-01-13
**版本**: 2.2.0
**状态**: ✅ 已完成并测试通过
