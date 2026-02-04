import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, DollarSign, Percent, Search, ArrowUpDown, Sparkles } from 'lucide-react';
import axios from 'axios';
import './StationList.css';

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [achievementStats, setAchievementStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'stationId', direction: 'asc' });
  const [filterAI, setFilterAI] = useState('all'); // 'all', 'ai', 'non-ai'
  const navigate = useNavigate();

  useEffect(() => {
    fetchStations();
    fetchAchievementStats();
  }, []);

  useEffect(() => {
    filterAndSortStations();
  }, [stations, searchTerm, sortConfig, filterAI]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/revenue/stations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('API返回的数据:', response.data);
        console.log('summary:', response.data.summary);
        console.log('第一个电站数据:', response.data.data[0]);
        setStations(response.data.data);
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error('获取电站列表失败:', err);
      setError('获取电站列表失败');
    } finally {
      setLoading(false);
    }
  };

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

  const filterAndSortStations = () => {
    let filtered = [...stations];

    // AI筛选
    if (filterAI === 'ai') {
      filtered = filtered.filter(s => s.isAI);
    } else if (filterAI === 'non-ai') {
      filtered = filtered.filter(s => !s.isAI);
    }

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.stationId.toString().includes(searchTerm)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'stationName') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredStations(filtered);
  };

  const handleSort = (key) => {
    // 不支持对预估提升金额排序(因为AI电站为0)
    if (key === 'estimatedImprovement') return;

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRowClick = (stationId) => {
    navigate(`/revenue/station-analysis?stationId=${stationId}`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getAchievementClass = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'danger';
  };

  const calculateTotals = () => {
    return filteredStations.reduce((acc, station) => ({
      totalExpected: acc.totalExpected + station.totalExpected,
      totalActual: acc.totalActual + station.totalActual,
      totalEstimatedImprovement: acc.totalEstimatedImprovement + (station.estimatedImprovement || 0),
      totalControllableRevenue: acc.totalControllableRevenue + (station.controllableRevenue || 0),
      totalControllableExpected: acc.totalControllableExpected + (station.controllableExpected || 0),
      totalControllableActual: acc.totalControllableActual + (station.controllableActual || 0),
      count: acc.count + 1
    }), {
      totalExpected: 0,
      totalActual: 0,
      totalEstimatedImprovement: 0,
      totalControllableRevenue: 0,
      totalControllableExpected: 0,
      totalControllableActual: 0,
      count: 0
    });
  };

  // 计算筛选后的AI和普通电站达成率
  const calculateFilteredStats = () => {
    const aiStations = filteredStations.filter(s => s.isAI);
    const normalStations = filteredStations.filter(s => !s.isAI);

    const aiStats = aiStations.reduce((acc, station) => ({
      totalExpected: acc.totalExpected + station.totalExpected,
      totalActual: acc.totalActual + station.totalActual,
    }), { totalExpected: 0, totalActual: 0 });

    const normalStats = normalStations.reduce((acc, station) => ({
      totalExpected: acc.totalExpected + station.totalExpected,
      totalActual: acc.totalActual + station.totalActual,
    }), { totalExpected: 0, totalActual: 0 });

    return {
      aiRate: aiStats.totalExpected > 0 ? (aiStats.totalActual / aiStats.totalExpected) * 100 : 0,
      normalRate: normalStats.totalExpected > 0 ? (normalStats.totalActual / normalStats.totalExpected) * 100 : 0,
      aiCount: aiStations.length,
      normalCount: normalStations.length
    };
  };

  const totals = calculateTotals();
  const filteredStats = calculateFilteredStats();
  const overallAchievementRate = totals.totalExpected > 0
    ? (totals.totalActual / totals.totalExpected) * 100
    : 0;
  const overallControllableRate = totals.totalControllableExpected > 0
    ? (totals.totalControllableActual / totals.totalControllableExpected) * 100
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="station-list-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>电站列表</h1>
            <p className="page-subtitle">查看所有电站的收益汇总信息</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <Building2 size={20} />
              <span className="stat-value">{totals.count}</span>
              <span className="stat-label">电站总数</span>
            </div>
            <div className="stat-item">
              <DollarSign size={20} />
              <span className="stat-value">{formatCurrency(totals.totalActual)}</span>
              <span className="stat-label">总实际收益</span>
            </div>
            <div className="stat-item">
              <Percent size={20} />
              <span className={`stat-value ${getAchievementClass(overallAchievementRate)}`}>
                {overallAchievementRate.toFixed(2)}%
              </span>
              <span className="stat-label">整体达成率</span>
            </div>
            <div className="stat-item ai-stat">
              <TrendingUp size={20} />
              <span className={`stat-value ${getAchievementClass(filteredStats.aiRate)}`}>
                {filteredStats.aiRate.toFixed(2)}%
              </span>
              <span className="stat-label">AI电站达成率 ({filteredStats.aiCount})</span>
            </div>
            <div className="stat-item normal-stat">
              <TrendingUp size={20} />
              <span className={`stat-value ${getAchievementClass(filteredStats.normalRate)}`}>
                {filteredStats.normalRate.toFixed(2)}%
              </span>
              <span className="stat-label">普通电站达成率 ({filteredStats.normalCount})</span>
            </div>
            {summary && summary.totalEstimatedImprovement > 0 && (
              <div className="stat-item highlight-stat">
                <Sparkles size={20} />
                <span className="stat-value highlight">
                  {formatCurrency(summary.totalEstimatedImprovement)}
                </span>
                <span className="stat-label">预估提升金额</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          <strong>错误</strong>
          <p>{error}</p>
        </div>
      )}

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="搜索电站名称或编号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterAI === 'all' ? 'active' : ''}`}
            onClick={() => setFilterAI('all')}
          >
            全部电站
          </button>
          <button
            className={`filter-btn ${filterAI === 'ai' ? 'active' : ''}`}
            onClick={() => setFilterAI('ai')}
          >
            🤖 AI电站
          </button>
          <button
            className={`filter-btn ${filterAI === 'non-ai' ? 'active' : ''}`}
            onClick={() => setFilterAI('non-ai')}
          >
            普通电站
          </button>
        </div>
      </div>

      {/* 电站表格 */}
      <div className="table-container">
        <table className="station-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('stationId')}>
                <div className="th-content">
                  电站编号
                  <ArrowUpDown size={14} className={sortConfig.key === 'stationId' ? 'active' : ''} />
                </div>
              </th>
              <th onClick={() => handleSort('stationName')}>
                <div className="th-content">
                  电站名称
                  <ArrowUpDown size={14} className={sortConfig.key === 'stationName' ? 'active' : ''} />
                </div>
              </th>
              <th>
                <div className="th-content">
                  类型
                </div>
              </th>
              <th onClick={() => handleSort('totalActual')}>
                <div className="th-content">
                  总实际收益
                  <ArrowUpDown size={14} className={sortConfig.key === 'totalActual' ? 'active' : ''} />
                </div>
              </th>
              <th onClick={() => handleSort('totalExpected')}>
                <div className="th-content">
                  总预期收益
                  <ArrowUpDown size={14} className={sortConfig.key === 'totalExpected' ? 'active' : ''} />
                </div>
              </th>
              <th onClick={() => handleSort('achievementRate')}>
                <div className="th-content">
                  收益达成率
                  <ArrowUpDown size={14} className={sortConfig.key === 'achievementRate' ? 'active' : ''} />
                </div>
              </th>
              <th onClick={() => handleSort('controllableRate')}>
                <div className="th-content">
                  可控收益率
                  <ArrowUpDown size={14} className={sortConfig.key === 'controllableRate' ? 'active' : ''} />
                </div>
              </th>
              <th>
                <div className="th-content">
                  预估提升金额
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStations.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchTerm ? '未找到匹配的电站' : '暂无数据'}
                </td>
              </tr>
            ) : (
              filteredStations.map(station => (
                <tr
                  key={station.stationId}
                  onClick={() => handleRowClick(station.stationId)}
                  className="clickable-row"
                >
                  <td className="station-id">{station.stationId}</td>
                  <td className="station-name">
                    <div className="name-cell">
                      {station.stationName}
                      {station.isAI && <span className="ai-tag">🤖 AI</span>}
                    </div>
                  </td>
                  <td>
                    {station.isAI ? (
                      <span className="badge badge-ai">AI电站</span>
                    ) : (
                      <span className="badge badge-normal">普通</span>
                    )}
                  </td>
                  <td className="amount">{formatCurrency(station.totalActual)}</td>
                  <td className="amount">{formatCurrency(station.totalExpected)}</td>
                  <td>
                    <div className={`achievement-rate ${getAchievementClass(station.achievementRate)}`}>
                      <TrendingUp size={14} />
                      {station.achievementRate.toFixed(2)}%
                    </div>
                  </td>
                  <td>
                    <div className={`achievement-rate controllable ${getAchievementClass(station.controllableRate || 0)}`}>
                      <TrendingUp size={14} />
                      {(station.controllableRate || 0).toFixed(2)}%
                    </div>
                  </td>
                  <td className="amount">
                    {station.estimatedImprovement > 0 ? (
                      <span className="improvement-value">
                        +{formatCurrency(station.estimatedImprovement)}
                      </span>
                    ) : (
                      <span className="no-improvement">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredStations.length > 0 && (
            <tfoot>
              <tr className="summary-row">
                <td colSpan="3"><strong>合计 ({totals.count} 个电站)</strong></td>
                <td className="amount"><strong>{formatCurrency(totals.totalActual)}</strong></td>
                <td className="amount"><strong>{formatCurrency(totals.totalExpected)}</strong></td>
                <td>
                  <div className={`achievement-rate ${getAchievementClass(overallAchievementRate)}`}>
                    <TrendingUp size={14} />
                    <strong>{overallAchievementRate.toFixed(2)}%</strong>
                  </div>
                </td>
                <td>
                  <div className={`achievement-rate controllable ${getAchievementClass(overallControllableRate)}`}>
                    <TrendingUp size={14} />
                    <strong>{overallControllableRate.toFixed(2)}%</strong>
                  </div>
                </td>
                <td className="amount">
                  {totals.totalEstimatedImprovement > 0 && (
                    <span className="improvement-total">
                      <strong>+{formatCurrency(totals.totalEstimatedImprovement)}</strong>
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
