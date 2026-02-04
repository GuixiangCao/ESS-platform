import React, { useState } from 'react';
import { DollarSign, Globe, Copy, Check, Download } from 'lucide-react';
import { CurrencyFormatter } from '../utils/currencyFormatter';
import '../styles/RevenueView.css';

const RevenueView = () => {
  const [selectedLocale, setSelectedLocale] = useState('en-US');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // 获取支持的货币列表
  const supportedLocales = CurrencyFormatter.getSupportedLocales();

  // 测试金额 - 不同数量级
  const testAmounts = [
    { value: 123.45, label: '百位' },
    { value: 1234.56, label: '千位' },
    { value: 12345.67, label: '万位' },
    { value: 123456.78, label: '十万位' },
    { value: 1234567.89, label: '百万位' },
    { value: 12345678.90, label: '千万位' },
    { value: 123456789.01, label: '亿位' },
    { value: 1234567890.12, label: '十亿位' },
  ];

  // 复制到剪贴板
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 下载独立HTML页面
  const downloadPage = () => {
    fetch('/standalone-currency-formatter.html')
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `货币格式化工具_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        alert('下载失败,请稍后重试');
        console.error(err);
      });
  };

  return (
    <div className="revenue-view">
      {/* 页头 */}
      <div className="page-header">
        <div className="header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1>收益查看本地化</h1>
              <p className="subtitle">全球货币格式化展示 - 支持18种主要货币的标准格式和大额缩写</p>
            </div>
            <button
              onClick={downloadPage}
              className="download-btn"
            >
              <Download size={18} />
              下载独立页面
            </button>
          </div>
        </div>
      </div>

      {/* 货币选择器 */}
      <div className="currency-selector-card">
        <div className="card-header">
          <Globe size={20} />
          <h2>选择货币</h2>
        </div>
        <div className="currency-grid">
          {supportedLocales.map(locale => {
            return (
              <button
                key={locale.locale}
                className={`currency-card ${selectedLocale === locale.locale ? 'active' : ''}`}
                onClick={() => setSelectedLocale(locale.locale)}
              >
                <div className="currency-flag">{locale.flag}</div>
                <div className="currency-info">
                  <div className="currency-country">{locale.country}</div>
                  <div className="currency-name">{locale.name}</div>
                  <div className="currency-code">{locale.currency}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 格式化示例 */}
      <FormatExamples
        locale={selectedLocale}
        testAmounts={testAmounts}
        onCopy={copyToClipboard}
        copiedIndex={copiedIndex}
      />
    </div>
  );
};

// 格式化示例组件
const FormatExamples = ({ locale, testAmounts, onCopy, copiedIndex }) => {
  const formatter = new CurrencyFormatter(locale);
  const currencyInfo = formatter.getCurrencyInfo();
  const localeData = supportedLocales.find(l => l.locale === locale);

  return (
    <>
      {/* 货币信息卡片 */}
      <div className="info-card">
        <div className="card-header">
          <DollarSign size={20} />
          <h2>{currencyInfo.country} - {localeData?.name} 格式规范</h2>
        </div>
        <div className="card-content">
          <div className="info-grid">
            <div className="info-item-box">
              <span className="info-label">国家/地区</span>
              <span className="info-value">{currencyInfo.country}</span>
            </div>
            <div className="info-item-box">
              <span className="info-label">货币名称</span>
              <span className="info-value">{localeData?.name}</span>
            </div>
            <div className="info-item-box">
              <span className="info-label">货币代码</span>
              <span className="info-value">{currencyInfo.currency}</span>
            </div>
            <div className="info-item-box">
              <span className="info-label">货币符号</span>
              <span className="info-value currency-symbol">{currencyInfo.symbol}</span>
            </div>
            <div className="info-item-box">
              <span className="info-label">小数位数</span>
              <span className="info-value">{currencyInfo.decimals} 位</span>
            </div>
            {currencyInfo.subunit && (
              <div className="info-item-box">
                <span className="info-label">辅币单位</span>
                <span className="info-value">
                  {currencyInfo.secondarySubunit
                    ? `${currencyInfo.secondarySubunit} / ${currencyInfo.subunit}`
                    : currencyInfo.subunit
                  }
                </span>
              </div>
            )}
          </div>

          {/* 缩写单位进位关系 */}
          {formatter.config.abbreviations && formatter.config.abbreviations.length > 0 && (
            <div className="conversion-section">
              <h3 className="section-title">大额缩写进位关系</h3>
              <div className="conversion-list">
                {formatter.config.abbreviations.slice().reverse().map((abbr, index) => (
                  <div key={index} className="conversion-item">
                    <span className="conversion-unit">
                      {abbr.suffix.trim()}
                      {abbr.suffixEn && <span className="unit-en"> ({abbr.suffixEn})</span>}
                    </span>
                    <span className="conversion-arrow">→</span>
                    <span className="conversion-value">
                      {abbr.value >= 1e12 ? '1,000,000,000,000' :
                       abbr.value >= 1e9 ? '1,000,000,000' :
                       abbr.value >= 1e8 ? '100,000,000' :
                       abbr.value >= 1e7 ? '10,000,000' :
                       abbr.value >= 1e6 ? '1,000,000' :
                       abbr.value >= 1e5 ? '100,000' :
                       abbr.value >= 1e4 ? '10,000' :
                       '1,000'}
                    </span>
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
                {currencyInfo.secondarySubunit && (
                  <>
                    <div className="conversion-item">
                      <span className="conversion-unit">1 主币</span>
                      <span className="conversion-arrow">=</span>
                      <span className="conversion-value">
                        {formatter.config.secondarySubunitDivider} {currencyInfo.secondarySubunit}
                        {formatter.config.secondarySubunitEn && (
                          <span className="unit-en"> ({formatter.config.secondarySubunitEn})</span>
                        )}
                      </span>
                    </div>
                    <div className="conversion-item">
                      <span className="conversion-unit">
                        1 {currencyInfo.secondarySubunit}
                        {formatter.config.secondarySubunitEn && (
                          <span className="unit-en"> ({formatter.config.secondarySubunitEn})</span>
                        )}
                      </span>
                      <span className="conversion-arrow">=</span>
                      <span className="conversion-value">
                        {formatter.config.subunitDivider / formatter.config.secondarySubunitDivider} {currencyInfo.subunit}
                        {formatter.config.subunitEn && (
                          <span className="unit-en"> ({formatter.config.subunitEn})</span>
                        )}
                      </span>
                    </div>
                  </>
                )}
                <div className="conversion-item">
                  <span className="conversion-unit">1 主币</span>
                  <span className="conversion-arrow">=</span>
                  <span className="conversion-value">
                    {formatter.config.subunitDivider} {currencyInfo.subunit}
                    {formatter.config.subunitEn && (
                      <span className="unit-en"> ({formatter.config.subunitEn})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 格式化对照表 */}
      <div className="format-table-card">
        <div className="card-header">
          <h2>格式化对照表</h2>
          <span className="hint">点击金额可复制</span>
        </div>
        <div className="table-container">
          <table className="format-table">
            <thead>
              <tr>
                <th>数量级</th>
                <th>原始金额</th>
                <th>完整格式</th>
                <th>大额缩写</th>
                {currencyInfo.subunit && <th>辅币格式</th>}
              </tr>
            </thead>
            <tbody>
              {testAmounts.map((amount, index) => {
                const fullFormat = formatter.format(amount.value, { useCode: true });
                const abbrevFormat = formatter.formatAbbreviated(amount.value, { useCode: true });
                const subunitFormat = currencyInfo.subunit
                  ? (currencyInfo.secondarySubunit
                      ? formatter.formatSubunitFull(amount.value)
                      : formatter.formatSubunit(amount.value))
                  : null;

                return (
                  <tr key={index}>
                    <td className="amount-level">{amount.label}</td>
                    <td className="raw-amount">{amount.value.toLocaleString('en-US')}</td>
                    <td className="formatted-amount">
                      <button
                        className="copy-btn"
                        onClick={() => onCopy(fullFormat, `full-${index}`)}
                        title="点击复制"
                      >
                        <span className="amount-text">{fullFormat}</span>
                        {copiedIndex === `full-${index}` ? (
                          <Check size={16} className="copy-icon success" />
                        ) : (
                          <Copy size={16} className="copy-icon" />
                        )}
                      </button>
                    </td>
                    <td className="abbreviated-amount">
                      <button
                        className="copy-btn"
                        onClick={() => onCopy(abbrevFormat, `abbrev-${index}`)}
                        title="点击复制"
                      >
                        <span className="amount-text highlight">{abbrevFormat}</span>
                        {copiedIndex === `abbrev-${index}` ? (
                          <Check size={16} className="copy-icon success" />
                        ) : (
                          <Copy size={16} className="copy-icon" />
                        )}
                      </button>
                    </td>
                    {currencyInfo.subunit && (
                      <td className="subunit-amount">
                        <button
                          className="copy-btn"
                          onClick={() => onCopy(subunitFormat, `subunit-${index}`)}
                          title="点击复制"
                        >
                          <span className="amount-text">{subunitFormat}</span>
                          {copiedIndex === `subunit-${index}` ? (
                            <Check size={16} className="copy-icon success" />
                          ) : (
                            <Copy size={16} className="copy-icon" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="usage-card">
        <div className="card-header">
          <h2>格式化说明</h2>
        </div>
        <div className="card-content">
          <div className="usage-grid">
            <div className="usage-item">
              <h3>完整格式</h3>
              <ul>
                <li>显示完整的金额数值</li>
                <li>包含千位分隔符</li>
                <li>保留指定的小数位数</li>
                <li>适用于需要精确显示的场景</li>
              </ul>
            </div>
            <div className="usage-item">
              <h3>大额缩写</h3>
              <ul>
                <li>自动选择合适的单位缩写</li>
                <li>保留2位小数确保精度</li>
                <li>符合各国本地化习惯</li>
                <li>适用于统计图表和概览</li>
              </ul>
            </div>
            <div className="usage-item">
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
    </>
  );
};

// 导出支持的区域列表供组件使用
const supportedLocales = CurrencyFormatter.getSupportedLocales();

export default RevenueView;
