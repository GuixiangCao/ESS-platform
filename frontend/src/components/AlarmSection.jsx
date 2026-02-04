import React, { useState, useEffect } from 'react';
import './AlarmSection.css';

const AlarmSection = ({ stationId, startDate, endDate }) => {
  const [alarmStats, setAlarmStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationId || !startDate || !endDate) return;

    const fetchAlarmStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);

        const response = await fetch(
          `http://localhost:5001/api/alarms/station/${stationId}/stats?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('获取告警数据失败');
        }

        const result = await response.json();
        if (result.success) {
          setAlarmStats(result.data);
        } else {
          throw new Error(result.message || '获取告警数据失败');
        }
      } catch (err) {
        console.error('获取告警数据失败:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlarmStats();
  }, [stationId, startDate, endDate]);

  // 生成饼图颜色
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4'];

  if (loading) {
    return (
      <div className="alarm-section">
        <h3>告警分析</h3>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alarm-section">
        <h3>告警分析</h3>
        <div className="error">⚠️ {error}</div>
      </div>
    );
  }

  if (!alarmStats || alarmStats.totalCount === 0) {
    return (
      <div className="alarm-section">
        <h3>告警分析</h3>
        <div className="no-data">✅ 该时间段内无故障告警</div>
      </div>
    );
  }

  const { deviceStats, totalCount, totalDurationHours } = alarmStats;

  // 绘制饼图的SVG路径
  const createPieChart = (data, type) => {
    const total = type === 'count'
      ? totalCount
      : deviceStats.reduce((sum, stat) => sum + stat.totalDuration, 0);

    let currentAngle = 0;
    const paths = [];
    const labels = [];

    data.forEach((stat, index) => {
      const value = type === 'count' ? stat.count : stat.totalDuration;
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      const endAngle = currentAngle + angle;

      // 计算路径
      const startX = 100 + 80 * Math.cos((currentAngle - 90) * Math.PI / 180);
      const startY = 100 + 80 * Math.sin((currentAngle - 90) * Math.PI / 180);
      const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
      const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M 100,100`,
        `L ${startX},${startY}`,
        `A 80,80 0 ${largeArcFlag},1 ${endX},${endY}`,
        `Z`
      ].join(' ');

      paths.push(
        <path
          key={stat.device}
          d={pathData}
          fill={colors[index % colors.length]}
          stroke="#fff"
          strokeWidth="2"
        >
          <title>{`${stat.deviceName}: ${value}${type === 'count' ? '次' : '分钟'} (${percentage.toFixed(1)}%)`}</title>
        </path>
      );

      // 添加标签位置
      const labelAngle = currentAngle + angle / 2;
      const labelX = 100 + 60 * Math.cos((labelAngle - 90) * Math.PI / 180);
      const labelY = 100 + 60 * Math.sin((labelAngle - 90) * Math.PI / 180);

      labels.push({
        x: labelX,
        y: labelY,
        text: percentage >= 5 ? `${percentage.toFixed(0)}%` : '',
        device: stat.device
      });

      currentAngle = endAngle;
    });

    return { paths, labels };
  };

  const countChart = createPieChart(deviceStats, 'count');
  const durationChart = createPieChart(deviceStats, 'duration');

  return (
    <div className="alarm-section">
      <h3>📊 告警分析</h3>

      <div className="alarm-summary">
        <div className="summary-item">
          <span className="label">总告警数:</span>
          <span className="value">{totalCount} 次</span>
        </div>
        <div className="summary-item">
          <span className="label">累计时长:</span>
          <span className="value">{totalDurationHours} 小时</span>
        </div>
      </div>

      <div className="alarm-charts">
        {/* 告警次数饼图 */}
        <div className="chart-container">
          <h4>按设备告警次数</h4>
          <svg viewBox="0 0 200 200" className="pie-chart">
            {countChart.paths}
            {countChart.labels.map((label, i) => (
              label.text && (
                <text
                  key={i}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {label.text}
                </text>
              )
            ))}
          </svg>
          <div className="legend">
            {deviceStats.map((stat, index) => (
              <div key={stat.device} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="legend-label">
                  {stat.deviceName}: {stat.count}次 ({stat.countPercent}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 告警时长饼图 */}
        <div className="chart-container">
          <h4>按设备累计时长</h4>
          <svg viewBox="0 0 200 200" className="pie-chart">
            {durationChart.paths}
            {durationChart.labels.map((label, i) => (
              label.text && (
                <text
                  key={i}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {label.text}
                </text>
              )
            ))}
          </svg>
          <div className="legend">
            {deviceStats.map((stat, index) => (
              <div key={stat.device} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="legend-label">
                  {stat.deviceName}: {stat.totalDurationHours}h ({stat.durationPercent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 详细统计表格 */}
      <div className="alarm-table">
        <h4>设备告警详情</h4>
        <table>
          <thead>
            <tr>
              <th>设备类型</th>
              <th>告警次数</th>
              <th>累计时长</th>
              <th>平均时长</th>
              <th>最长时长</th>
            </tr>
          </thead>
          <tbody>
            {deviceStats.map((stat) => (
              <tr key={stat.device}>
                <td>{stat.deviceName}</td>
                <td>{stat.count}次</td>
                <td>{stat.totalDurationHours}小时</td>
                <td>{stat.avgDuration}分钟</td>
                <td>{stat.maxDuration}分钟</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlarmSection;
