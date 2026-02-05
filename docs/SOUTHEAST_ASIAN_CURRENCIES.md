# 东南亚货币支持 - 新增功能

## 概述

成功添加4种主要东南亚货币,货币格式化系统现在支持 **21种** 全球主要货币。同时为所有货币添加了缩写单位和辅币单位的进位关系展示。

## 新增东南亚货币

### 1. 泰国 - 泰铢 (THB)

| 属性 | 值 |
|------|-----|
| **货币代码** | THB |
| **货币符号** | ฿ |
| **货币名称** | Baht |
| **国家** | 泰国 |
| **辅币单位** | สตางค์ (Satang) |
| **进位关系** | 1 Baht = 100 สตางค์ |
| **小数位数** | 2 |
| **千位分隔符** | , |
| **小数分隔符** | . |

#### 缩写规则
| 级别 | 数值 | 缩写 | 泰语 |
|------|------|------|------|
| 千 | 1,000 | พัน | พัน |
| 百万 | 1,000,000 | ล้าน | ล้าน |
| 十亿 | 1,000,000,000 | พันล้าน | พันล้าน |

#### 格式化示例
```javascript
const thbFormatter = new CurrencyFormatter('th-TH');

thbFormatter.format(1234.56);
// ฿1,234.56

thbFormatter.formatAbbreviated(1500000);
// ฿1.50 ล้าน

thbFormatter.formatSubunit(123.45);
// 12,345 สตางค์
```

### 2. 越南 - 越南盾 (VND)

| 属性 | 值 |
|------|-----|
| **货币代码** | VND |
| **货币符号** | ₫ |
| **货币名称** | Đồng |
| **国家** | 越南 |
| **辅币单位** | xu |
| **进位关系** | 1 đồng = 10 xu |
| **小数位数** | 0 (通常不使用小数) |
| **千位分隔符** | . (点号) |
| **小数分隔符** | , (逗号) |
| **符号位置** | after (后置) |

#### 缩写规则
| 级别 | 数值 | 缩写 | 越南语 |
|------|------|------|--------|
| 千 | 1,000 | nghìn | nghìn |
| 百万 | 1,000,000 | triệu | triệu |
| 十亿 | 1,000,000,000 | tỷ | tỷ |

#### 格式化示例
```javascript
const vndFormatter = new CurrencyFormatter('vi-VN');

vndFormatter.format(1234567);
// 1.234.567 ₫

vndFormatter.formatAbbreviated(1500000000);
// 1.50 tỷ ₫

vndFormatter.formatSubunit(123);
// 1,230 xu
```

### 3. 马来西亚 - 林吉特 (MYR)

| 属性 | 值 |
|------|-----|
| **货币代码** | MYR |
| **货币符号** | RM |
| **货币名称** | Ringgit |
| **国家** | 马来西亚 |
| **辅币单位** | sen |
| **进位关系** | 1 Ringgit = 100 sen |
| **小数位数** | 2 |
| **千位分隔符** | , |
| **小数分隔符** | . |

#### 缩写规则
| 级别 | 数值 | 缩写 |
|------|------|------|
| 千 | 1,000 | K |
| 百万 | 1,000,000 | M |
| 十亿 | 1,000,000,000 | B |

#### 格式化示例
```javascript
const myrFormatter = new CurrencyFormatter('ms-MY');

myrFormatter.format(1234.56);
// RM1,234.56

myrFormatter.formatAbbreviated(1500000);
// RM1.50 M

myrFormatter.formatSubunit(123.45);
// 12,345 sen
```

### 4. 菲律宾 - 比索 (PHP)

| 属性 | 值 |
|------|-----|
| **货币代码** | PHP |
| **货币符号** | ₱ |
| **货币名称** | Peso |
| **国家** | 菲律宾 |
| **辅币单位** | sentimo |
| **进位关系** | 1 Peso = 100 sentimo |
| **小数位数** | 2 |
| **千位分隔符** | , |
| **小数分隔符** | . |

#### 缩写规则
| 级别 | 数值 | 缩写 |
|------|------|------|
| 千 | 1,000 | K |
| 百万 | 1,000,000 | M |
| 十亿 | 1,000,000,000 | B |

