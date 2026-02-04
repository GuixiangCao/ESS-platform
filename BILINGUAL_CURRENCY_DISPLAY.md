# 货币双语显示 - 本地语言 + 英文翻译

## 概述

为所有非英文货币的大额缩写和辅币单位添加英文翻译,在保留本国语言的同时,显示对应的国际化标准英文,提升全球用户的理解度。

## 功能特性

### 1. 大额缩写双语显示
- **本地语言**: 保留原有的本地化缩写(如中文"万"、"亿",日文"万"、"億",泰文"พัน"、"ล้าน")
- **英文翻译**: 括号内显示对应的英文(如 thousand, million, billion)
- **显示格式**: `本地语言 (english)`

### 2. 辅币单位双语显示
- **本地语言**: 保留原有的辅币单位名称(如"分"、"角",俄语"копейка",泰语"สตางค์")
- **英文翻译**: 括号内显示英文音译或标准名称
- **显示格式**: `本地单位 (english)`

### 3. 视觉效果
- 本地语言: 正常字体,蓝色高亮
- 英文翻译: 斜体,灰色显示,较小字号
- 位置: 紧跟本地语言,括号包裹

## 支持的货币详情

### 东亚货币

#### 1. 中国 - 人民币 (CNY)
**大额缩写**:
- 亿 (hundred million) → 100,000,000
- 万 (ten thousand) → 10,000

**辅币单位**:
- 1 主币 = 10 角 (jiao)
- 1 角 (jiao) = 10 分 (fen)
- 1 主币 = 100 分 (fen)

**显示示例**:
```
大额缩写: CNY 1.23亿 (hundred million)
辅币单位: 100 分 (fen)
```

#### 2. 日本 - 日元 (JPY)
**大额缩写**:
- 兆 (trillion) → 1,000,000,000,000
- 億 (hundred million) → 100,000,000
- 万 (ten thousand) → 10,000

**显示示例**:
```
大额缩写: JPY 1.23兆 (trillion)
辅币单位: 无
```

#### 3. 韩国 - 韩元 (KRW)
**大额缩写**:
- 조 (trillion) → 1,000,000,000,000
- 억 (hundred million) → 100,000,000
- 만 (ten thousand) → 10,000

**显示示例**:
```
大额缩写: KRW 1.23조 (trillion)
辅币单位: 无
```

#### 4. 中国香港 - 港币 (HKD)
**大额缩写**:
- 億 (hundred million) → 100,000,000
- 萬 (ten thousand) → 10,000

**辅币单位**:
- 1 主币 = 10 毫 (ho)
- 1 毫 (ho) = 10 仙 (sin)
- 1 主币 = 100 仙 (sin)

**显示示例**:
```
大额缩写: HKD 1.23億 (hundred million)
辅币单位: 10 毫 (ho)
```

### 欧洲货币

