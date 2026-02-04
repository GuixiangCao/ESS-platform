/**
 * 全球货币格式化工具
 * 支持各国货币的显示规范、大额缩写和精度控制
 */

// 货币配置表 - 覆盖全球主要国家和地区
const CURRENCY_CONFIGS = {
  // 美国 - 美元
  'en-US': {
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    name: 'US Dollar',
    country: '美国',
    subunit: 'cents',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e12, suffix: 'T', decimals: 2 }, // Trillion
      { value: 1e9, suffix: 'B', decimals: 2 },  // Billion
      { value: 1e6, suffix: 'M', decimals: 2 },  // Million
      { value: 1e3, suffix: 'K', decimals: 2 },  // Thousand
    ]
  },

  // 欧元区
  'de-DE': {
    currency: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    name: 'Euro',
    country: '欧元区',
    subunit: 'cents',
    subunitEn: 'cents',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e12, suffix: 'T', decimals: 2 },  // Trillion
      { value: 1e9, suffix: 'B', decimals: 2 },   // Billion
      { value: 1e6, suffix: 'M', decimals: 2 },   // Million
      { value: 1e3, suffix: 'K', decimals: 2 },   // Thousand
    ]
  },

  // 英国 - 英镑
  'en-GB': {
    currency: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    name: 'Pound Sterling',
    country: '英国',
    subunit: 'pence',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e12, suffix: 'T', decimals: 2 },
      { value: 1e9, suffix: 'bn', decimals: 2 },
      { value: 1e6, suffix: 'm', decimals: 2 },
      { value: 1e3, suffix: 'k', decimals: 2 },
    ]
  },

  // 印度 - 卢比
  'en-IN': {
    currency: 'INR',
    symbol: '₹',
    flag: '🇮🇳',
    name: 'Rupee',
    country: '印度',
    subunit: 'paise',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e7, suffix: 'Cr', decimals: 2 },  // Crore
      { value: 1e5, suffix: 'L', decimals: 2 },   // Lakh
      { value: 1e3, suffix: 'K', decimals: 2 },
    ]
  },

  // 俄罗斯 - 卢布
  'ru-RU': {
    currency: 'RUB',
    symbol: '₽',
    flag: '🇷🇺',
    name: 'Рубль',
    country: '俄罗斯',
    subunit: 'копейка',
    subunitEn: 'kopeck',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    symbolPosition: 'after',
    abbreviations: [
      { value: 1e12, suffix: ' трлн', suffixEn: 'trillion', decimals: 2 },
      { value: 1e9, suffix: ' млрд', suffixEn: 'billion', decimals: 2 },
      { value: 1e6, suffix: ' млн', suffixEn: 'million', decimals: 2 },
      { value: 1e3, suffix: ' тыс', suffixEn: 'thousand', decimals: 2 },
    ]
  },

  // 巴西 - 雷亚尔
  'pt-BR': {
    currency: 'BRL',
    symbol: 'R$',
    flag: '🇧🇷',
    name: 'Real',
    country: '巴西',
    subunit: 'centavos',
    subunitEn: 'centavos',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e12, suffix: ' tri', suffixEn: 'trillion', decimals: 2 },
      { value: 1e9, suffix: ' bi', suffixEn: 'billion', decimals: 2 },
      { value: 1e6, suffix: ' mi', suffixEn: 'million', decimals: 2 },
      { value: 1e3, suffix: ' mil', suffixEn: 'thousand', decimals: 2 },
    ]
  },

  // 澳大利亚 - 澳元
  'en-AU': {
    currency: 'AUD',
    symbol: 'A$',
    flag: '🇦🇺',
    name: 'Australian Dollar',
    country: '澳大利亚',
    subunit: 'cents',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: 'B', decimals: 2 },
      { value: 1e6, suffix: 'M', decimals: 2 },
      { value: 1e3, suffix: 'K', decimals: 2 },
    ]
  },

  // 加拿大 - 加元
  'en-CA': {
    currency: 'CAD',
    symbol: 'C$',
    flag: '🇨🇦',
    name: 'Canadian Dollar',
    country: '加拿大',
    subunit: 'cents',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: 'B', decimals: 2 },
      { value: 1e6, suffix: 'M', decimals: 2 },
      { value: 1e3, suffix: 'K', decimals: 2 },
    ]
  },

  // 瑞士 - 瑞士法郎
  'de-CH': {
    currency: 'CHF',
    symbol: 'CHF',
    flag: '🇨🇭',
    name: 'Schweizer Franken',
    country: '瑞士',
    subunit: 'Rappen',
    subunitEn: 'rappen',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: "'",
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: ' Mrd.', suffixEn: 'billion', decimals: 2 },
      { value: 1e6, suffix: ' Mio.', suffixEn: 'million', decimals: 2 },
      { value: 1e3, suffix: ' Tsd.', suffixEn: 'thousand', decimals: 2 },
    ]
  },

  // 新加坡 - 新元
  'en-SG': {
    currency: 'SGD',
    symbol: 'S$',
    flag: '🇸🇬',
    name: 'Singapore Dollar',
    country: '新加坡',
    subunit: 'cents',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: 'B', decimals: 2 },
      { value: 1e6, suffix: 'M', decimals: 2 },
      { value: 1e3, suffix: 'K', decimals: 2 },
    ]
  },

  // 中国香港 - 港币
  'zh-HK': {
    currency: 'HKD',
    symbol: 'HK$',
    flag: '🇭🇰',
    name: '港幣',
    country: '中國香港',
    subunit: '仙',
    subunitEn: 'sin',
    subunitDivider: 100,
    secondarySubunit: '毫',
    secondarySubunitEn: 'ho',
    secondarySubunitDivider: 10,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e8, suffix: '億', suffixEn: 'hundred million', decimals: 2 },
      { value: 1e4, suffix: '萬', suffixEn: 'ten thousand', decimals: 2 },
    ]
  },

  // 阿联酋 - 迪拉姆
  'ar-AE': {
    currency: 'AED',
    symbol: 'د.إ',
    flag: '🇦🇪',
    name: 'Dirham',
    country: '阿联酋',
    subunit: 'fils',
    subunitEn: 'fils',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: 'B', suffixEn: 'billion', decimals: 2 },
      { value: 1e6, suffix: 'M', suffixEn: 'million', decimals: 2 },
      { value: 1e3, suffix: 'K', suffixEn: 'thousand', decimals: 2 },
    ]
  },

  // 印度尼西亚 - 印尼盾
  'id-ID': {
    currency: 'IDR',
    symbol: 'Rp',
    flag: '🇮🇩',
    name: 'Rupiah',
    country: '印度尼西亚',
    subunit: 'sen',
    subunitEn: 'sen',
    subunitDivider: 100,
    decimals: 0, // 印尼盾通常不使用小数
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e12, suffix: ' T', suffixEn: 'trillion', decimals: 2 },  // Triliun
      { value: 1e9, suffix: ' M', suffixEn: 'billion', decimals: 2 },   // Miliar
      { value: 1e6, suffix: ' Jt', suffixEn: 'million', decimals: 2 },  // Juta
      { value: 1e3, suffix: ' Rb', suffixEn: 'thousand', decimals: 2 },  // Ribu
    ]
  },

  // 泰国 - 泰铢
  'th-TH': {
    currency: 'THB',
    symbol: '฿',
    flag: '🇹🇭',
    name: 'Baht',
    country: '泰国',
    subunit: 'สตางค์',
    subunitEn: 'satang',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: ' พันล้าน', suffixEn: 'billion', decimals: 2 },  // 十亿
      { value: 1e6, suffix: 'L', suffixEn: 'million', decimals: 2 },          // 百万 (ล้าน)
      { value: 1e3, suffix: 'k', suffixEn: 'thousand', decimals: 2 },         // 千 (พัน)
    ]
  },

  // 越南 - 越南盾
  'vi-VN': {
    currency: 'VND',
    symbol: '₫',
    flag: '🇻🇳',
    name: 'Đồng',
    country: '越南',
    subunit: 'xu',
    subunitEn: 'xu',
    subunitDivider: 10,
    decimals: 0, // 越南盾通常不使用小数
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    abbreviations: [
      { value: 1e9, suffix: ' tỷ', suffixEn: 'billion', decimals: 2 },    // 十亿
      { value: 1e6, suffix: ' tr', suffixEn: 'million', decimals: 2 },    // 百万 (triệu 简写)
      { value: 1e3, suffix: 'k', suffixEn: 'thousand', decimals: 2 },     // 千
    ]
  },

  // 马来西亚 - 林吉特
  'ms-MY': {
    currency: 'MYR',
    symbol: 'RM',
    flag: '🇲🇾',
    name: 'Ringgit',
    country: '马来西亚',
    subunit: 'sen',
    subunitEn: 'sen',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: ' B', suffixEn: 'billion', decimals: 2 },  // Billion
      { value: 1e6, suffix: ' M', suffixEn: 'million', decimals: 2 },  // Million
      { value: 1e3, suffix: ' K', suffixEn: 'thousand', decimals: 2 },  // Thousand
    ]
  },

  // 菲律宾 - 比索
  'fil-PH': {
    currency: 'PHP',
    symbol: '₱',
    flag: '🇵🇭',
    name: 'Peso',
    country: '菲律宾',
    subunit: 'sentimo',
    subunitEn: 'sentimo',
    subunitDivider: 100,
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    abbreviations: [
      { value: 1e9, suffix: ' B', suffixEn: 'billion', decimals: 2 },
      { value: 1e6, suffix: ' M', suffixEn: 'million', decimals: 2 },
      { value: 1e3, suffix: ' K', suffixEn: 'thousand', decimals: 2 },
    ]
  },
};

