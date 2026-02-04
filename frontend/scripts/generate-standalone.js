import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取currencyFormatter.js
const currencyFormatterPath = path.join(__dirname, '../src/utils/currencyFormatter.js');
let currencyFormatterCode = fs.readFileSync(currencyFormatterPath, 'utf-8');

// 移除ES6导出语句
currencyFormatterCode = currencyFormatterCode
  .replace(/export\s+const\s+currencyFormatter[^;]+;/g, '')
  .replace(/export\s+\{[^}]+\};/g, '')
  .replace(/export\s+default\s+CurrencyFormatter;/g, '');

// 读取RevenueView.css
const cssPath = path.join(__dirname, '../src/styles/RevenueView.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// 生成HTML内容
const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>收益查看本地化 - 全球货币格式化工具</title>
  <style>
/* CSS变量定义 */
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --accent: #3b82f6;
  --border-color: #e2e8f0;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --transition-base: all 0.2s ease;
}

/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
}

#app {
  min-height: 100vh;
}

${cssContent}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${currencyFormatterCode}

// 应用逻辑
const app = {
  selectedLocale: 'en-US',
  copiedIndex: null,
  formatter: null,
  supportedLocales: CurrencyFormatter.getSupportedLocales(),
  testAmounts: [
    { value: 123.45, label: '百位' },
    { value: 1234.56, label: '千位' },
    { value: 12345.67, label: '万位' },
    { value: 123456.78, label: '十万位' },
    { value: 1234567.89, label: '百万位' },
    { value: 12345678.90, label: '千万位' },
    { value: 123456789.01, label: '亿位' },
    { value: 1234567890.12, label: '十亿位' }
  ],

  init() {
    this.formatter = new CurrencyFormatter(this.selectedLocale);
    this.render();
    this.attachEvents();
  },

  setLocale(locale) {
    this.selectedLocale = locale;
    this.formatter = new CurrencyFormatter(locale);
    this.render();
    this.attachEvents();
  },

  copyToClipboard(text, index) {
    navigator.clipboard.writeText(text);
    this.copiedIndex = index;
    this.render();
    this.attachEvents();
    setTimeout(() => {
      this.copiedIndex = null;
      this.render();
      this.attachEvents();
    }, 2000);
  },

  render() {
    const currencyInfo = this.formatter.getCurrencyInfo();
    const localeData = this.supportedLocales.find(l => l.locale === this.selectedLocale);

    document.getElementById('app').innerHTML = \`
      <div class="revenue-view">
        <div class="page-header">
          <div class="header-content">
            <h1>收益查看本地化</h1>
            <p class="subtitle">全球货币格式化展示 - 支持18种主要货币的标准格式和大额缩写</p>
          </div>
        </div>

        <div class="currency-selector-card">
          <div class="card-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <h2>选择货币</h2>
          </div>
          <div class="currency-grid">
            \${this.supportedLocales.map(locale => \`
              <button class="currency-card \${this.selectedLocale === locale.locale ? 'active' : ''}" data-locale="\${locale.locale}">
                <div class="currency-flag">\${locale.flag}</div>
                <div class="currency-info">
                  <div class="currency-country">\${locale.country}</div>
                  <div class="currency-name">\${locale.name}</div>
                  <div class="currency-code">\${locale.currency}</div>
                </div>
              </button>
            \`).join('')}
          </div>
        </div>

        <div class="info-card">
          <div class="card-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <h2>\${currencyInfo.country} - \${localeData?.name} 格式规范</h2>
          </div>
          <div class="card-content">
            <div class="info-grid">
              <div class="info-item-box">
                <span class="info-label">国家/地区</span>
                <span class="info-value">\${currencyInfo.country}</span>
              </div>
              <div class="info-item-box">
                <span class="info-label">货币名称</span>
                <span class="info-value">\${localeData?.name}</span>
              </div>
              <div class="info-item-box">
                <span class="info-label">货币代码</span>
                <span class="info-value">\${currencyInfo.currency}</span>
              </div>
              <div class="info-item-box">
                <span class="info-label">货币符号</span>
                <span class="info-value currency-symbol">\${currencyInfo.symbol}</span>
              </div>
              <div class="info-item-box">
                <span class="info-label">小数位数</span>
                <span class="info-value">\${currencyInfo.decimals} 位</span>
              </div>
              \${currencyInfo.subunit ? \`
                <div class="info-item-box">
                  <span class="info-label">辅币单位</span>
                  <span class="info-value">
                    \${currencyInfo.secondarySubunit ? \`\${currencyInfo.secondarySubunit} / \${currencyInfo.subunit}\` : currencyInfo.subunit}
                  </span>
                </div>
              \` : ''}
            </div>

            \${this.formatter.config.abbreviations && this.formatter.config.abbreviations.length > 0 ? \`
              <div class="conversion-section">
                <h3 class="section-title">大额缩写进位关系</h3>
                <div class="conversion-list">
                  \${this.formatter.config.abbreviations.slice().reverse().map(abbr => \`
                    <div class="conversion-item">
                      <span class="conversion-unit">
                        \${abbr.suffix.trim()}
                        \${abbr.suffixEn ? \`<span class="unit-en"> (\${abbr.suffixEn})</span>\` : ''}
                      </span>
                      <span class="conversion-arrow">→</span>
                      <span class="conversion-value">
                        \${abbr.value >= 1e12 ? '1,000,000,000,000' :
                          abbr.value >= 1e9 ? '1,000,000,000' :
                          abbr.value >= 1e8 ? '100,000,000' :
                          abbr.value >= 1e7 ? '10,000,000' :
                          abbr.value >= 1e6 ? '1,000,000' :
                          abbr.value >= 1e5 ? '100,000' :
                          abbr.value >= 1e4 ? '10,000' : '1,000'}
                      </span>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            \${currencyInfo.subunit ? \`
              <div class="conversion-section">
                <h3 class="section-title">辅币单位进位关系</h3>
                <div class="conversion-list">
                  \${currencyInfo.secondarySubunit ? \`
                    <div class="conversion-item">
                      <span class="conversion-unit">1 主币</span>
                      <span class="conversion-arrow">=</span>
                      <span class="conversion-value">
                        \${this.formatter.config.secondarySubunitDivider} \${currencyInfo.secondarySubunit}
                        \${this.formatter.config.secondarySubunitEn ? \`<span class="unit-en"> (\${this.formatter.config.secondarySubunitEn})</span>\` : ''}
                      </span>
                    </div>
                    <div class="conversion-item">
                      <span class="conversion-unit">
                        1 \${currencyInfo.secondarySubunit}
                        \${this.formatter.config.secondarySubunitEn ? \`<span class="unit-en"> (\${this.formatter.config.secondarySubunitEn})</span>\` : ''}
                      </span>
                      <span class="conversion-arrow">=</span>
                      <span class="conversion-value">
                        \${this.formatter.config.subunitDivider / this.formatter.config.secondarySubunitDivider} \${currencyInfo.subunit}
                        \${this.formatter.config.subunitEn ? \`<span class="unit-en"> (\${this.formatter.config.subunitEn})</span>\` : ''}
                      </span>
                    </div>
                  \` : ''}
                  <div class="conversion-item">
                    <span class="conversion-unit">1 主币</span>
                    <span class="conversion-arrow">=</span>
                    <span class="conversion-value">
                      \${this.formatter.config.subunitDivider} \${currencyInfo.subunit}
                      \${this.formatter.config.subunitEn ? \`<span class="unit-en"> (\${this.formatter.config.subunitEn})</span>\` : ''}
                    </span>
                  </div>
                </div>
              </div>
            \` : ''}
          </div>
        </div>

        <div class="format-table-card">
          <div class="card-header">
            <h2>格式化对照表</h2>
            <span class="hint">点击金额可复制</span>
          </div>
          <div class="table-container">
            <table class="format-table">
              <thead>
                <tr>
                  <th>数量级</th>
                  <th>原始金额</th>
                  <th>完整格式</th>
                  <th>大额缩写</th>
                  \${currencyInfo.subunit ? '<th>辅币格式</th>' : ''}
                </tr>
              </thead>
              <tbody>
                \${this.testAmounts.map((amount, index) => {
                  const fullFormat = this.formatter.format(amount.value, { useCode: true });
                  const abbrevFormat = this.formatter.formatAbbreviated(amount.value, { useCode: true });
                  const subunitFormat = currencyInfo.subunit
                    ? (currencyInfo.secondarySubunit
                        ? this.formatter.formatSubunitFull(amount.value)
                        : this.formatter.formatSubunit(amount.value))
                    : null;

                  return \`
                    <tr>
                      <td class="amount-level">\${amount.label}</td>
                      <td class="raw-amount">\${amount.value.toLocaleString('en-US')}</td>
                      <td class="formatted-amount">
                        <button class="copy-btn" data-copy="\${fullFormat}" data-index="full-\${index}">
                          <span class="amount-text">\${fullFormat}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="copy-icon \${this.copiedIndex === \`full-\${index}\` ? 'success' : ''}">
                            \${this.copiedIndex === \`full-\${index}\`
                              ? '<polyline points="20 6 9 17 4 12"></polyline>'
                              : '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'}
                          </svg>
                        </button>
                      </td>
                      <td class="abbreviated-amount">
                        <button class="copy-btn" data-copy="\${abbrevFormat}" data-index="abbrev-\${index}">
                          <span class="amount-text highlight">\${abbrevFormat}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="copy-icon \${this.copiedIndex === \`abbrev-\${index}\` ? 'success' : ''}">
                            \${this.copiedIndex === \`abbrev-\${index}\`
                              ? '<polyline points="20 6 9 17 4 12"></polyline>'
                              : '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'}
                          </svg>
                        </button>
                      </td>
                      \${currencyInfo.subunit ? \`
                        <td class="subunit-amount">
                          <button class="copy-btn" data-copy="\${subunitFormat}" data-index="subunit-\${index}">
                            <span class="amount-text">\${subunitFormat}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="copy-icon \${this.copiedIndex === \`subunit-\${index}\` ? 'success' : ''}">
                              \${this.copiedIndex === \`subunit-\${index}\`
                                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                                : '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'}
                            </svg>
                          </button>
                        </td>
                      \` : ''}
                    </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="usage-card">
          <div class="card-header">
            <h2>格式化说明</h2>
          </div>
          <div class="card-content">
            <div class="usage-grid">
              <div class="usage-item">
                <h3>完整格式</h3>
                <ul>
                  <li>显示完整的金额数值</li>
                  <li>包含千位分隔符</li>
                  <li>保留指定的小数位数</li>
                  <li>适用于需要精确显示的场景</li>
                </ul>
              </div>
              <div class="usage-item">
                <h3>大额缩写</h3>
                <ul>
                  <li>自动选择合适的单位缩写</li>
                  <li>保留2位小数确保精度</li>
                  <li>符合各国本地化习惯</li>
                  <li>适用于统计图表和概览</li>
                </ul>
              </div>
              <div class="usage-item">
                <h3>缩写规则</h3>
                <ul>
                  <li><strong>美国/英国</strong>: K(千) · M(百万) · B(十亿) · T(万亿)</li>
                  <li><strong>印度</strong>: K(千) · L(十万) · Cr(千万)</li>
                  <li><strong>泰国</strong>: k(千) · L(百万) · พันล้าน(十亿)</li>
                  <li><strong>越南</strong>: k(千) · tr(百万) · tỷ(十亿)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    \`;
  },

  attachEvents() {
    // 货币选择事件
    document.querySelectorAll('.currency-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const locale = e.currentTarget.getAttribute('data-locale');
        this.setLocale(locale);
      });
    });

    // 复制按钮事件
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.currentTarget.getAttribute('data-copy');
        const index = e.currentTarget.getAttribute('data-index');
        this.copyToClipboard(text, index);
      });
    });
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
  </script>
</body>
</html>`;

// 写入文件
const outputPath = path.join(__dirname, '../public/standalone-currency-formatter.html');

// 确保public目录存在
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, htmlContent, 'utf-8');

console.log('✅ 独立HTML文件已生成:', outputPath);