#### 5. 欧元区 - 欧元 (EUR)
**大额缩写**:
- Bio. (trillion) → 1,000,000,000,000
- Mrd. (billion) → 1,000,000,000
- Mio. (million) → 1,000,000
- Tsd. (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 cents (cents)

**显示示例**:
```
大额缩写: 1.23 Mio. (million) EUR
辅币单位: 100 cents (cents)
```

#### 6. 俄罗斯 - 卢布 (RUB)
**大额缩写**:
- трлн (trillion) → 1,000,000,000,000
- млрд (billion) → 1,000,000,000
- млн (million) → 1,000,000
- тыс (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 копейка (kopeck)

**显示示例**:
```
大额缩写: 1.23 млн (million) RUB
辅币单位: 100 копейка (kopeck)
```

#### 7. 瑞士 - 瑞士法郎 (CHF)
**大额缩写**:
- Mrd. (billion) → 1,000,000,000
- Mio. (million) → 1,000,000
- Tsd. (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 Rappen (rappen)

**显示示例**:
```
大额缩写: CHF 1.23 Mio. (million)
辅币单位: 100 Rappen (rappen)
```

### 南美货币

#### 8. 巴西 - 雷亚尔 (BRL)
**大额缩写**:
- tri (trillion) → 1,000,000,000,000
- bi (billion) → 1,000,000,000
- mi (million) → 1,000,000
- mil (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 centavos (centavos)

**显示示例**:
```
大额缩写: R$ 1.23 mi (million)
辅币单位: 100 centavos (centavos)
```

### 东南亚货币

#### 9. 泰国 - 泰铢 (THB)
**大额缩写**:
- พันล้าน (billion) → 1,000,000,000
- ล้าน (million) → 1,000,000
- พัน (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 สตางค์ (satang)

**显示示例**:
```
大额缩写: THB 1.23 ล้าน (million)
辅币单位: 100 สตางค์ (satang)
```

#### 10. 越南 - 越南盾 (VND)
**大额缩写**:
- tỷ (billion) → 1,000,000,000
- triệu (million) → 1,000,000
- nghìn (thousand) → 1,000

**辅币单位**:
- 1 主币 = 10 xu (xu)

**显示示例**:
```
大额缩写: 1.23 tỷ (billion) VND
辅币单位: 10 xu (xu)
```

#### 11. 印度尼西亚 - 印尼盾 (IDR)
**大额缩写**:
- T (trillion) → 1,000,000,000,000
- M (billion) → 1,000,000,000
- Jt (million) → 1,000,000
- Rb (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 sen (sen)

**显示示例**:
```
大额缩写: Rp 1.23 Jt (million)
辅币单位: 100 sen (sen)
```

#### 12. 马来西亚 - 林吉特 (MYR)
**大额缩写**:
- B (billion) → 1,000,000,000
- M (million) → 1,000,000
- K (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 sen (sen)

**显示示例**:
```
大额缩写: RM 1.23 M (million)
辅币单位: 100 sen (sen)
```

#### 13. 菲律宾 - 比索 (PHP)
**大额缩写**:
- B (billion) → 1,000,000,000
- M (million) → 1,000,000
- K (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 sentimo (sentimo)

**显示示例**:
```
大额缩写: ₱1.23 M (million)
辅币单位: 100 sentimo (sentimo)
```

### 中东货币

#### 14. 阿联酋 - 迪拉姆 (AED)
**大额缩写**:
- B (billion) → 1,000,000,000
- M (million) → 1,000,000
- K (thousand) → 1,000

**辅币单位**:
- 1 主币 = 100 fils (fils)

**显示示例**:
```
大额缩写: د.إ 1.23 M (million)
辅币单位: 100 fils (fils)
```

## 界面展示效果

### 大额缩写进位关系卡片

```
┌────────────────────────────────────────────┐
│ 大额缩写进位关系                            │
├────────────────────────────────────────────┤
│ 億 (hundred million) → 100,000,000         │
│ 萬 (ten thousand)    → 10,000              │
└────────────────────────────────────────────┘
```

### 辅币单位进位关系卡片

```
┌────────────────────────────────────────────┐
│ 辅币单位进位关系                            │
├────────────────────────────────────────────┤
│ 1 主币 = 10 角 (jiao)                      │
│ 1 角 (jiao) = 10 分 (fen)                  │
│ 1 主币 = 100 分 (fen)                      │
└────────────────────────────────────────────┘
```

## 技术实现

### 1. 配置结构扩展

```javascript
// 货币配置示例 - 中国人民币
'zh-CN': {
  currency: 'CNY',
  symbol: '¥',
  name: '人民币',
  country: '中国',

  // 辅币单位 - 双语
  subunit: '分',
  subunitEn: 'fen',              // 新增: 英文名称
  subunitDivider: 100,

  // 二级辅币单位 - 双语
  secondarySubunit: '角',
  secondarySubunitEn: 'jiao',    // 新增: 英文名称
  secondarySubunitDivider: 10,

  // 大额缩写 - 双语
  abbreviations: [
    {
      value: 1e8,
      suffix: '亿',              // 本地语言
      suffixEn: 'hundred million', // 新增: 英文翻译
      decimals: 2
    },
    {
      value: 1e4,
      suffix: '万',
      suffixEn: 'ten thousand',
      decimals: 2
    },
  ]
}
```

### 2. React 组件实现

```jsx
{/* 大额缩写进位关系 - 双语显示 */}
<div className="conversion-item">
  <span className="conversion-unit">
    {abbr.suffix.trim()}
    {abbr.suffixEn && (
      <span className="unit-en"> ({abbr.suffixEn})</span>
    )}
  </span>
  <span className="conversion-arrow">→</span>
  <span className="conversion-value">1,000,000</span>
</div>

{/* 辅币单位进位关系 - 双语显示 */}
<div className="conversion-item">
  <span className="conversion-unit">1 主币</span>
  <span className="conversion-arrow">=</span>
  <span className="conversion-value">
    100 {currencyInfo.subunit}
    {formatter.config.subunitEn && (
      <span className="unit-en"> ({formatter.config.subunitEn})</span>
    )}
  </span>
</div>
```

### 3. CSS 样式

```css
/* 英文翻译样式 */
.unit-en {
  font-size: 0.75rem;           /* 较小字号 */
  color: var(--text-secondary); /* 灰色显示 */
  font-weight: 400;             /* 正常字重 */
  font-style: italic;           /* 斜体 */
  margin-left: 0.25rem;         /* 左侧间距 */
}

/* 转换单位样式 */
.conversion-unit {
  font-weight: 600;
  color: var(--accent);         /* 蓝色高亮 */
  min-width: 100px;
  font-size: 0.875rem;
}

/* 转换值样式 */
.conversion-value {
  font-family: 'Monaco', 'Courier New', monospace;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
}
```

## 使用场景

### 1. 国际化应用
- 面向全球用户的金融应用
- 跨境电商平台
- 国际支付系统

### 2. 教育平台
- 货币教学工具
- 金融知识普及
- 汇率转换学习

### 3. 多语言团队
- 便于不同语言背景的团队成员理解
- 降低沟通成本
- 提高工作效率

## 优势分析

### 1. **增强理解度**
- 本地用户可以使用熟悉的本地语言
- 国际用户可以通过英文翻译理解含义
- 双语显示兼顾两者需求

### 2. **保持文化特色**
- 保留原有的本地化缩写
- 尊重各国货币文化
- 不失去本地化优势

### 3. **提升可访问性**
- 降低语言障碍
- 适合多语言环境
- 提高用户体验

### 4. **教育价值**
- 帮助用户学习不同语言的货币表达
- 促进跨文化理解
- 增加知识传播

### 5. **专业性**
- 展示对多语言支持的重视
- 体现国际化标准
- 提升产品专业度

## 英文翻译标准

### 数字单位翻译
| 本地语言 | 英文标准 | 数值 |
|---------|---------|------|
| 千/พัน/nghìn/Rb | thousand | 1,000 |
| 万/萬/만 | ten thousand | 10,000 |
| 十万 | hundred thousand | 100,000 |
| 百万/ล้าน/triệu/Jt | million | 1,000,000 |
| 千万 | ten million | 10,000,000 |
| 亿/億/억 | hundred million | 100,000,000 |
| 十亿/พันล้าน/tỷ/M | billion | 1,000,000,000 |
| 万亿/兆/조/T | trillion | 1,000,000,000,000 |

### 辅币单位翻译原则
1. **音译为主**: 如"分"(fen)、"角"(jiao)、"仙"(sin)
2. **标准名称**: 如"cents"、"pence"、"kopeck"
3. **保持原文**: 如泰文"satang"、越南文"xu"

## 构建状态

```bash
✓ 编译成功
✓ CSS: 59.86 KB (gzip: 9.13 KB)
✓ JS: 286.81 KB (gzip: 88.50 KB)
✓ 生产就绪
```

## 版本信息

- **更新日期**: 2026-01-13
- **版本**: 2.5.0
- **状态**: ✅ 已完成并测试通过
- **支持货币**: 21种
- **双语支持**: 所有非英文货币

## API 使用示例

### 配置访问

```javascript
import { CurrencyFormatter } from '@/utils/currencyFormatter';

const formatter = new CurrencyFormatter('zh-CN');

// 访问大额缩写配置(含英文)
formatter.config.abbreviations.forEach(abbr => {
  console.log(`${abbr.suffix} (${abbr.suffixEn}): ${abbr.value}`);
});
// 输出:
// 亿 (hundred million): 100000000
// 万 (ten thousand): 10000

// 访问辅币单位配置(含英文)
console.log(`${formatter.config.subunit} (${formatter.config.subunitEn})`);
// 输出: 分 (fen)

console.log(`${formatter.config.secondarySubunit} (${formatter.config.secondarySubunitEn})`);
// 输出: 角 (jiao)
```

### 界面显示检查

```javascript
// 检查是否有英文翻译
const hasEnglish = formatter.config.abbreviations.every(
  abbr => abbr.suffixEn !== undefined
);

console.log('支持双语显示:', hasEnglish); // true

// 获取所有支持双语的货币
const bilingualCurrencies = CurrencyFormatter.getSupportedLocales()
  .filter(locale => {
    const f = new CurrencyFormatter(locale.locale);
    return f.config.abbreviations?.some(a => a.suffixEn) ||
           f.config.subunitEn;
  });

console.log('支持双语的货币数量:', bilingualCurrencies.length);
```

## 未来扩展

### 可能的增强功能
1. **多语言翻译**: 支持更多语言(法语、西班牙语等)
2. **用户偏好**: 允许用户选择是否显示英文翻译
3. **翻译切换**: 提供一键切换本地语言/英文的功能
4. **语音支持**: 添加发音指南

### 可添加的货币
- 🇨🇭 瑞典克朗 (SEK)
- 🇳🇴 挪威克朗 (NOK)
- 🇩🇰 丹麦克朗 (DKK)
- 🇵🇱 波兰兹罗提 (PLN)
- 🇹🇷 土耳其里拉 (TRY)

---

**总结**: 双语显示功能在保留本地化特色的同时,通过英文翻译增强了国际化支持,提升了用户体验和产品的专业性。