/**
 * 货币格式化类
 */
class CurrencyFormatter {
  constructor(locale = 'en-US') {
    this.locale = locale;
    this.config = CURRENCY_CONFIGS[locale] || CURRENCY_CONFIGS['en-US'];
  }

  /**
   * 设置区域
   */
  setLocale(locale) {
    this.locale = locale;
    this.config = CURRENCY_CONFIGS[locale] || CURRENCY_CONFIGS['en-US'];
    return this;
  }

  /**
   * 格式化数字 - 添加千位分隔符
   */
  formatNumber(value, decimals = this.config.decimals) {
    if (isNaN(value) || value === null || value === undefined) {
      return '0';
    }

    const fixed = Number(value).toFixed(decimals);
    const [integerPart, decimalPart] = fixed.split('.');

    // 添加千位分隔符
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      this.config.thousandsSeparator
    );

    if (decimals > 0 && decimalPart) {
      return `${formattedInteger}${this.config.decimalSeparator}${decimalPart}`;
    }

    return formattedInteger;
  }

  /**
   * 格式化货币 - 完整显示
   */
  format(value, options = {}) {
    const {
      showSymbol = true,
      decimals = this.config.decimals,
      showSubunit = false,
      useCode = false
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

  /**
   * 格式化货币 - 大额缩写
   * 保持可读性：小数点后保留指定位数
   */
  formatAbbreviated(value, options = {}) {
    const {
      showSymbol = true,
      forceDecimals = true,
      useCode = false
    } = options;

    if (isNaN(value) || value === null || value === undefined) {
      return this.format(0, options);
    }

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    // 查找合适的缩写级别
    const abbreviation = this.config.abbreviations.find(
      abbr => absValue >= abbr.value
    );

    if (!abbreviation) {
      // 如果金额不够大，使用标准格式
      return this.format(value, options);
    }

    // 计算缩写后的数值
    const abbreviated = absValue / abbreviation.value;
    const decimals = forceDecimals ? abbreviation.decimals : 0;

    // 格式化缩写数值，保留精度
    const formattedValue = abbreviated.toFixed(decimals);

    // 移除尾随的零
    const cleanValue = forceDecimals
      ? formattedValue
      : parseFloat(formattedValue).toString();

    // 添加千位分隔符（如果缩写后的整数部分仍然很大）
    const [intPart, decPart] = cleanValue.split('.');
    const formattedInt = intPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      this.config.thousandsSeparator
    );

    const finalValue = decPart
      ? `${formattedInt}${this.config.decimalSeparator}${decPart}`
      : formattedInt;

    const result = `${sign}${finalValue}${abbreviation.suffix}`;

    if (!showSymbol) {
      return result;
    }

    // 使用货币代码或符号
    const displaySymbol = useCode ? this.config.currency : this.config.symbol;

    // 根据符号位置返回格式化结果
    if (this.config.symbolPosition === 'before') {
      return useCode ? `${displaySymbol} ${result}` : `${displaySymbol}${result}`;
    } else {
      return `${result} ${displaySymbol}`;
    }
  }

  /**
   * 智能格式化 - 根据金额大小自动选择格式
   */
  formatSmart(value, options = {}) {
    const { threshold = 10000 } = options;
    const absValue = Math.abs(value);

    // 小额使用完整格式，大额使用缩写
    if (absValue < threshold) {
      return this.format(value, options);
    } else {
      return this.formatAbbreviated(value, options);
    }
  }

  /**
   * 格式化为辅币单位(如:分、cents)
   * 支持二级辅币单位(如人民币的角和分)
   */
  formatSubunit(value, options = {}) {
    const { showSymbol = true, useSecondary = false } = options;

    if (!this.config.subunit) {
      return this.format(value, options);
    }

    // 如果有二级辅币单位(如角)且用户指定使用
    if (useSecondary && this.config.secondarySubunit) {
      const secondaryValue = Math.round(value * this.config.secondarySubunitDivider);
      const formatted = this.formatNumber(secondaryValue, 0);

      if (!showSymbol) {
        return formatted;
      }

      return `${formatted} ${this.config.secondarySubunit}`;
    }

    // 默认使用主辅币单位(如分)
    const subunitValue = Math.round(value * this.config.subunitDivider);
    const formatted = this.formatNumber(subunitValue, 0);

    if (!showSymbol) {
      return formatted;
    }

    return `${formatted} ${this.config.subunit}`;
  }

  /**
   * 格式化为完整辅币表示(如:1.23元 = 1元2角3分)
   */
  formatSubunitFull(value) {
    if (!this.config.subunit) {
      return this.format(value);
    }

    const integerPart = Math.floor(value);
    const decimalPart = value - integerPart;

    // 没有小数部分,直接返回
    if (decimalPart === 0) {
      return this.format(integerPart);
    }

    let result = '';

    // 整数部分
    if (integerPart > 0) {
      result += this.format(integerPart);
    }

    // 如果有二级辅币单位(如角)
    if (this.config.secondarySubunit && this.config.secondarySubunitDivider) {
      const totalCents = Math.round(decimalPart * this.config.subunitDivider);
      const secondaryUnits = Math.floor(totalCents / (this.config.subunitDivider / this.config.secondarySubunitDivider));
      const primaryUnits = totalCents % (this.config.subunitDivider / this.config.secondarySubunitDivider);

      if (secondaryUnits > 0) {
        result += (result ? ' ' : '') + `${secondaryUnits}${this.config.secondarySubunit}`;
      }
      if (primaryUnits > 0) {
        result += (result ? ' ' : '') + `${primaryUnits}${this.config.subunit}`;
      }
    } else {
      // 只有主辅币单位(如 cents)
      const subunitValue = Math.round(decimalPart * this.config.subunitDivider);
      if (subunitValue > 0) {
        result += (result ? ' ' : '') + `${subunitValue}${this.config.subunit}`;
      }
    }

    return result || this.format(0);
  }

  /**
   * 获取货币信息
   */
  getCurrencyInfo() {
    return {
      locale: this.locale,
      currency: this.config.currency,
      symbol: this.config.symbol,
      name: this.config.name,
      country: this.config.country,
      subunit: this.config.subunit,
      secondarySubunit: this.config.secondarySubunit,
      decimals: this.config.decimals
    };
  }

  /**
   * 获取所有支持的区域列表
   */
  static getSupportedLocales() {
    return Object.keys(CURRENCY_CONFIGS).map(locale => ({
      locale,
      currency: CURRENCY_CONFIGS[locale].currency,
      symbol: CURRENCY_CONFIGS[locale].symbol,
      flag: CURRENCY_CONFIGS[locale].flag,
      name: CURRENCY_CONFIGS[locale].name,
      country: CURRENCY_CONFIGS[locale].country
    }));
  }
}

// 导出默认实例和类
export const currencyFormatter = new CurrencyFormatter('en-US');
export { CurrencyFormatter };
export default CurrencyFormatter;