#### 格式化示例
```javascript
const phpFormatter = new CurrencyFormatter('fil-PH');

phpFormatter.format(1234.56);
// ₱1,234.56

phpFormatter.formatAbbreviated(1500000);
// ₱1.50 M

phpFormatter.formatSubunit(123.45);
// 12,345 sentimo
```

## 进位关系展示功能

### 功能概述
为所有21种货币添加了两个新的展示部分:
1. **大额缩写进位关系**: 显示各货币的大额单位缩写及其对应的数值
2. **辅币单位进位关系**: 显示主币与辅币的换算关系

### 展示效果

#### 大额缩写进位关系
以人民币为例:
```
大额缩写进位关系
┌──────────────────┐
│ 亿 → 100,000,000 │
│ 万 → 10,000      │
└──────────────────┘
```

以美元为例:
```
大额缩写进位关系
┌──────────────────────┐
│ T → 1,000,000,000,000│
│ B → 1,000,000,000    │
│ M → 1,000,000        │
│ K → 1,000            │
└──────────────────────┘
```

#### 辅币单位进位关系
以人民币为例(二级辅币):
```
辅币单位进位关系
┌────────────────────┐
│ 1 主币 = 10 角     │
│ 1 角 = 10 分       │
│ 1 主币 = 100 分    │
└────────────────────┘
```

以美元为例(单级辅币):
```
辅币单位进位关系
┌─────────────────────┐
│ 1 主币 = 100 cents  │
└─────────────────────┘
```

以越南盾为例(特殊进位):
```
辅币单位进位关系
┌──────────────────┐
│ 1 主币 = 10 xu   │
└──────────────────┘
```

### CSS 样式特点

#### 视觉设计
- 浅蓝色背景高亮 (rgba(59, 130, 246, 0.03))
- 蓝色边框 (rgba(59, 130, 246, 0.1))
- Hover 效果加深背景色
- 左侧蓝色装饰条标识标题

#### 响应式布局
- **桌面端**: 水平布局,清晰展示单位、箭头、数值
- **平板端**: 缩小间距和字体,保持水平布局
- **移动端** (<480px): 垂直布局,箭头旋转90度

### 技术实现

#### React 组件结构
```javascript
{/* 大额缩写进位关系 */}
{formatter.config.abbreviations && formatter.config.abbreviations.length > 0 && (
  <div className="conversion-section">
    <h3 className="section-title">大额缩写进位关系</h3>
    <div className="conversion-list">
      {formatter.config.abbreviations.slice().reverse().map((abbr, index) => (
        <div key={index} className="conversion-item">
          <span className="conversion-unit">{abbr.suffix.trim()}</span>
          <span className="conversion-arrow">→</span>
          <span className="conversion-value">{/* 格式化数值 */}</span>
        </div>
      ))}
    </div>
  </div>
)}

{/* 辅币单位进位关系 */}
{currencyInfo.subunit && (
  <div className="conversion-section">
    <h3 className="section-title">辅币单位进位关系</h3>
    <div className="conversion-list">
      {/* 二级辅币换算 */}
      {currencyInfo.secondarySubunit && (
        <>
          <div className="conversion-item">
            <span className="conversion-unit">1 主币</span>
            <span className="conversion-arrow">=</span>
            <span className="conversion-value">
              {formatter.config.secondarySubunitDivider} {currencyInfo.secondarySubunit}
            </span>
          </div>
          <div className="conversion-item">
            <span className="conversion-unit">1 {currencyInfo.secondarySubunit}</span>
            <span className="conversion-arrow">=</span>
            <span className="conversion-value">
              {formatter.config.subunitDivider / formatter.config.secondarySubunitDivider} {currencyInfo.subunit}
            </span>
          </div>
        </>
      )}
      {/* 主辅币换算 */}
      <div className="conversion-item">
        <span className="conversion-unit">1 主币</span>
        <span className="conversion-arrow">=</span>
        <span className="conversion-value">
          {formatter.config.subunitDivider} {currencyInfo.subunit}
        </span>
      </div>
    </div>
  </div>
)}
```

