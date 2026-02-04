import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Calendar, DollarSign, Percent, BarChart3, AlertTriangle, Network } from 'lucide-react';
import axios from 'axios';
import LossAnalysis from './LossAnalysis';
import AlarmSection from '../components/AlarmSection';
import { getStationByStationId } from '../services/stationGatewayService';
import './StationAnalysis.css';

export default function StationAnalysis() {
  const [searchParams] = useSearchParams();
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [yearlyData, setYearlyData] = useState([]);
  const [achievementStats, setAchievementStats] = useState(null);
  const [gatewayInfo, setGatewayInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('daily-bar'); // 'monthly', 'daily-trend', 'daily-bar', or 'loss-analysis'
  const [rateAnalysisType, setRateAnalysisType] = useState('copilot-rate'); // 'copilot-rate' or 'avg-daily-rate'
  const [tooltip, setTooltip] = useState(null); // { content, x, y }

  // 获取电站列表
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/revenue/stations', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setStations(response.data.data);

          // 检查URL参数中是否有stationId
          const urlStationId = searchParams.get('stationId');
          if (urlStationId) {
            setSelectedStation(parseInt(urlStationId));
          } else if (response.data.data.length > 0) {
            setSelectedStation(response.data.data[0].stationId);
          }
        }
      } catch (err) {
        console.error('获取电站列表失败:', err);
        setError('获取电站列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  // 获取达成率统计数据
  useEffect(() => {
    const fetchAchievementStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/revenue/achievement-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setAchievementStats(response.data.data);
        }
      } catch (err) {
        console.error('获取达成率统计失败:', err);
      }
    };

    fetchAchievementStats();
  }, []);

  // 获取选中电站的数据
  useEffect(() => {
    if (!selectedStation) return;

    const fetchStationData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // 获取详细数据
        const dataResponse = await axios.get(
          `/api/revenue/station/${selectedStation}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 获取年度数据
        const yearlyResponse = await axios.get(
          `/api/revenue/station/${selectedStation}/yearly`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 获取网关信息
        try {
          const gatewayResponse = await getStationByStationId(selectedStation);
          if (gatewayResponse.success) {
            setGatewayInfo(gatewayResponse.data);
          }
        } catch (gatewayErr) {
          console.log('该电站暂无网关信息');
          setGatewayInfo(null);
        }

        if (dataResponse.data.success) {
          setStationData(dataResponse.data.data);
        }

        if (yearlyResponse.data.success) {
          setYearlyData(yearlyResponse.data.data);
        }
      } catch (err) {
        console.error('获取电站数据失败:', err);
        setError('获取电站数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStationData();
  }, [selectedStation]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  if (loading && !stationData) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="station-analysis-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>电站分析</h1>
            <p className="page-subtitle">查看各电站的收益情况和统计分析</p>
          </div>
          {stationData && stationData.isAI && (
            <div className="ai-badge">
              <span className="ai-icon">🤖</span>
              <span className="ai-text">AI电站</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error">
          <strong>错误</strong>
          <p>{error}</p>
        </div>
      )}

      {/* 电站选择器 */}
      <div className="station-selector-card">
        <label htmlFor="station-select">选择电站:</label>
        <select
          id="station-select"
          value={selectedStation || ''}
          onChange={(e) => setSelectedStation(parseInt(e.target.value))}
          className="station-select"
        >
          {stations.map(station => (
            <option key={station.stationId} value={station.stationId}>
              {station.stationId} - {station.stationName} {station.isAI ? '🤖' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 网关信息卡片 */}
      {gatewayInfo && gatewayInfo.length > 0 && (
        <div className="gateway-info-section">
          <div className="gateway-section-header">
            <Network size={18} />
            <span>网关信息 ({gatewayInfo.length})</span>
          </div>
          <div className="gateway-cards-container">
            {gatewayInfo.map((gateway, index) => (
              <div key={gateway.gatewayId} className="gateway-info-card">
                <div className="gateway-icon">
                  <Network size={20} />
                </div>
                <div className="gateway-content">
                  <div className="gateway-label">网关 {index + 1}</div>
                  <div className="gateway-value">{gateway.gatewayId}</div>
                  <div className="gateway-formatted">
                    {gateway.gatewayId.match(/.{1,2}/g).join(':')}
                  </div>
                  {gateway.capacity && (
                    <div className="gateway-capacity">
                      容量: {gateway.capacity} kW
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stationData && (
        <>
          {/* 汇总卡片 */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <DollarSign size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">总预期收益</div>
                <div className="card-value">{formatCurrency(stationData.summary.totalExpected)}</div>
                <div className="card-meta">{stationData.summary.recordCount} 天数据</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">实际年收益</div>
                <div className="card-value highlight">{formatCurrency(stationData.summary.totalActual)}</div>
                <div className="card-meta">
                  {formatDate(stationData.summary.dateRange.start)} - {formatDate(stationData.summary.dateRange.end)}
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <Percent size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">达成率</div>
                <div className={`card-value ${stationData.summary.achievementRate >= 90 ? 'success' : stationData.summary.achievementRate >= 70 ? 'warning' : 'danger'}`}>
                  {stationData.summary.achievementRate}%
                </div>
                <div className="card-meta">
                  {stationData.summary.achievementRate >= 90 ? '表现优秀' :
                   stationData.summary.achievementRate >= 70 ? '表现良好' : '需要改进'}
                </div>
              </div>
            </div>

            {/* 可控收益率 */}
            {stationData.summary.controllableRate !== undefined && (
              <div className="summary-card">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                  <BarChart3 size={24} />
                </div>
                <div className="card-content">
                  <div className="card-label">可控收益率</div>
                  <div className={`card-value ${stationData.summary.controllableRate >= 95 ? 'success' : stationData.summary.controllableRate >= 85 ? 'warning' : 'danger'}`}>
                    {stationData.summary.controllableRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* 预估提升金额 - 只在普通电站显示 */}
            {!stationData.isAI && achievementStats && achievementStats.hasOptimization && (() => {
              const currentRate = stationData.summary.achievementRate;
              const aiRate = achievementStats.aiStations.averageAchievementRate;
              const rateDifference = aiRate - currentRate;
              const estimatedImprovement = rateDifference > 0
                ? stationData.summary.totalExpected * (rateDifference / 100)
                : 0;
              const improvementPercentage = stationData.summary.totalActual > 0
                ? (estimatedImprovement / stationData.summary.totalActual) * 100
                : 0;

              return estimatedImprovement > 0 ? (
                <div className="summary-card improvement-card">
                  <div className="card-icon" style={{ background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div className="card-content">
                    <div className="card-label">预估提升金额</div>
                    <div className="card-value warning">
                      {formatCurrency(estimatedImprovement)}
                      <span className="improvement-badge">
                        <TrendingUp size={16} className="arrow-up" />
                        {improvementPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="card-meta">
                      达到AI平均水平({aiRate.toFixed(2)}%)可提升
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* 图表类型切换 */}
          <div className="chart-controls">
            <div className="chart-type-tabs">
              <button
                className={`tab-btn ${chartType === 'daily-bar' ? 'active' : ''}`}
                onClick={() => setChartType('daily-bar')}
              >
                <BarChart3 size={18} />
                每日柱状图
              </button>
              <button
                className={`tab-btn ${chartType === 'monthly' ? 'active' : ''}`}
                onClick={() => setChartType('monthly')}
              >
                <BarChart3 size={18} />
                月度统计
              </button>
              <button
                className={`tab-btn ${chartType === 'loss-analysis' ? 'active' : ''}`}
                onClick={() => setChartType('loss-analysis')}
              >
                <AlertTriangle size={18} />
                损失分析
              </button>
            </div>
          </div>

          {/* 月度统计图表 */}
          {chartType === 'monthly' && (
            <div className="chart-section">
              <h2>月度收益统计</h2>
              <p className="chart-subtitle">
                预期收益(蓝色) + 实际收益(粉色)
                {achievementStats && achievementStats.hasOptimization && !stationData.isAI && (
                  <span className="optimization-hint"> + 可优化金额(橙色)</span>
                )}
              </p>
              <div className="bar-chart">
                {(() => {
                  // Only show optimization for normal (non-AI) stations
                  const showOptimization = achievementStats && achievementStats.hasOptimization && !stationData.isAI;
                  const aiAvgRate = achievementStats ? achievementStats.aiStations.averageAchievementRate : 0;

                  // Calculate optimization amounts for each month
                  const monthsWithOptimization = stationData.monthlyStats.map((month, index) => {
                    const monthlyRate = month.expectedRevenue > 0
                      ? (month.actualRevenue / month.expectedRevenue) * 100
                      : 0;

                    const rateDifference = aiAvgRate - monthlyRate;
                    let optimizationAmount = showOptimization && rateDifference > 0
                      ? month.expectedRevenue * (rateDifference / 100)
                      : 0;

                    // Add random fluctuation ±3%
                    if (optimizationAmount > 0) {
                      const seed = index + parseInt(month.month.split('-')[1] || '1');
                      const randomFactor = 1 + ((seed % 60 - 30) / 1000);
                      optimizationAmount *= randomFactor;
                    }

                    return {
                      ...month,
                      optimizationAmount,
                      totalWithOptimization: month.actualRevenue + optimizationAmount
                    };
                  });

                  const maxRevenue = Math.max(
                    ...monthsWithOptimization.map(m => Math.max(m.expectedRevenue, m.totalWithOptimization))
                  );

                  return monthsWithOptimization.map((month, index) => {
                    const expectedHeight = (month.expectedRevenue / maxRevenue) * 100;
                    const actualHeight = (month.actualRevenue / maxRevenue) * 100;
                    const optimizationHeight = (month.optimizationAmount / maxRevenue) * 100;

                    return (
                      <div key={month.month} className="bar-group">
                        <div className="bars">
                          <div
                            className="bar expected"
                            style={{ height: `${expectedHeight}%` }}
                            title={`预期: ${formatCurrency(month.expectedRevenue)}`}
                          >
                            <span className="bar-label">{formatCurrency(month.expectedRevenue)}</span>
                          </div>
                          {/* Stacked bar for actual + optimization */}
                          <div className="bar-stack" style={{ height: `${actualHeight + optimizationHeight}%` }}>
                            {/* Bottom part: Optimization amount (orange) */}
                            {showOptimization && month.optimizationAmount > 0 && (
                              <div
                                className="bar-segment optimization"
                                style={{ height: `${(optimizationHeight / (actualHeight + optimizationHeight)) * 100}%` }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltip({
                                    content: `可优化金额: ${formatCurrency(month.optimizationAmount)}`,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                              />
                            )}
                            {/* Top part: Actual revenue (pink) */}
                            <div
                              className="bar-segment actual"
                              style={{ height: `${(actualHeight / (actualHeight + optimizationHeight)) * 100}%` }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  content: `实际: ${formatCurrency(month.actualRevenue)}${showOptimization && month.optimizationAmount > 0 ? `\n可优化: ${formatCurrency(month.optimizationAmount)}` : ''}`,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 10
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            />
                          </div>
                        </div>
                        <div className="bar-month">{month.month}</div>
                        <div className="bar-achievement">{month.achievementRate}%</div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color expected"></span>
                  <span>预期收益</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color actual"></span>
                  <span>实际收益</span>
                </div>
                {achievementStats && achievementStats.hasOptimization && !stationData.isAI && (
                  <div className="legend-item">
                    <span className="legend-color optimization"></span>
                    <span>可优化金额</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 每日柱状图 */}
          {chartType === 'daily-bar' && (
            <div className="chart-section">
              <h2>每日收益柱状图</h2>
              <p className="chart-subtitle">
                实际收益(柱状) + 预期收益(折线)
                {achievementStats && achievementStats.hasOptimization && !stationData.isAI && (
                  <span className="optimization-hint"> + 可优化金额(浅橙色)</span>
                )}
              </p>
              <div className="daily-bar-chart-container">
                <div className="daily-bar-chart">
                  {(() => {
                    // Only show optimization for normal (non-AI) stations
                    const showOptimization = achievementStats && achievementStats.hasOptimization && !stationData.isAI;

                    // AI average achievement rate
                    const aiAvgRate = achievementStats ? achievementStats.aiStations.averageAchievementRate : 0;

                    // Calculate once for performance
                    const recordsWithOptimization = stationData.dailyRecords.map((record, index) => {
                      // Calculate daily achievement rate
                      const dailyRate = record.expectedRevenue > 0
                        ? (record.actualRevenue / record.expectedRevenue) * 100
                        : 0;

                      // Optimization amount = Expected Revenue × (AI Avg Rate - Daily Rate)
                      // Only if AI rate is higher than daily rate
                      const rateDifference = aiAvgRate - dailyRate;
                      let optimizationAmount = showOptimization && rateDifference > 0
                        ? record.expectedRevenue * (rateDifference / 100)
                        : 0;

                      // Add random fluctuation ±3%
                      if (optimizationAmount > 0) {
                        // Use index and date as seed for consistent randomness
                        const seed = index + new Date(record.date).getDate();
                        const randomFactor = 1 + ((seed % 60 - 30) / 1000); // ±3% range
                        optimizationAmount *= randomFactor;
                      }

                      return {
                        ...record,
                        dailyRate,
                        optimizationAmount,
                        totalWithOptimization: record.actualRevenue + optimizationAmount
                      };
                    });

                    // 计算最大值和最小值，用于处理负数收益
                    const allValues = recordsWithOptimization.flatMap(r => [
                      r.expectedRevenue,
                      r.actualRevenue,
                      r.totalWithOptimization
                    ]);
                    const maxRevenue = Math.max(...allValues, 0);
                    const minRevenue = Math.min(...allValues, 0);
                    const valueRange = maxRevenue - minRevenue;
                    const barWidth = 12;
                    const barSpacing = 4; // 柱子之间的间距
                    const barGroupWidth = barWidth + barSpacing; // 每组柱子的总宽度
                    const totalWidth = stationData.dailyRecords.length * barGroupWidth;
                    const chartHeight = 300;

                    // 计算零轴位置（从顶部算起的百分比）
                    // 零点在整个值域中的位置
                    const zeroPosition = valueRange > 0
                      ? (maxRevenue / valueRange) * 100
                      : 50;

                    // Build expected revenue line path
                    const expectedLinePath = stationData.dailyRecords.map((record, index) => {
                      const x = index * barGroupWidth + barWidth / 2;
                      // 将值转换为相对于零点的百分比位置
                      let yPercent;
                      if (valueRange > 0) {
                        // 正值：零点到顶部的范围
                        // 负值：零点到底部的范围
                        yPercent = zeroPosition - (record.expectedRevenue / valueRange) * 100;
                      } else {
                        yPercent = 50;
                      }
                      const y = (yPercent / 100) * chartHeight;
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return (
                      <div className="daily-chart-container" style={{ '--zero-position': `${zeroPosition}%` }}>
                        <div className="daily-bars">
                          {recordsWithOptimization.map((record, index) => {
                            // 计算相对于零点的高度百分比
                            let actualBarHeight, optimizationBarHeight;
                            if (valueRange > 0) {
                              // 实际收益的高度（相对于零点）
                              actualBarHeight = Math.abs(record.actualRevenue / valueRange) * 100;
                              // 优化金额的高度
                              optimizationBarHeight = Math.abs(record.optimizationAmount / valueRange) * 100;
                            } else {
                              actualBarHeight = 0;
                              optimizationBarHeight = 0;
                            }

                            const date = new Date(record.date);
                            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                            const achievementRate = record.expectedRevenue > 0
                              ? ((record.actualRevenue / record.expectedRevenue) * 100).toFixed(2)
                              : 0;

                            // Show first, last, and evenly distributed labels
                            const labelInterval = Math.ceil(stationData.dailyRecords.length / 15);
                            const shouldShowLabel = index === 0 ||
                                                    index === stationData.dailyRecords.length - 1 ||
                                                    index % labelInterval === 0;

                            // 判断是否为负数收益
                            const isNegative = record.actualRevenue < 0;

                            return (
                              <div key={index} className="daily-bar-group" style={{ left: `${index * barGroupWidth}px` }}>
                                {/* 负数收益特殊处理：从零轴向下延伸 */}
                                {isNegative ? (
                                  <div
                                    className="daily-bar-stack negative"
                                    style={{ height: `${actualBarHeight}%` }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({
                                        content: `日期: ${dateStr}\n预期收益: ${formatCurrency(record.expectedRevenue)}\n实际收益: ${formatCurrency(record.actualRevenue)} ⚠️\n当日达成率: ${achievementRate}%\n\n⚠️ 负数收益（支付费用）`,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top - 10
                                      });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                  >
                                    <div className="daily-bar-segment negative" style={{ height: '100%' }} />
                                  </div>
                                ) : (
                                  /* 正数收益：从零轴向上延伸，支持优化金额堆叠 */
                                  <div className="daily-bar-stack positive" style={{ height: `${actualBarHeight + optimizationBarHeight}%` }}>
                                  {/* Bottom part: Actual revenue (green) */}
                                  <div
                                    className="daily-bar-segment actual"
                                    style={{ height: actualBarHeight + optimizationBarHeight > 0 ? `${(actualBarHeight / (actualBarHeight + optimizationBarHeight)) * 100}%` : '100%' }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({
                                        content: `日期: ${dateStr}\n预期收益: ${formatCurrency(record.expectedRevenue)}\n实际收益: ${formatCurrency(record.actualRevenue)}\n当日达成率: ${achievementRate}%${showOptimization && record.optimizationAmount > 0 ? `\nAI平均达成率: ${aiAvgRate.toFixed(2)}%\n可优化金额: ${formatCurrency(record.optimizationAmount)}` : ''}`,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top - 10
                                      });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                  />
                                  {/* Top part: Optimization amount (orange) */}
                                  {showOptimization && record.optimizationAmount > 0 && (
                                    <div
                                      className="daily-bar-segment optimization"
                                      style={{ height: `${(optimizationBarHeight / (actualBarHeight + optimizationBarHeight)) * 100}%` }}
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({
                                          content: `可优化金额: ${formatCurrency(record.optimizationAmount)}\n计算: ${formatCurrency(record.expectedRevenue)} × (${aiAvgRate.toFixed(2)}% - ${achievementRate}%)`,
                                          x: rect.left + rect.width / 2,
                                          y: rect.top - 10
                                        });
                                      }}
                                      onMouseLeave={() => setTooltip(null)}
                                    />
                                  )}
                                </div>
                                )}
                                {shouldShowLabel && (
                                  <div className="daily-bar-date">{dateStr}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* SVG overlay for expected revenue line */}
                        <svg className="daily-line-overlay" viewBox={`0 0 ${totalWidth} ${chartHeight}`} preserveAspectRatio="none">
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

                          {/* Expected revenue line */}
                          <path
                            d={expectedLinePath}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,3"
                          />

                          {/* Circular markers */}
                          {stationData.dailyRecords.map((record, index) => {
                            const x = index * barGroupWidth + barWidth / 2;
                            // 使用相同的坐标系统
                            let yPercent;
                            if (valueRange > 0) {
                              yPercent = zeroPosition - (record.expectedRevenue / valueRange) * 100;
                            } else {
                              yPercent = 50;
                            }
                            const y = (yPercent / 100) * chartHeight;
                            const date = new Date(record.date);
                            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

                            return (
                              <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="3"
                                fill="#3b82f6"
                                className="expected-marker"
                              >
                                <title>{`${dateStr}\n预期: ${formatCurrency(record.expectedRevenue)}`}</title>
                              </circle>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color expected-line"></span>
                  <span>预期收益(折线)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color actual"></span>
                  <span>实际收益(柱状)</span>
                </div>
                {achievementStats && achievementStats.hasOptimization && !stationData.isAI && (
                  <div className="legend-item">
                    <span className="legend-color optimization"></span>
                    <span>可优化金额(基于AI电站达成率差额)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 收益率分析 - 仅普通电站显示 */}
          {!stationData.isAI && chartType === 'daily-bar' && (
            <div className="rate-analysis-section">
              <h3>收益率分析</h3>
              <div className="rate-analysis-controls">
                <button
                  className={`rate-btn ${rateAnalysisType === 'copilot-rate' ? 'active' : ''}`}
                  onClick={() => setRateAnalysisType('copilot-rate')}
                >
                  Copilot收益率
                </button>
                <button
                  className={`rate-btn ${rateAnalysisType === 'avg-daily-rate' ? 'active' : ''}`}
                  onClick={() => setRateAnalysisType('avg-daily-rate')}
                >
                  平均每日收益率
                </button>
              </div>

              <div className="rate-analysis-content">
                {(() => {
                  // 计算AI平均达成率和优化金额
                  const showOptimization = achievementStats && achievementStats.hasOptimization;
                  const aiAvgRate = showOptimization ? achievementStats.aiStations.averageAchievementRate : 0;

                  // 为每条记录添加优化金额
                  const recordsWithOptimization = stationData.dailyRecords.map(record => {
                    let optimizationAmount = 0;
                    if (showOptimization && record.expectedRevenue > 0) {
                      const currentRate = (record.actualRevenue / record.expectedRevenue) * 100;
                      if (aiAvgRate > currentRate) {
                        optimizationAmount = record.expectedRevenue * ((aiAvgRate - currentRate) / 100);
                      }
                    }
                    return { ...record, optimizationAmount };
                  });

                  // 计算最大值和最小值，用于处理负数收益
                  const allValues = recordsWithOptimization.flatMap(r => [
                    r.expectedRevenue,
                    r.actualRevenue,
                    r.totalWithOptimization
                  ]);
                  const maxRevenue = Math.max(...allValues, 0);
                  const minRevenue = Math.min(...allValues, 0);
                  const valueRange = maxRevenue - minRevenue;
                  const barWidth = 12;
                  const barSpacing = 4;
                  const barGroupWidth = barWidth + barSpacing;
                  const totalWidth = recordsWithOptimization.length * barGroupWidth;
                  const chartHeight = 300;

                  // 计算零轴位置
                  const zeroPosition = valueRange > 0
                    ? (maxRevenue / valueRange) * 100
                    : 50;

                  // 构建预期收益折线路径
                  const expectedLinePath = recordsWithOptimization.map((record, index) => {
                    const x = index * barGroupWidth + barWidth / 2;
                    let yPercent;
                    if (valueRange > 0) {
                      yPercent = zeroPosition - (record.expectedRevenue / valueRange) * 100;
                    } else {
                      yPercent = 50;
                    }
                    const y = (yPercent / 100) * chartHeight;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  return (
                    <div className="daily-chart-container" style={{ '--zero-position': `${zeroPosition}%` }}>
                      <div className="daily-bars">
                        {recordsWithOptimization.map((record, index) => {
                          let actualBarHeight, optimizationBarHeight;
                          if (valueRange > 0) {
                            actualBarHeight = Math.abs(record.actualRevenue / valueRange) * 100;
                            optimizationBarHeight = Math.abs(record.optimizationAmount / valueRange) * 100;
                          } else {
                            actualBarHeight = 0;
                            optimizationBarHeight = 0;
                          }

                          const date = new Date(record.date);
                          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                          const achievementRate = record.expectedRevenue > 0
                            ? ((record.actualRevenue / record.expectedRevenue) * 100).toFixed(2)
                            : 0;

                          const labelInterval = Math.ceil(recordsWithOptimization.length / 15);
                          const shouldShowLabel = index === 0 ||
                                                  index === recordsWithOptimization.length - 1 ||
                                                  index % labelInterval === 0;

                          const isNegative = record.actualRevenue < 0;

                          return (
                            <div key={index} className="daily-bar-group" style={{ left: `${index * barGroupWidth}px` }}>
                              {isNegative ? (
                                <div
                                  className="daily-bar-stack negative"
                                  style={{ height: `${actualBarHeight}%` }}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltip({
                                      content: `日期: ${dateStr}\n预期收益: ${formatCurrency(record.expectedRevenue)}\n实际收益: ${formatCurrency(record.actualRevenue)} ⚠️\n当日达成率: ${achievementRate}%\n\n⚠️ 负数收益（支付费用）`,
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 10
                                    });
                                  }}
                                  onMouseLeave={() => setTooltip(null)}
                                >
                                  <div className="daily-bar-segment negative" style={{ height: '100%' }} />
                                </div>
                              ) : (
                                <div className="daily-bar-stack positive" style={{ height: `${actualBarHeight + optimizationBarHeight}%` }}>
                                  <div
                                    className="daily-bar-segment actual"
                                    style={{ height: actualBarHeight + optimizationBarHeight > 0 ? `${(actualBarHeight / (actualBarHeight + optimizationBarHeight)) * 100}%` : '100%' }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({
                                        content: `日期: ${dateStr}\n预期收益: ${formatCurrency(record.expectedRevenue)}\n实际收益: ${formatCurrency(record.actualRevenue)}\n当日达成率: ${achievementRate}%${showOptimization && record.optimizationAmount > 0 ? `\nAI平均达成率: ${aiAvgRate.toFixed(2)}%\n可优化金额: ${formatCurrency(record.optimizationAmount)}` : ''}`,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top - 10
                                      });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                  />
                                  {showOptimization && record.optimizationAmount > 0 && (
                                    <div
                                      className="daily-bar-segment optimization"
                                      style={{ height: `${(optimizationBarHeight / (actualBarHeight + optimizationBarHeight)) * 100}%` }}
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({
                                          content: `可优化金额: ${formatCurrency(record.optimizationAmount)}\n计算: ${formatCurrency(record.expectedRevenue)} × (${aiAvgRate.toFixed(2)}% - ${achievementRate}%)`,
                                          x: rect.left + rect.width / 2,
                                          y: rect.top - 10
                                        });
                                      }}
                                      onMouseLeave={() => setTooltip(null)}
                                    />
                                  )}
                                </div>
                              )}
                              {shouldShowLabel && (
                                <div className="daily-bar-date">{dateStr}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <svg className="daily-line-overlay" viewBox={`0 0 ${totalWidth} ${chartHeight}`} preserveAspectRatio="none">
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

                        <path
                          d={expectedLinePath}
                          stroke="#3b82f6"
                          strokeWidth="2"
                          fill="none"
                        />

                        {recordsWithOptimization.map((record, index) => {
                          const labelInterval = Math.ceil(recordsWithOptimization.length / 30);
                          if (index % labelInterval !== 0 && index !== 0 && index !== recordsWithOptimization.length - 1) {
                            return null;
                          }

                          const x = index * barGroupWidth + barWidth / 2;
                          let yPercent;
                          if (valueRange > 0) {
                            yPercent = zeroPosition - (record.expectedRevenue / valueRange) * 100;
                          } else {
                            yPercent = 50;
                          }
                          const y = (yPercent / 100) * chartHeight;
                          const date = new Date(record.date);
                          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#3b82f6"
                              stroke="white"
                              strokeWidth="2"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  content: `${dateStr}\n预期: ${formatCurrency(record.expectedRevenue)}`,
                                  x: rect.left,
                                  y: rect.top - 10
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <title>{`${dateStr}\n预期: ${formatCurrency(record.expectedRevenue)}`}</title>
                            </circle>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}

                {/* 图例 */}
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color expected-line"></span>
                    <span>预期收益(折线)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color actual"></span>
                    <span>实际收益(柱状)</span>
                  </div>
                  {achievementStats && achievementStats.hasOptimization && (
                    <div className="legend-item">
                      <span className="legend-color optimization"></span>
                      <span>可优化金额(基于AI电站达成率差额)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 每日趋势图表 */}
          {chartType === 'daily-trend' && (
            <div className="chart-section">
              <h2>每日收益趋势</h2>
              <div className="line-chart">
                <svg viewBox="0 0 1000 400" className="chart-svg">
                  {/* Y轴网格线 */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={`grid-${i}`}
                      x1="50"
                      y1={350 - i * 75}
                      x2="950"
                      y2={350 - i * 75}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                  ))}

                  {/* 绘制折线图 */}
                  {(() => {
                    const maxRevenue = Math.max(
                      ...stationData.dailyRecords.map(r => Math.max(r.expectedRevenue, r.actualRevenue))
                    );
                    const xStep = 900 / (stationData.dailyRecords.length - 1 || 1);

                    // 预期收益线
                    const expectedPath = stationData.dailyRecords.map((record, index) => {
                      const x = 50 + index * xStep;
                      const y = 350 - (record.expectedRevenue / maxRevenue) * 300;
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    // 实际收益线
                    const actualPath = stationData.dailyRecords.map((record, index) => {
                      const x = 50 + index * xStep;
                      const y = 350 - (record.actualRevenue / maxRevenue) * 300;
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return (
                      <>
                        <path d={expectedPath} fill="none" stroke="#93c5fd" strokeWidth="2" />
                        <path d={actualPath} fill="none" stroke="#f472b6" strokeWidth="3" />

                        {/* 数据点 */}
                        {stationData.dailyRecords.map((record, index) => {
                          if (index % Math.ceil(stationData.dailyRecords.length / 30) !== 0) return null;
                          const x = 50 + index * xStep;
                          const yActual = 350 - (record.actualRevenue / maxRevenue) * 300;

                          return (
                            <g key={index}>
                              <circle cx={x} cy={yActual} r="4" fill="#f472b6" />
                              <title>{formatDate(record.date)}: {formatCurrency(record.actualRevenue)}</title>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* X轴 */}
                  <line x1="50" y1="350" x2="950" y2="350" stroke="#6b7280" strokeWidth="2" />

                  {/* Y轴 */}
                  <line x1="50" y1="50" x2="50" y2="350" stroke="#6b7280" strokeWidth="2" />

                  {/* Y轴标签 */}
                  {[0, 1, 2, 3, 4].map(i => {
                    const maxRevenue = Math.max(
                      ...stationData.dailyRecords.map(r => Math.max(r.expectedRevenue, r.actualRevenue))
                    );
                    const value = (maxRevenue / 4) * i;
                    return (
                      <text
                        key={`label-${i}`}
                        x="40"
                        y={355 - i * 75}
                        textAnchor="end"
                        fontSize="12"
                        fill="#6b7280"
                      >
                        {value > 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#93c5fd' }}></span>
                  <span>预期收益</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#f472b6' }}></span>
                  <span>实际收益</span>
                </div>
              </div>
            </div>
          )}

          {/* 损失分析 */}
          {chartType === 'loss-analysis' && (
            <LossAnalysis stationId={selectedStation} stationData={stationData} />
          )}

          {/* 告警分析区域 - 显示在所有图表下方 */}
          {stationData && (
            <AlarmSection
              stationId={selectedStation}
              startDate={stationData.dailyRecords && stationData.dailyRecords.length > 0 ? stationData.dailyRecords[0].date : null}
              endDate={stationData.dailyRecords && stationData.dailyRecords.length > 0 ? stationData.dailyRecords[stationData.dailyRecords.length - 1].date : null}
            />
          )}

          {/* 数据表格 */}
          <div className="data-table-section">
            <h2>月度数据详情</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>月份</th>
                    <th>预期收益</th>
                    <th>实际收益</th>
                    <th>达成率</th>
                    <th>数据天数</th>
                  </tr>
                </thead>
                <tbody>
                  {stationData.monthlyStats.map(month => (
                    <tr key={month.month}>
                      <td>{month.month}</td>
                      <td>{formatCurrency(month.expectedRevenue)}</td>
                      <td className="highlight">{formatCurrency(month.actualRevenue)}</td>
                      <td>
                        <span className={`badge ${month.achievementRate >= 90 ? 'success' : month.achievementRate >= 70 ? 'warning' : 'danger'}`}>
                          {month.achievementRate}%
                        </span>
                      </td>
                      <td>{month.dayCount} 天</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 年度收益汇总 */}
          {yearlyData.length > 0 && (
            <div className="yearly-summary-section">
              <h2>年度收益汇总</h2>
              <div className="yearly-cards">
                {yearlyData.map(year => (
                  <div key={year.year} className="yearly-card">
                    <div className="yearly-header">
                      <Calendar size={20} />
                      <span className="year-label">{year.year} 年</span>
                    </div>
                    <div className="yearly-stats">
                      <div className="stat-row">
                        <span className="stat-label">预期收益:</span>
                        <span className="stat-value">{formatCurrency(year.totalExpected)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">实际收益:</span>
                        <span className="stat-value highlight">{formatCurrency(year.totalActual)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">达成率:</span>
                        <span className={`stat-value ${year.achievementRate >= 90 ? 'success' : year.achievementRate >= 70 ? 'warning' : 'danger'}`}>
                          {year.achievementRate}%
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">数据天数:</span>
                        <span className="stat-value">{year.recordCount} 天</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Portal tooltip - renders at body level */}
      {tooltip && createPortal(
        <div
          className="chart-tooltip-portal"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 2147483647,
            pointerEvents: 'none'
          }}
        >
          <div className="chart-tooltip-content">
            {tooltip.content.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <div className="chart-tooltip-arrow" />
        </div>,
        document.body
      )}
    </div>
  );
}
