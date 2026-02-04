import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, BarChart3 } from 'lucide-react';
import AlarmPieChart from './AlarmPieChart';
import './MonthlyAlarmModal.css';

const MonthlyAlarmModal = ({ isOpen, onClose, stationId, month }) => {
  const [alarmStats, setAlarmStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !stationId || !month) return;

    const fetchMonthlyAlarms = async () => {
      try {
        setLoading(true);
        setError(null);

        // 解析月份 "2025-09" -> startDate: 2025-09-01, endDate: 2025-09-30
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0); // 获取当月最后一天

        const formatDateForAPI = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        const response = await fetch(
          `http://localhost:5001/api/alarms/station/${stationId}/stats?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (!response.ok) {
          throw new Error('获取月度告警统计失败');
        }

        const result = await response.json();
        if (result.success) {
          setAlarmStats(result.data);
        } else {
          throw new Error(result.message || '获取月度告警统计失败');
        }
      } catch (err) {
        console.error('获取月度告警统计失败:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyAlarms();
  }, [isOpen, stationId, month]);

  if (!isOpen) return null;

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${year}年${month}月`;
  };

  const getDeviceColor = (device) => {
    const colorMap = {
      lc: '#3b82f6',
      pcs: '#10b981',
      cluster: '#f59e0b',
      meter: '#8b5cf6',
      highMeter: '#ec4899',
      ac: '#06b6d4',
      ems: '#f97316'
    };
    return colorMap[device] || '#6b7280';
  };

  return (
    <div className="monthly-alarm-modal-overlay" onClick={onClose}>
      <div className="monthly-alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="monthly-alarm-modal-header">
          <h3>
            <BarChart3 size={20} />
            {formatMonth(month)} 告警统计
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="monthly-alarm-modal-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <AlertCircle size={48} color="#ef4444" />
              <p>⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && alarmStats && (
            <>
              {/* 统计摘要 */}
              <div className="monthly-alarm-summary">
                <div className="summary-item">
                  <span className="label">当月故障次数:</span>
                  <span className="value count">{alarmStats.totalCount} 次</span>
                </div>
                <div className="summary-item">
                  <span className="label">当月累计故障时长:</span>
                  <span className="value duration">{alarmStats.totalDurationHours} 小时</span>
                </div>
              </div>

              {/* 饼图区域 */}
              {alarmStats.deviceStats && alarmStats.deviceStats.length > 0 && (
                <div className="monthly-charts-section">
                  <div className="chart-container">
                    <h4>按设备类型停机次数</h4>
                    <AlarmPieChart
                      data={alarmStats.deviceStats}
                      type="count"
                      getDeviceColor={getDeviceColor}
                    />
                  </div>
                  <div className="chart-container">
                    <h4>按设备类型累计时长</h4>
                    <AlarmPieChart
                      data={alarmStats.deviceStats}
                      type="duration"
                      getDeviceColor={getDeviceColor}
                    />
                  </div>
                </div>
              )}

              {/* 详细记录表格 */}
              {alarmStats.deviceStats && alarmStats.deviceStats.length > 0 && (
                <div className="monthly-details-section">
                  <h4>详细记录</h4>
                  <div className="details-table-container">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>设备类型</th>
                          <th>告警次数</th>
                          <th>占比</th>
                          <th>累计时长</th>
                          <th>占比</th>
                          <th>平均时长</th>
                          <th>最长时长</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alarmStats.deviceStats
                          .sort((a, b) => b.count - a.count)
                          .map((stat, index) => (
                            <tr key={index}>
                              <td>
                                <span
                                  className="device-badge"
                                  style={{
                                    background: `${getDeviceColor(stat.device)}20`,
                                    color: getDeviceColor(stat.device)
                                  }}
                                >
                                  {stat.deviceName}
                                </span>
                              </td>
                              <td className="number">{stat.count}次</td>
                              <td className="percent">{stat.countPercent}%</td>
                              <td className="number">{stat.totalDurationHours}小时</td>
                              <td className="percent">{stat.durationPercent}%</td>
                              <td className="number">{stat.avgDuration}分钟</td>
                              <td className="number">{stat.maxDuration}分钟</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {alarmStats.totalCount === 0 && (
                <div className="no-alarms-state">
                  <Clock size={48} color="#22c55e" />
                  <p>该月无告警记录</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyAlarmModal;