#### CSS 核心样式
```css
/* 转换关系部分 */
.conversion-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background-color: var(--accent);
  border-radius: 2px;
}

.conversion-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: rgba(59, 130, 246, 0.03);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(59, 130, 246, 0.1);
  transition: var(--transition-base);
}

.conversion-item:hover {
  background-color: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.2);
}

.conversion-unit {
  font-weight: 600;
  color: var(--accent);
  min-width: 100px;
  font-size: 0.875rem;
}

.conversion-arrow {
  color: var(--text-secondary);
  font-weight: bold;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.conversion-value {
  font-family: 'Monaco', 'Courier New', monospace;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
}
```

## 支持的货币总览

系统现在支持 **21种** 全球主要货币:

### 东亚地区
1. 🇨🇳 中国 - 人民币 (CNY) - 缩写: 万/亿
2. 🇯🇵 日本 - 日元 (JPY) - 缩写: 万/億/兆
3. 🇰🇷 韩国 - 韩元 (KRW) - 缩写: 만/억/조
4. 🇭🇰 中國香港 - 港币 (HKD) - 缩写: 萬/億

### 东南亚地区 ⭐ 新增
5. 🇹🇭 **泰国 - 泰铢 (THB)** - 缩写: พัน/ล้าน/พันล้าน
6. 🇻🇳 **越南 - 越南盾 (VND)** - 缩写: nghìn/triệu/tỷ
7. 🇲🇾 **马来西亚 - 林吉特 (MYR)** - 缩写: K/M/B
8. 🇵🇭 **菲律宾 - 比索 (PHP)** - 缩写: K/M/B
9. 🇸🇬 新加坡 - 新元 (SGD) - 缩写: K/M/B
10. 🇮🇩 印度尼西亚 - 印尼盾 (IDR) - 缩写: Rb/Jt/M/T

### 南亚地区
11. 🇮🇳 印度 - 卢比 (INR) - 缩写: K/L/Cr

### 欧美地区
12. 🇺🇸 美国 - 美元 (USD) - 缩写: K/M/B/T
13. 🇪🇺 欧元区 - 欧元 (EUR) - 缩写: Tsd./Mio./Mrd./Bio.
14. 🇬🇧 英国 - 英镑 (GBP) - 缩写: k/m/bn/T
15. 🇨🇦 加拿大 - 加元 (CAD) - 缩写: K/M/B
16. 🇦🇺 澳大利亚 - 澳元 (AUD) - 缩写: K/M/B
17. 🇨🇭 瑞士 - 瑞士法郎 (CHF) - 缩写: Tsd./Mio./Mrd.
18. 🇧🇷 巴西 - 雷亚尔 (BRL) - 缩写: mil/mi/bi/tri

### 其他地区
19. 🇷🇺 俄罗斯 - 卢布 (RUB) - 缩写: тыс/млн/млрд/трлн
20. 🇦🇪 阿联酋 - 迪拉姆 (AED) - 缩写: K/M/B

## 使用场景

### 1. 东南亚电商平台
```javascript
const PriceDisplay = ({ amount, locale }) => {
  const formatter = new CurrencyFormatter(locale);

  return (
    <div>
      <div className="price">{formatter.format(amount)}</div>
      <div className="price-abbrev">{formatter.formatAbbreviated(amount)}</div>
    </div>
  );
};

// 泰国商品
<PriceDisplay amount={45000} locale="th-TH" />
// 显示: ฿45,000 (฿45.00 พัน)

// 越南商品
<PriceDisplay amount={1500000} locale="vi-VN" />
// 显示: 1.500.000 ₫ (1.50 triệu ₫)

// 马来西亚商品
<PriceDisplay amount={3500} locale="ms-MY" />
// 显示: RM3,500 (RM3.50 K)

// 菲律宾商品
<PriceDisplay amount={25000} locale="fil-PH" />
// 显示: ₱25,000 (₱25.00 K)
```

