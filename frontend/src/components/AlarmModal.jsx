import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, DollarSign, Info } from 'lucide-react';
import { formatUTCAsLocal, formatUTCDateCN } from '../utils/timeFormatter';
import { calculateStationLosses } from '../services/alarmLossService';
import ElectricityPriceChart from './ElectricityPriceChart';
import './AlarmModal.css';

const AlarmModal = ({ isOpen, onClose, stationId, date }) => {
  const [alarms, setAlarms] = useState(null);
  const [alarmLosses, setAlarmLosses] = useState({}); // 存储告警损失数据
  const [alarmDetails, setAlarmDetails] = useState({}); // 存储告警详细计算信息
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !stationId || !date) return;

    const fetchAlarms = async () => {
      try {
        setLoading(true);
        setError(null);

        // 将日期转换为 YYYY-MM-DD 格式
        const formatDateForAPI = (dateStr) => {
          const d = new Date(dateStr);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const formattedDate = formatDateForAPI(date);

        // 获取告警列表
        const response = await fetch(
          `http://localhost:5001/api/alarms/station/${stationId}/daily?date=${formattedDate}`
        );

        if (!response.ok) {
          throw new Error('获取告警数据失败');
        }

        const result = await response.json();
        if (result.success) {
          setAlarms(result.data);

          // 获取告警损失数据
          try {
            const lossResponse = await calculateStationLosses(stationId, {
              startDate: formattedDate,
              endDate: formattedDate
            });

            if (lossResponse.success && lossResponse.data && lossResponse.data.alarms) {
              // 创建告警ID到损失的映射
              const lossMap = {};
              const detailsMap = {};
              lossResponse.data.alarms.forEach(alarm => {
                lossMap[alarm.alarmId] = alarm.loss || 0;
                detailsMap[alarm.alarmId] = {
                  durationHours: alarm.durationHours || 0,
                  lossDetails: alarm.lossDetails || []
                };
              });
              setAlarmLosses(lossMap);
              setAlarmDetails(detailsMap);
            }
          } catch (lossError) {
            console.error('获取告警损失数据失败:', lossError);
            // 损失数据获取失败不影响告警数据显示
          }
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

    fetchAlarms();
  }, [isOpen, stationId, date]);

  if (!isOpen) return null;

  // 使用UTC+8时间格式化（直接读取UTC时间戳的值作为本地时间）
  const formatDateTime = (dateTime) => {
    return formatUTCAsLocal(dateTime, true);
  };

  const getSeverityClass = (severity) => {
    const classMap = {
      critical: 'critical',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return classMap[severity] || 'info';
  };

  // 使用UTC+8时间格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return formatUTCDateCN(dateStr);
  };

  return (
    <div className="alarm-modal-overlay" onClick={onClose}>
      <div className="alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alarm-modal-header">
          <h3>
            <AlertCircle size={20} />
            {formatDate(date)} 损失分析
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="alarm-modal-body">
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

          {!loading && !error && alarms && (
            <>
              {alarms.totalCount === 0 ? (
                <div className="no-alarms-state">
                  <Clock size={48} color="#22c55e" />
                  <p>该日期无告警记录</p>
                  <p className="hint"></p>
                </div>
              ) : (
                <>
                  <div className="alarm-summary">
                    <span>共 {alarms.totalCount} 条告警</span>
                    {alarms.totalDurationFormatted && (
                      <span className="total-duration">总影响时长: {alarms.totalDurationFormatted}</span>
                    )}
                    {Object.keys(alarmLosses).length > 0 && (
                      <span className="total-loss" style={{
                        color: '#ef4444',
                        fontWeight: 600
                      }}>
                        总损失: {new Intl.NumberFormat('zh-CN', {
                          style: 'currency',
                          currency: 'CNY',
                          minimumFractionDigits: 2
                        }).format(Object.values(alarmLosses).reduce((sum, loss) => sum + loss, 0))}
                      </span>
                    )}
                  </div>

                  {/* 电价走势图 */}
                  <ElectricityPriceChart date={date} stationId={stationId} />

                  {alarms.deviceGroups && alarms.deviceGroups.length > 0 && (
                    <div className="device-groups">
                      {alarms.deviceGroups.map((group) => (
                        <div key={group.device} className="device-group">
                          <div className="device-group-header">
                            <h4>{group.deviceName}</h4>
                            <span className="count-badge">{group.count}条</span>
                          </div>

                          <div className="alarms-list">
                            {group.alarms.map((alarm) => (
                              <div key={alarm.alarmId} className="alarm-card">
                                <div className="alarm-card-header">
                                  <span className={`severity-badge ${getSeverityClass(alarm.severity)}`}>
                                    {alarm.severityName}
                                  </span>
                                  <span className="alarm-duration">
                                    <Clock size={14} />
                                    {alarm.durationFormatted}
                                  </span>
                                </div>

                                <div className="alarm-id" style={{
                                  fontSize: '0.85rem',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '0.5rem',
                                  fontFamily: 'monospace'
                                }}>
                                  ID: {alarm.alarmId}
                                </div>

                                {/* 显示网关设备ID */}
                                {alarm.gatewayDeviceId && (
                                  <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <span style={{ color: 'var(--text-tertiary)' }}>网关:</span>
                                    <span style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                      background: 'var(--surface)',
                                      border: '1px solid var(--border)',
                                      color: 'var(--text-secondary)'
                                    }}>
                                      {alarm.gatewayDeviceId}
                                    </span>
                                  </div>
                                )}

                                <div className="alarm-name">{alarm.alarmName}</div>

                                <div className="alarm-time">
                                  <div className="time-row">
                                    <span className="time-label">开始:</span>
                                    <span>{formatDateTime(alarm.startTime)}</span>
                                  </div>
                                  <div className="time-row">
                                    <span className="time-label">结束:</span>
                                    <span>{formatDateTime(alarm.endTime)}</span>
                                  </div>
                                </div>

                                {/* 显示告警损失金额 */}
                                {alarmLosses[alarm.alarmId] !== undefined && (
                                  <>
                                    <div className="alarm-loss" style={{
                                      marginTop: '0.75rem',
                                      paddingTop: '0.75rem',
                                      borderTop: '1px solid var(--border)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <DollarSign size={16} style={{ color: '#ef4444' }} />
                                      <span style={{
                                        fontSize: '0.9rem',
                                        color: 'var(--text-secondary)'
                                      }}>
                                        损失金额:
                                      </span>
                                      <span style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: alarmLosses[alarm.alarmId] > 0 ? '#ef4444' : 'var(--text-secondary)'
                                      }}>
                                        {alarmLosses[alarm.alarmId] > 0
                                          ? new Intl.NumberFormat('zh-CN', {
                                              style: 'currency',
                                              currency: 'CNY',
                                              minimumFractionDigits: 2
                                            }).format(alarmLosses[alarm.alarmId])
                                          : '¥0.00'
                                        }
                                      </span>
                                    </div>
                                    {/* 计算说明 - 显示实际数值或无损失原因 */}
                                    {alarmDetails[alarm.alarmId] && (
                                      alarmLosses[alarm.alarmId] > 0 ? (
                                        // 有损失时显示计算详情
                                      <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--card-bg)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.6'
                                      }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '0.5rem'
                                        }}>
                                          <Info size={14} style={{
                                            marginTop: '0.2rem',
                                            flexShrink: 0,
                                            color: 'var(--accent)'
                                          }} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                                              计算详情:
                                            </div>
                                            {(() => {
                                              const details = alarmDetails[alarm.alarmId];
                                              const lossDetails = details.lossDetails || [];

                                              // 如果有详细信息，显示实际参数
                                              if (lossDetails.length > 0) {
                                                // 计算平均功率和平均电价
                                                const avgPower = (lossDetails.reduce((sum, d) => sum + d.power, 0) / lossDetails.length).toFixed(2);
                                                const avgPrice = (lossDetails.reduce((sum, d) => sum + d.price, 0) / lossDetails.length).toFixed(4);
                                                const loss = alarmLosses[alarm.alarmId].toFixed(2);

                                                return (
                                                  <>
                                                    <div style={{
                                                      fontFamily: 'monospace',
                                                      fontSize: '0.85rem',
                                                      backgroundColor: 'var(--bg-secondary)',
                                                      padding: '0.5rem',
                                                      borderRadius: '4px',
                                                      marginBottom: '0.5rem'
                                                    }}>
                                                      <div style={{ marginBottom: '0.25rem' }}>
                                                        损失 = <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{details.durationHours} 小时</span> × <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{avgPower} kW</span> × <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{avgPrice} 元/kWh</span>
                                                      </div>
                                                      <div style={{
                                                        paddingTop: '0.25rem',
                                                        borderTop: '1px dashed var(--border)',
                                                        color: '#ef4444',
                                                        fontWeight: 600
                                                      }}>
                                                        = ¥{loss}
                                                      </div>
                                                    </div>
                                                    <div style={{
                                                      fontSize: '0.75rem',
                                                      color: 'var(--text-tertiary)',
                                                      lineHeight: '1.4'
                                                    }}>
                                                      • 仅计算充电/放电周期内的告警<br/>
                                                      • 排除17:00-23:59:59时段
                                                    </div>
                                                  </>
                                                );
                                              } else {
                                                // 如果没有详细信息，显示通用公式
                                                return (
                                                  <>
                                                    <div>
                                                      损失 = 时长(小时) × 功率(kW) × 电价(元/kWh)
                                                    </div>
                                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                                      • 仅计算充电/放电周期内的告警
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem' }}>
                                                      • 排除17:00-23:59:59时段
                                                    </div>
                                                  </>
                                                );
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      // 无损失时显示原因
                                      <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--card-bg)',
                                        borderRadius: '6px',
                                        border: '1px solid #10b981',
                                        fontSize: '0.8rem',
                                        lineHeight: '1.6'
                                      }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '0.5rem'
                                        }}>
                                          <Info size={14} style={{
                                            marginTop: '0.2rem',
                                            flexShrink: 0,
                                            color: '#10b981'
                                          }} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, marginBottom: '0.25rem', color: '#10b981' }}>
                                              无损失原因:
                                            </div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                              {(() => {
                                                const details = alarmDetails[alarm.alarmId];
                                                const socTargetNote = details.socTargetDetails?.socTargetNote || '';
                                                const calculationNote = details.calculationNote || '';

                                                if (socTargetNote.includes('已达到目标')) {
                                                  return '✓ SOC达标 - 故障未影响充放电目标';
                                                } else if (calculationNote.includes('排除时段')) {
                                                  return '⊘ 排除时段 - 故障发生在17:00-23:59:59';
                                                } else if (calculationNote.includes('待机周期')) {
                                                  return '⊙ 待机周期 - 故障发生在待机期间';
                                                } else if (calculationNote.includes('未找到充放电策略')) {
                                                  return '⚠ 无策略数据';
                                                } else if (calculationNote.includes('故障不在充放电周期内')) {
                                                  return '⊙ 非充放电周期';
                                                } else {
                                                  return '✓ 未产生损失';
                                                }
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlarmModal;
