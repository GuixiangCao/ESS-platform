import { useState, useEffect } from 'react';
import { X, Loader, Battery, Calendar, AlertCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { getCorrectedSocData } from '../services/socService';
import { formatUTCTime, formatUTCDateCN } from '../utils/timeFormatter';
import ChargingStrategyChart from './ChargingStrategyChart';
import './SocDetailModal.css';

export default function SocDetailModal({ isOpen, onClose, stationId, date, stationName }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socData, setSocData] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [showAlarms, setShowAlarms] = useState(true);

  useEffect(() => {
    if (isOpen && stationId && date) {
      fetchSocData();
    }
  }, [isOpen, stationId, date]);

  // 辅助函数：将扁平化的SOC数据按设备分组
  const groupByDevice = (flatData) => {
    const deviceMap = new Map();

    flatData.forEach(record => {
      if (!deviceMap.has(record.deviceId)) {
        deviceMap.set(record.deviceId, {
          deviceId: record.deviceId,
          deviceName: record.gatewayId || record.deviceId, // 使用gatewayId作为设备名
          gatewayId: record.gatewayId,
          data: []
        });
      }

      deviceMap.get(record.deviceId).data.push({
        timestamp: record.time,
        soc: record.soc,  // 已经是修正后的值
        socOriginal: record.socOriginal,
        isJumpCorrected: record.isJumpCorrected
      });
    });

    return Array.from(deviceMap.values());
  };

  const fetchSocData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [SOC请求] 电站ID:', stationId, '日期:', date);

      // 使用修正后的数据接口
      const response = await getCorrectedSocData(stationId, date);

      console.log('✅ [SOC响应] 成功:', response.success, '数据点数:', response.data?.length);

      if (response.success && response.data) {
        // 新接口返回扁平化数据，需要按设备分组
        const devices = groupByDevice(response.data);

        const transformedData = {
          devices,
          totalDevices: devices.length,
          alarms: [] // 告警数据需要从其他地方获取，这里暂时为空
        };

        console.log('📊 [SOC数据] 设备数:', devices.length);
        if (devices.length > 0) {
          const firstDevice = devices[0];
          console.log('📊 [SOC数据] 第一个设备:', firstDevice.deviceId);
          console.log('📊 [SOC数据] 数据点数:', firstDevice.data?.length);
          if (firstDevice.data?.length > 0) {
            const first = firstDevice.data[0];
            const last = firstDevice.data[firstDevice.data.length - 1];
            console.log('📊 [SOC数据] 第一个点:', first.timestamp, 'SOC:', first.soc + '%');
            console.log('📊 [SOC数据] 最后一个点:', last.timestamp, 'SOC:', last.soc + '%');

            // 检查是否有修正数据
            const correctedCount = firstDevice.data.filter(d => d.isJumpCorrected).length;
            if (correctedCount > 0) {
              console.log('🔧 [SOC修正] 已修正数据点:', correctedCount);
            }
          }
        }

        setSocData(transformedData);
        // 默认选中所有设备
        if (devices.length > 0) {
          setSelectedDevices(devices.map(d => d.deviceId));
        }
      }
    } catch (err) {
      console.error('❌ [SOC请求失败]:', err);
      setError('获取SOC数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // 使用UTC+8时间格式化（数据库存储的是UTC+0，需要加8小时转为UTC+8）
  const formatTime = (timestamp) => {
    return formatUTCTime(timestamp, false); // 不显示秒
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return formatUTCDateCN(dateStr);
  };

  // 生成设备颜色
  const getDeviceColor = (index) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#6366f1', // indigo
    ];
    return colors[index % colors.length];
  };

  // 准备图表数据
  const getChartData = () => {
    if (!socData || !socData.devices) return [];

    // 合并所有选中设备的时间点
    const selectedDevicesData = socData.devices.filter(d =>
      selectedDevices.includes(d.deviceId)
    );

    if (selectedDevicesData.length === 0) return [];

    // 找出所有设备的时间范围
    let minTime = Infinity;
    let maxTime = -Infinity;

    selectedDevicesData.forEach(device => {
      device.data.forEach(point => {
        const timestamp = new Date(point.timestamp).getTime();
        minTime = Math.min(minTime, timestamp);
        maxTime = Math.max(maxTime, timestamp);
      });
    });

    if (minTime === Infinity || maxTime === -Infinity) return [];

    // 创建固定时间间隔的数据点（每5分钟一个点）
    const INTERVAL_MS = 5 * 60 * 1000; // 5分钟
    const timeSlots = [];

    for (let time = minTime; time <= maxTime; time += INTERVAL_MS) {
      timeSlots.push(time);
    }

    // 为每个设备创建索引，方便快速查找最近的数据点
    const deviceDataIndex = new Map();
    selectedDevicesData.forEach(device => {
      const sortedData = device.data
        .map(point => ({
          timestamp: new Date(point.timestamp).getTime(),
          soc: point.soc
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      deviceDataIndex.set(device.deviceId, sortedData);
    });

    // 为每个时间槽找到最近的SOC值
    const result = timeSlots.map(slotTime => {
      const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
      const localDate = new Date(slotTime + UTC_OFFSET_MS);
      const localHour = String(localDate.getUTCHours()).padStart(2, '0');
      const localMinute = String(localDate.getUTCMinutes()).padStart(2, '0');

      const dataPoint = {
        timestamp: new Date(slotTime).toISOString(),
        time: `${localHour}:${localMinute}`
      };

      // 为每个设备找到最近的SOC值
      selectedDevicesData.forEach(device => {
        const deviceData = deviceDataIndex.get(device.deviceId);

        // 二分查找最近的数据点
        let closestPoint = null;
        let minDiff = Infinity;

        for (const point of deviceData) {
          const diff = Math.abs(point.timestamp - slotTime);
          // 只使用3分钟内的数据点
          if (diff < 3 * 60 * 1000 && diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        }

        if (closestPoint) {
          dataPoint[device.deviceId] = closestPoint.soc;
        }
      });

      return dataPoint;
    });

    return result;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content soc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <Battery size={24} className="modal-icon" />
            <div>
              <h2>设备SOC详情</h2>
              <p className="modal-subtitle">
                {stationName || `电站 ${stationId}`} • {formatDate(date)}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" size={40} />
              <p>加载SOC数据中...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={40} />
              <p>{error}</p>
              <button className="btn-retry" onClick={fetchSocData}>重试</button>
            </div>
          ) : socData && socData.devices && socData.devices.length > 0 ? (
            <>
              {/* 设备选择器 */}
              <div className="device-selector">
                <div className="selector-header">
                  <h3>选择设备 ({selectedDevices.length}/{socData.devices.length})</h3>
                  {socData.alarms && socData.alarms.length > 0 && (
                    <label className="alarm-toggle">
                      <input
                        type="checkbox"
                        checked={showAlarms}
                        onChange={(e) => setShowAlarms(e.target.checked)}
                      />
                      <AlertTriangle size={16} />
                      <span>显示故障时段 ({socData.alarms.length})</span>
                    </label>
                  )}
                </div>
                <div className="device-chips">
                  {socData.devices.map((device, index) => (
                    <button
                      key={device.deviceId}
                      className={`device-chip ${selectedDevices.includes(device.deviceId) ? 'selected' : ''}`}
                      onClick={() => toggleDevice(device.deviceId)}
                      style={{
                        borderColor: selectedDevices.includes(device.deviceId) ? getDeviceColor(index) : 'var(--border)'
                      }}
                    >
                      <div
                        className="device-chip-color"
                        style={{ background: getDeviceColor(index) }}
                      />
                      <span>{device.deviceName}</span>
                      <span className="device-chip-count">({device.data.length}条)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SOC曲线图 */}
              {selectedDevices.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={getChartData()} margin={{ top: 30, right: 30, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                      {/* 故障时间段标记 */}
                      {showAlarms && socData.alarms && socData.alarms.map((alarm, idx) => {
                        // 数据库存储的是UTC+0时间戳，需要加8小时转为UTC+8本地时间
                        const UTC_OFFSET = 8 * 60 * 60 * 1000; // 8小时的毫秒数
                        const startTime = new Date(new Date(alarm.startTime).getTime() + UTC_OFFSET);
                        const endTime = new Date(new Date(alarm.endTime).getTime() + UTC_OFFSET);

                        // 提取时分秒（UTC+8本地时间）
                        const startHour = startTime.getUTCHours();
                        const startMinute = startTime.getUTCMinutes();
                        const endHour = endTime.getUTCHours();
                        const endMinute = endTime.getUTCMinutes();

                        // 生成标签（显示到分钟）
                        const startLabel = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
                        const endLabel = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

                        // 用于ReferenceArea的整点标签
                        const startHourLabel = `${String(startHour).padStart(2, '0')}:00`;
                        const endHourLabel = `${String(endHour).padStart(2, '0')}:00`;

                        return (
                          <ReferenceArea
                            key={`alarm-${idx}`}
                            x1={startHourLabel}
                            x2={endHourLabel}
                            strokeOpacity={0.3}
                            fill="#ff4444"
                            fillOpacity={0.15}
                            label={
                              socData.alarms.length <= 3 ? {
                                value: `故障 ${startLabel}-${endLabel}`,
                                position: 'insideTop',
                                fontSize: 10,
                                fill: '#ff4444',
                                fontWeight: 600
                              } : undefined
                            }
                          />
                        );
                      })}

                      <XAxis
                        dataKey="time"
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 12 }}
                        interval={23}
                      />
                      <YAxis
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 12 }}
                        domain={[0, 100]}
                        label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value.toFixed(1)}%`, 'SOC']}
                      />
                      <Legend />
                      {socData.devices
                        .filter(d => selectedDevices.includes(d.deviceId))
                        .map((device, index) => (
                          <Line
                            key={device.deviceId}
                            type="monotone"
                            dataKey={device.deviceId}
                            name={device.deviceName}
                            stroke={getDeviceColor(index)}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {showAlarms && socData.alarms && socData.alarms.length > 0 && (
                    <div className="chart-hint">
                      <AlertTriangle size={14} />
                      <span>红色区域表示故障时段 ({socData.alarms.length}个)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-chart">
                  <Battery size={48} />
                  <p>请至少选择一个设备查看SOC曲线</p>
                </div>
              )}

              {/* 充放电策略图 */}
              <ChargingStrategyChart date={date} stationId={stationId} />

              {/* 统计信息 */}
              <div className="soc-stats">
                <div className="stat-card">
                  <span className="stat-label">总设备数</span>
                  <span className="stat-value">{socData.totalDevices}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">选中设备</span>
                  <span className="stat-value">{selectedDevices.length}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">总数据点</span>
                  <span className="stat-value">
                    {socData.devices
                      .filter(d => selectedDevices.includes(d.deviceId))
                      .reduce((sum, d) => sum + d.data.length, 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Calendar size={48} />
              <p>该日期没有SOC数据</p>
              <span className="empty-hint">
                请检查设备是否已导入数据，或尝试选择其他日期
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