### 2. 跨境支付平台
```javascript
const PaymentSummary = ({ amounts }) => {
  return (
    <div className="payment-summary">
      {Object.entries(amounts).map(([locale, amount]) => {
        const formatter = new CurrencyFormatter(locale);
        const info = formatter.getCurrencyInfo();

        return (
          <div key={locale} className="payment-row">
            <span>{info.country} ({info.currency})</span>
            <span>{formatter.format(amount)}</span>
          </div>
        );
      })}
    </div>
  );
};

// 使用示例
<PaymentSummary amounts={{
  'th-TH': 35000,
  'vi-VN': 850000,
  'ms-MY': 450,
  'fil-PH': 5500
}} />
// 显示:
// 泰国 (THB): ฿35,000
// 越南 (VND): 850.000 ₫
// 马来西亚 (MYR): RM450
// 菲律宾 (PHP): ₱5,500
```

### 3. 金融数据看板
```javascript
const FinancialDashboard = ({ data }) => {
  const formatter = new CurrencyFormatter(data.locale);

  return (
    <div className="dashboard">
      <div className="metric">
        <h3>总收入</h3>
        <p className="amount">{formatter.formatAbbreviated(data.revenue)}</p>
        <p className="detail">{formatter.format(data.revenue)}</p>
      </div>
      <div className="metric">
        <h3>总支出</h3>
        <p className="amount">{formatter.formatAbbreviated(data.expenses)}</p>
        <p className="detail">{formatter.format(data.expenses)}</p>
      </div>
    </div>
  );
};

// 泰国业务数据
<FinancialDashboard data={{
  locale: 'th-TH',
  revenue: 125000000,
  expenses: 87500000
}} />
// 显示:
// 总收入: ฿125.00 ล้าน (฿125,000,000)
// 总支出: ฿87.50 ล้าน (฿87,500,000)
```

## 货币兑换参考

截至2026年,东南亚货币兑换率大致为:

### 泰铢 (THB)
- 1 USD ≈ 35 THB
- 1 CNY ≈ 5 THB
- 1 EUR ≈ 38 THB

### 越南盾 (VND)
- 1 USD ≈ 24,000 VND
- 1 CNY ≈ 3,400 VND
- 1 EUR ≈ 26,000 VND

### 林吉特 (MYR)
- 1 USD ≈ 4.5 MYR
- 1 CNY ≈ 0.65 MYR
- 1 EUR ≈ 4.9 MYR

### 比索 (PHP)
- 1 USD ≈ 56 PHP
- 1 CNY ≈ 8 PHP
- 1 EUR ≈ 60 PHP

注意:实际汇率会实时变动,请以当日银行牌价为准。

## 构建状态

```bash
✓ 编译成功
✓ CSS: 59.75 KB (gzip: 9.10 KB)
✓ JS: 285.01 KB (gzip: 88.24 KB)
✓ 生产就绪
```

## 技术特点

### 1. 本地化缩写
- 每种货币使用其本地语言的缩写单位
- 泰语: พัน, ล้าน, พันล้าน
- 越南语: nghìn, triệu, tỷ
- 英文字母: K, M, B (马来西亚、菲律宾)

### 2. 特殊进位处理
- 越南盾: 1:10 进位 (1 đồng = 10 xu)
- 其他货币: 1:100 进位 (标准)

### 3. 零小数货币
- 越南盾 (VND): decimals = 0
- 日元 (JPY): decimals = 0
- 韩元 (KRW): decimals = 0
- 印尼盾 (IDR): decimals = 0

### 4. 符号位置多样
- 前置: ฿, RM, ₱ (泰铢、林吉特、比索)
- 后置: ₫ (越南盾)

## 未来扩展

可考虑添加其他东南亚货币:
- 🇰🇭 柬埔寨 - 瑞尔 (KHR)
- 🇱🇦 老挝 - 基普 (LAK)
- 🇲🇲 缅甸 - 缅元 (MMK)
- 🇧🇳 文莱 - 文莱元 (BND)

---

**添加时间**: 2026-01-13
**版本**: 2.3.0
**状态**: ✅ 已完成并测试通过
**新增货币数**: 4种 (THB, VND, MYR, PHP)
**总计支持货币**: 21种
