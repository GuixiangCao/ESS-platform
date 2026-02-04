import { useState, useEffect } from 'react';
import { AlertTriangle, Zap, Cloud, TrendingDown, TrendingUp, DollarSign, Calendar, LineChart, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import AlarmModal from '../components/AlarmModal';
import MonthlyAlarmModal from '../components/MonthlyAlarmModal';
import AlarmPieChart from '../components/AlarmPieChart';
import LossPieChart from '../components/LossPieChart';
import LossBreakdownPieChart from '../components/LossBreakdownPieChart';
import SocDetailModal from '../components/SocDetailModal';
import EquipmentOutageDetailModal from '../components/EquipmentOutageDetailModal';
import UnplannedOutageDetailModal from '../components/UnplannedOutageDetailModal';
import { getDailyChargingStats } from '../services/chargingStrategyService';
import { calculateStationLosses, getHolidayLosses, getUnplannedOutageLosses } from '../services/alarmLossService';
import './LossAnalysis.css';

export default function LossAnalysis({ stationId, stationData }) {
  const [lossStats, setLossStats] = useState(null);
  const [lossComparison, setLossComparison] = useState([]);
  const [alarmStats, setAlarmStats] = useState(null);
  const [chargingStats, setChargingStats] = useState({}); // 充放电统计数据
  const [alarmLossData, setAlarmLossData] = useState({}); // 告警损失数据
  const [holidayLossData, setHolidayLossData] = useState(null); // 节假日损失数据
  const [unplannedOutageLossData, setUnplannedOutageLossData] = useState(null); // 非计划性停机损失数据
  const [allAlarms, setAllAlarms] = useState([]); // 所有告警详细列表
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showMonthlyAlarmModal, setShowMonthlyAlarmModal] = useState(false);
  const [showSocModal, setShowSocModal] = useState(false);
  const [showEquipmentOutageModal, setShowEquipmentOutageModal] = useState(false);
  const [showUnplannedOutageModal, setShowUnplannedOutageModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [timeView, setTimeView] = useState('daily'); // 'daily' or 'monthly'
  const [showAlarmDetails, setShowAlarmDetails] = useState(false); // 控制告警明细表格的展开/收起

  // Debug: log alarmStats whenever it changes
  useEffect(() => {
    console.log('=== alarmStats state changed:', alarmStats);
  }, [alarmStats]);

  useEffect(() => {
    if (stationId && stationData) {
      fetchLossData();
    }
  }, [stationId, stationData]);

  const fetchLossData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // 获取损失统计
      const statsResponse = await axios.get(
        `/api/revenue/station/${stationId}/loss-stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 获取收益与损失对比
      const comparisonResponse = await axios.get(
        `/api/revenue/station/${stationId}/loss-comparison`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (statsResponse.data.success) {
        setLossStats(statsResponse.data.data);
      }

      if (comparisonResponse.data.success) {
        const comparisonData = comparisonResponse.data.data;

        // 获取充放电统计数据
        try {
          const chargingResponse = await getDailyChargingStats({
            stationId,
            limit: 1000 // 获取足够多的数据
          });

          if (chargingResponse.success) {
            // 创建一个映射，key为日期字符串
            const chargingMap = {};
            chargingResponse.data.forEach(stat => {
              const dateKey = new Date(stat.date).toISOString().split('T')[0];
              if (!chargingMap[dateKey]) {
                chargingMap[dateKey] = [];
              }
              chargingMap[dateKey].push(stat);
            });
            setChargingStats(chargingMap);
          }
        } catch (chargingError) {
          console.error('获取充放电统计失败:', chargingError);
        }

        // 为每一天获取告警数量和告警损失
        const dataWithAlarmInfo = await Promise.all(
          comparisonData.map(async (day) => {
            try {
              // 将日期转换为 YYYY-MM-DD 格式
              const dateObj = new Date(day.date);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dayStr = String(dateObj.getDate()).padStart(2, '0');
              const formattedDate = `${year}-${month}-${dayStr}`;

              const alarmResponse = await fetch(
                `http://localhost:5001/api/alarms/station/${stationId}/daily?date=${formattedDate}`
              );

              let alarmCount = 0;
              let alarmLoss = 0;
              let alarmDetails = []; // 保存告警详细列表

              if (alarmResponse.ok) {
                const alarmResult = await alarmResponse.json();
                alarmCount = alarmResult.success ? alarmResult.data.totalCount : 0;
              }

              // 计算该天的告警损失（只计算当天）
              try {
                const lossResponse = await calculateStationLosses(stationId, {
                  startDate: formattedDate,
                  endDate: formattedDate
                });

                if (lossResponse.success && lossResponse.data) {
                  alarmLoss = lossResponse.data.totalLoss || 0;
                  alarmDetails = lossResponse.data.alarms || []; // 保存告警详细数据
                }
              } catch (lossError) {
                console.error('计算告警损失失败:', lossError);
              }

              return {
                ...day,
                alarmCount,
                alarmLoss,
                alarmDetails // 添加告警详细列表
              };
            } catch (error) {
              console.error('获取告警信息失败:', error);
            }
            return { ...day, alarmCount: 0, alarmLoss: 0, alarmDetails: [] };
          })
        );

        setLossComparison(dataWithAlarmInfo);

        // 汇总所有告警
        const allAlarmsArray = dataWithAlarmInfo.flatMap(day => day.alarmDetails || []);
        setAllAlarms(allAlarmsArray);

        // 获取节假日损失数据（移到这里，在 comparisonData 作用域内）
        try {
          // 计算日期范围
          const dates = comparisonData.map(d => new Date(d.date));
          const startDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
          const endDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

          console.log('=== 开始获取节假日损失数据 ===');
          console.log('日期范围:', startDate, '至', endDate);
          console.log('电站ID:', stationId);

          const holidayResponse = await getHolidayLosses(stationId, {
            startDate,
            endDate
          });

          console.log('=== 节假日损失API响应 ===', holidayResponse);

          if (holidayResponse.success) {
            console.log('=== 节假日损失数据详情 ===');
            console.log('节假日总损失:', holidayResponse.data.totalHolidayLoss);
            console.log('节假日数量:', holidayResponse.data.holidayCount);
            console.log('缺失数据数量:', holidayResponse.data.missingDataCount);
            setHolidayLossData(holidayResponse.data);
          } else {
            console.warn('=== 节假日损失API返回失败状态 ===');
          }

          // 获取非计划性停机损失（工作日SOC无变化的损失）
          console.log('=== 开始获取非计划性停机损失数据 ===');
          const unplannedOutageResponse = await getUnplannedOutageLosses(stationId, {
            startDate,
            endDate
          });

          console.log('=== 非计划性停机损失API响应 ===', unplannedOutageResponse);

          if (unplannedOutageResponse.success) {
            console.log('=== 非计划性停机损失数据详情 ===');
            console.log('非计划性停机总损失:', unplannedOutageResponse.data.totalUnplannedOutageLoss);
            console.log('工作日数量:', unplannedOutageResponse.data.workdayCount);
            console.log('无充放电天数:', unplannedOutageResponse.data.noChargingDays);
            setUnplannedOutageLossData(unplannedOutageResponse.data);
          } else {
            console.warn('=== 非计划性停机损失API返回失败状态 ===');
          }
        } catch (holidayError) {
          console.error('=== 获取节假日/非计划性停机损失数据失败 ===', holidayError);
        }
      }

      // 获取告警统计数据（不限制日期范围，获取该站点的所有告警）
      try {
        console.log('=== Fetching alarm stats for station:', stationId);

        const alarmResponse = await fetch(
          `http://localhost:5001/api/alarms/station/${stationId}/stats?_t=${Date.now()}`
        );

        console.log('=== Alarm response status:', alarmResponse.status);

        if (alarmResponse.ok) {
          const alarmResult = await alarmResponse.json();
          console.log('=== Alarm result:', alarmResult);

          if (alarmResult.success && alarmResult.data.totalCount > 0) {
            console.log('=== Setting alarm stats with data:', alarmResult.data);
            setAlarmStats(alarmResult.data);
          } else {
            console.log('=== No alarm data or unsuccessful response');
          }
        } else {
          console.error('=== Alarm response not OK:', alarmResponse.status);
        }
      } catch (alarmError) {
        console.error('=== Error fetching alarm stats:', alarmError);
      }
    } catch (error) {
      console.error('获取损失数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatMonth = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
  };

  // 按月聚合数据
  const aggregateByMonth = (data) => {
    const monthlyData = {};

    data.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          expectedRevenue: 0,
          actualRevenue: 0,
          revenueLoss: 0,
          alarmCount: 0,
          alarmLoss: 0,
          chargingHours: 0,
          dischargingHours: 0,
          lossBreakdown: {},
          dayCount: 0
        };
      }

      monthlyData[monthKey].expectedRevenue += day.expectedRevenue;
      monthlyData[monthKey].actualRevenue += day.actualRevenue;
      monthlyData[monthKey].revenueLoss += day.revenueLoss;
      monthlyData[monthKey].alarmCount += (day.alarmCount || 0);
      monthlyData[monthKey].alarmLoss += (day.alarmLoss || 0);
      monthlyData[monthKey].dayCount += 1;

      // 聚合充放电时长
      const chargingData = getChargingDataForDate(day.date);
      if (chargingData) {
        monthlyData[monthKey].chargingHours += chargingData.chargingHours;
        monthlyData[monthKey].dischargingHours += chargingData.dischargingHours;
      }

      // 聚合损失分类
      if (day.lossBreakdown && day.lossBreakdown.length > 0) {
        day.lossBreakdown.forEach(loss => {
          if (!monthlyData[monthKey].lossBreakdown[loss.lossType]) {
            monthlyData[monthKey].lossBreakdown[loss.lossType] = {
              lossType: loss.lossType,
              lossTypeName: loss.lossTypeName,
              totalLoss: 0
            };
          }
          monthlyData[monthKey].lossBreakdown[loss.lossType].totalLoss += loss.totalLoss;
        });
      }
    });

    // 转换为数组并计算达成率
    return Object.values(monthlyData).map(month => ({
      ...month,
      achievementRate: month.expectedRevenue > 0
        ? ((month.actualRevenue / month.expectedRevenue) * 100).toFixed(2)
        : '0.00',
      lossBreakdown: Object.values(month.lossBreakdown)
    }));
  };

  const getLossTypeIcon = (lossType) => {
    switch (lossType) {
      case 'planned_shutdown':
        return <Calendar size={20} />;
      case 'equipment_failure':
        return <Zap size={20} />;
      case 'external_factors':
        return <Cloud size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  const getLossTypeColor = (lossType) => {
    switch (lossType) {
      case 'planned_shutdown':
        return '#3b82f6'; // 蓝色 - 计划性停运
      case 'equipment_failure':
        return '#dc2626'; // 深红色 - 设备故障
      case 'external_factors':
        return '#f97316'; // 深橙色 - 外界因素
      default:
        return '#6b7280';
    }
  };

  // 处理损失饼图点击事件
  const handleLossBreakdownClick = (lossType, value) => {
    console.log('点击损失类型:', lossType, '金额:', value);

    if (lossType === '故障停机损失' || lossType === '设备停机损失') {
      // 打开设备停机损失详情弹窗
      setShowEquipmentOutageModal(true);
    } else if (lossType === '非计划性停机损失') {
      // 打开非计划性停机损失详情弹窗
      setShowUnplannedOutageModal(true);
    }
    // 可以在这里添加其他损失类型的处理逻辑
  };

  // 为每个设备类型分配固定颜色
  const getDeviceColor = (device) => {
    const deviceColorMap = {
      lc: '#ef4444',      // 红色 - LC设备
      pcs: '#fb923c',     // 亮橙色 - PCS设备
      cluster: '#fbbf24', // 亮黄色 - 簇控设备
      meter: '#a3e635',   // 亮黄绿 - 电表
      highMeter: '#10b981', // 翠绿色 - 高压电表
      ac: '#14b8a6',      // 青绿色 - 空调
      ems: '#8b5cf6'      // 紫色 - EMS系统
    };
    return deviceColorMap[device] || '#6b7280';
  };

  // 获取指定日期的充放电数据
  const getChargingDataForDate = (date) => {
    const dateKey = new Date(date).toISOString().split('T')[0];
    const stats = chargingStats[dateKey];

    if (!stats || stats.length === 0) {
      return null;
    }

    // 汇总所有网关的充放电时长
    const total = stats.reduce((acc, stat) => ({
      chargingHours: acc.chargingHours + (stat.chargingHours || 0),
      dischargingHours: acc.dischargingHours + (stat.dischargingHours || 0),
      idleHours: acc.idleHours + (stat.idleHours || 0)
    }), { chargingHours: 0, dischargingHours: 0, idleHours: 0 });

    return total;
  };

  if (loading) {
    return (
      <div className="loss-analysis-loading">
        <div className="spinner"></div>
        <p>加载损失分析数据中...</p>
      </div>
    );
  }

  return (
    <div className="loss-analysis-container">
      <div className="loss-analysis-header">
        <h2>收益损失分析</h2>
        <p className="section-subtitle">分析每日收益损失的原因分类</p>
      </div>

      {/* 收益对比概览 */}
      {lossComparison.length > 0 && (() => {
        const totals = lossComparison.reduce((acc, day) => ({
          expectedRevenue: acc.expectedRevenue + (day.expectedRevenue || 0),
          actualRevenue: acc.actualRevenue + (day.actualRevenue || 0),
          revenueLoss: acc.revenueLoss + (day.revenueLoss || 0),
          alarmLoss: acc.alarmLoss + (day.alarmLoss || 0)
        }), { expectedRevenue: 0, actualRevenue: 0, revenueLoss: 0, alarmLoss: 0 });

        const achievementRate = totals.expectedRevenue > 0
          ? ((totals.actualRevenue / totals.expectedRevenue) * 100).toFixed(2)
          : '0.00';

        const lossRate = totals.expectedRevenue > 0
          ? ((totals.revenueLoss / totals.expectedRevenue) * 100).toFixed(2)
          : '0.00';

        const alarmLossRate = totals.revenueLoss > 0
          ? ((totals.alarmLoss / totals.revenueLoss) * 100).toFixed(2)
          : '0.00';

        return (
          <div className="revenue-summary-cards">
            <div className="revenue-summary-card expected">
              <div className="card-icon">
                <TrendingUp size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">预期收益</div>
                <div className="card-value">{formatCurrency(totals.expectedRevenue)}</div>
                <div className="card-meta">总计划收益</div>
              </div>
            </div>

            <div className="revenue-summary-card actual">
              <div className="card-icon">
                <DollarSign size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">实际收益</div>
                <div className="card-value">{formatCurrency(totals.actualRevenue)}</div>
                <div className="card-meta">
                  达成率 <span className={`achievement-inline ${
                    parseFloat(achievementRate) >= 90 ? 'success' :
                    parseFloat(achievementRate) >= 70 ? 'warning' : 'danger'
                  }`}>{achievementRate}%</span>
                </div>
              </div>
            </div>

            <div className="revenue-summary-card difference">
              <div className="card-icon">
                <AlertTriangle size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">损失收益</div>
                <div className="card-value">{formatCurrency(totals.revenueLoss)}</div>
                <div className="card-meta">
                  损失率 <span className={`achievement-inline ${
                    parseFloat(lossRate) <= 10 ? 'success' :
                    parseFloat(lossRate) <= 30 ? 'warning' : 'danger'
                  }`}>{lossRate}%</span>
                  {totals.alarmLoss > 0 && (
                    <>
                      {' · '}停机损失占比 <span className={`achievement-inline ${
                        parseFloat(alarmLossRate) <= 30 ? 'success' :
                        parseFloat(alarmLossRate) <= 60 ? 'warning' : 'danger'
                      }`}>{alarmLossRate}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 损失收益分析 */}
      {lossComparison.length > 0 && (() => {
        // 计算总告警损失和总损失收益
        const totals = lossComparison.reduce((acc, day) => ({
          alarmLoss: acc.alarmLoss + (day.alarmLoss || 0),
          revenueLoss: acc.revenueLoss + (day.revenueLoss || 0)
        }), { alarmLoss: 0, revenueLoss: 0 });

        // Debug: log data being passed to pie chart
        console.log('=== 饼图数据调试 ===');
        console.log('告警损失总计 (alarmLoss):', totals.alarmLoss);
        console.log('总损失收益 (totalRevenueLoss):', totals.revenueLoss);
        console.log('节假日损失数据状态:', holidayLossData);
        console.log('节假日损失金额 (holidayLoss):', holidayLossData?.totalHolidayLoss || 0);
        console.log('其他损失:', totals.revenueLoss - totals.alarmLoss - (holidayLossData?.totalHolidayLoss || 0));

        return (
          <div className="loss-pie-chart-section">
            <h3>损失收益分析</h3>
            <p className="chart-description">分析损失收益的具体构成，包括设备停机损失、非计划性停机损失、节假日损失和其他类型损失</p>
            <div className="loss-pie-container">
              <LossBreakdownPieChart
                alarmLoss={totals.alarmLoss}
                totalRevenueLoss={totals.revenueLoss}
                holidayLoss={holidayLossData?.totalHolidayLoss || 0}
                unplannedOutageLoss={unplannedOutageLossData?.totalUnplannedOutageLoss || 0}
                onItemClick={handleLossBreakdownClick}
                getLossTypeColor={getLossTypeColor}
              />
            </div>

            {/* 告警损失明细表格 */}
            {allAlarms.length > 0 && (
              <div className="alarm-loss-details" style={{ marginTop: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                      设备停机损失明细
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 400
                      }}>
                        ({allAlarms.filter(alarm => alarm.loss > 0).length} 条记录)
                      </span>
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      paddingLeft: '0.25rem',
                      borderLeft: '3px solid var(--warning)',
                      background: 'rgba(251, 191, 36, 0.1)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '4px'
                    }}>
                      <span>• 节假日告警单独统计，不计入此表</span>
                      <span>• 表格中显示的是每个告警单独计算的损失（仅供参考）</span>
                      <span>• 实际总损失已对时间重叠的告警进行去重处理</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAlarmDetails(!showAlarmDetails)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    {showAlarmDetails ? '收起' : '展开'}
                    {showAlarmDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {showAlarmDetails && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="alarm-loss-table" style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.9rem'
                    }}>
                      <thead>
                        <tr style={{
                          background: 'var(--surface-hover)',
                          borderBottom: '2px solid var(--border)'
                        }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>告警ID</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>网关设备ID</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>告警名称</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>设备</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>开始时间</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>持续时长</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>时间损失</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>SOC目标损失</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>总损失</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAlarms
                          .filter(alarm => alarm.loss > 0) // 只显示有损失的告警
                          .sort((a, b) => b.loss - a.loss) // 按损失从大到小排序
                          .map((alarm, index) => (
                          <tr key={alarm.alarmId} style={{
                            borderBottom: '1px solid var(--border)',
                            background: index % 2 === 0 ? 'transparent' : 'var(--surface-hover)'
                          }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                              {alarm.alarmId}
                              {alarm.isHoliday && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  padding: '0.2rem 0.5rem',
                                  background: '#dbeafe',
                                  color: '#3b82f6',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 500
                                }}>
                                  节假日
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {alarm.gatewayDeviceId ? (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.85rem',
                                  fontFamily: 'monospace',
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-secondary)'
                                }}>
                                  {alarm.gatewayDeviceId}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>{alarm.alarmName}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                background: 'var(--surface-hover)',
                                border: '1px solid var(--border)'
                              }}>
                                {alarm.device}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {new Date(alarm.startTime).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              {alarm.durationHours} 小时
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                              {formatCurrency(alarm.timeLoss || 0)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              {alarm.socTargetLoss > 0 ? (
                                <span style={{
                                  fontWeight: 600,
                                  color: '#8b5cf6',
                                  cursor: 'help',
                                  borderBottom: '1px dashed var(--border)'
                                }} title={alarm.socTargetDetails?.socTargetNote || ''}>
                                  {formatCurrency(alarm.socTargetLoss)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              {alarm.loss > 0 ? (
                                <span style={{ fontWeight: 600, color: '#ef4444' }}>
                                  {formatCurrency(alarm.loss)}
                                </span>
                              ) : (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    ¥0.00
                                  </div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#10b981',
                                    cursor: 'help',
                                    borderBottom: '1px dashed #10b981',
                                    display: 'inline-block'
                                  }} title={
                                    alarm.socTargetDetails?.socTargetNote?.includes('已达到目标')
                                      ? `${alarm.socTargetDetails.socTargetNote}\n虽有故障但未影响充放电目标，无损失`
                                      : alarm.calculationNote || '不在计算范围内'
                                  }>
                                    {alarm.socTargetDetails?.socTargetNote?.includes('已达到目标')
                                      ? 'SOC达标'
                                      : alarm.calculationNote?.includes('17:00-23:59:59')
                                        ? '排除时段'
                                        : alarm.calculationNote?.includes('不在充电或放电周期')
                                          ? '非充放电周期'
                                          : '无损失'}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{
                          borderTop: '2px solid var(--border)',
                          background: 'var(--surface-hover)',
                          fontWeight: 600
                        }}>
                          <td colSpan="6" style={{ padding: '0.75rem', textAlign: 'right' }}>总计：</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f59e0b' }}>
                            {formatCurrency(allAlarms.reduce((sum, a) => sum + (a.timeLoss || 0), 0))}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#8b5cf6' }}>
                            {formatCurrency(allAlarms.reduce((sum, a) => sum + (a.socTargetLoss || 0), 0))}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                            {formatCurrency(totals.alarmLoss)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 损失统计概览 */}
      {(() => {
        console.log('=== Render: lossStats:', lossStats);
        console.log('=== Render: alarmStats:', alarmStats);
        return null;
      })()}
      {lossStats && lossStats.stats.length > 0 ? (
        <>
          <div className="loss-stats-cards">
            <div className="loss-stat-card total">
              <div className="card-icon">
                <TrendingDown size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">总损失金额</div>
                <div className="card-value">{formatCurrency(lossStats.totalLoss)}</div>
                <div className="card-meta">{lossStats.summary.totalIncidents} 次事件</div>
              </div>
            </div>

            {lossStats.stats.map((stat) => (
              <div
                key={stat.lossType}
                className="loss-stat-card"
                style={{ borderLeftColor: getLossTypeColor(stat.lossType) }}
              >
                <div
                  className="card-icon"
                  style={{ background: `${getLossTypeColor(stat.lossType)}20` }}
                >
                  <div style={{ color: getLossTypeColor(stat.lossType) }}>
                    {getLossTypeIcon(stat.lossType)}
                  </div>
                </div>
                <div className="card-content">
                  <div className="card-label">{stat.lossTypeName}</div>
                  <div className="card-value" style={{ color: getLossTypeColor(stat.lossType) }}>
                    {formatCurrency(stat.totalLoss)}
                  </div>
                  <div className="card-meta">
                    {stat.count} 次 · 平均 {formatCurrency(stat.avgLoss)}
                    {stat.totalDuration > 0 && ` · ${stat.totalDuration.toFixed(1)}小时`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 损失类型占比图 */}
          <div className="loss-pie-chart-section">
            <h3>损失类型占比</h3>
            <div className="loss-pie-container">
              <LossPieChart
                data={lossStats.stats}
                getLossTypeColor={getLossTypeColor}
              />
            </div>
          </div>

          {/* 设备故障告警统计 */}
          {alarmStats && alarmStats.totalCount > 0 && (
            <div className="alarm-stats-section">
              <h3>设备停机统计</h3>

              <div className="alarm-summary-cards">
                <div className="alarm-summary-card">
                  <div className="card-label">总停机次数</div>
                  <div className="card-value">{alarmStats.totalCount} 次</div>
                </div>
                <div className="alarm-summary-card">
                  <div className="card-label">累计停机时长</div>
                  <div className="card-value">{alarmStats.totalDurationHours} 小时</div>
                </div>
              </div>

              <div className="alarm-charts-grid">
                {/* 按设备告警次数饼图 */}
                <div className="alarm-chart-container">
                  <h4>按设备类型告警次数</h4>
                  <AlarmPieChart
                    data={alarmStats.deviceStats}
                    type="count"
                    getDeviceColor={getDeviceColor}
                  />
                </div>

                {/* 按设备告警时长饼图 */}
                <div className="alarm-chart-container">
                  <h4>按设备类型累计停机时长</h4>
                  <AlarmPieChart
                    data={alarmStats.deviceStats}
                    type="duration"
                    getDeviceColor={getDeviceColor}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 即使没有手动记录,也显示告警统计 */}
          {(() => {
            console.log('=== In else branch - alarmStats:', alarmStats);
            console.log('=== Condition check:', alarmStats && alarmStats.totalCount > 0);
            return null;
          })()}
          {alarmStats && alarmStats.totalCount > 0 && (
            <div className="alarm-stats-section">
              <h3>设备停机统计</h3>

              <div className="alarm-summary-cards">
                <div className="alarm-summary-card">
                  <div className="card-label">总停机次数</div>
                  <div className="card-value">{alarmStats.totalCount} 次</div>
                </div>
                <div className="alarm-summary-card">
                  <div className="card-label">累计停机时长</div>
                  <div className="card-value">{alarmStats.totalDurationHours} 小时</div>
                </div>
              </div>

              <div className="alarm-charts-grid">
                {/* 按设备告警次数饼图 */}
                <div className="alarm-chart-container">
                  <h4>停机次数</h4>
                  <AlarmPieChart
                    data={alarmStats.deviceStats}
                    type="count"
                    getDeviceColor={getDeviceColor}
                  />
                </div>

                {/* 按设备告警时长饼图 */}
                <div className="alarm-chart-container">
                  <h4>累计停机时长</h4>
                  <AlarmPieChart
                    data={alarmStats.deviceStats}
                    type="duration"
                    getDeviceColor={getDeviceColor}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 每日收益与损失对比表格 */}
      {lossComparison.length > 0 && (
        <div className="loss-comparison-section">
          <div className="section-header">
            <h3>收益损失详情</h3>
            <div className="time-view-tabs">
              <button
                className={`view-tab ${timeView === 'daily' ? 'active' : ''}`}
                onClick={() => setTimeView('daily')}
              >
                按日查看
              </button>
              <button
                className={`view-tab ${timeView === 'monthly' ? 'active' : ''}`}
                onClick={() => setTimeView('monthly')}
              >
                按月查看
              </button>
            </div>
          </div>
          <div className="loss-table-container">
            <table className="loss-table">
              <thead>
                <tr>
                  <th>{timeView === 'daily' ? '日期' : '月份'}</th>
                  <th>预期收益</th>
                  <th>实际收益</th>
                  <th>收益损失</th>
                  <th>达成率</th>
                  <th>故障数</th>
                  <th>告警损失</th>
                  <th>损失原因</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {timeView === 'daily' ? (
                  // 按日查看
                  lossComparison
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((day, index) => {
                      return (
                        <tr key={index}>
                          <td>{formatDate(day.date)}</td>
                          <td className="amount">{formatCurrency(day.expectedRevenue)}</td>
                          <td className="amount">{formatCurrency(day.actualRevenue)}</td>
                          <td className="amount loss">{formatCurrency(day.revenueLoss)}</td>
                          <td>
                            <span className={`achievement-badge ${
                              parseFloat(day.achievementRate) >= 90 ? 'success' :
                              parseFloat(day.achievementRate) >= 70 ? 'warning' : 'danger'
                            }`}>
                              {day.achievementRate}%
                            </span>
                          </td>
                          <td className="alarm-count">
                            <span className={`alarm-count-badge ${day.alarmCount > 0 ? 'has-alarms' : 'no-alarms'}`}>
                              {day.alarmCount || 0}
                            </span>
                          </td>
                          <td className="amount alarm-loss">
                            {day.alarmLoss > 0 ? (
                              <span className="alarm-loss-badge">
                                {formatCurrency(day.alarmLoss)}
                              </span>
                            ) : (
                              <span className="no-loss">-</span>
                            )}
                          </td>
                          <td>
                            <div className="loss-breakdown">
                              {day.lossBreakdown && day.lossBreakdown.length > 0 && (
                                day.lossBreakdown.map((loss, i) => (
                                  <div key={i} className="loss-item">
                                    <span
                                      className="loss-type-badge"
                                      style={{
                                        background: `${getLossTypeColor(loss.lossType)}20`,
                                        color: getLossTypeColor(loss.lossType)
                                      }}
                                    >
                                      {loss.lossTypeName}
                                    </span>
                                    <span className="loss-amount-small">
                                      {formatCurrency(loss.totalLoss)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="view-alarm-btn"
                                onClick={() => {
                                  setSelectedDate(day.date);
                                  setShowAlarmModal(true);
                                }}
                              >
                                查看损失分析
                              </button>
                              <button
                                className="view-soc-btn"
                                onClick={() => {
                                  console.log('🔵 [点击SOC按钮] 原始 day.date:', day.date);
                                  console.log('🔵 [点击SOC按钮] day.date类型:', typeof day.date);
                                  console.log('🔵 [点击SOC按钮] day对象:', JSON.stringify(day, null, 2));

                                  // Convert ISO string to local date YYYY-MM-DD
                                  const dateObj = new Date(day.date);
                                  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
                                  const localDate = new Date(dateObj.getTime() + UTC_OFFSET_MS);
                                  const year = localDate.getUTCFullYear();
                                  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
                                  const dayStr = String(localDate.getUTCDate()).padStart(2, '0');
                                  const formattedDate = `${year}-${month}-${dayStr}`;

                                  console.log('🔵 [转换后的本地日期]:', formattedDate);
                                  setSelectedDate(formattedDate);
                                  setShowSocModal(true);
                                }}
                              >
                                <LineChart size={14} />
                                查看SOC详情
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  // 按月查看
                  aggregateByMonth(lossComparison)
                    .sort((a, b) => b.month.localeCompare(a.month))
                    .map((month, index) => (
                      <tr key={index}>
                        <td>{formatMonth(month.month)}</td>
                        <td className="amount">{formatCurrency(month.expectedRevenue)}</td>
                        <td className="amount">{formatCurrency(month.actualRevenue)}</td>
                        <td className="amount loss">{formatCurrency(month.revenueLoss)}</td>
                        <td>
                          <span className={`achievement-badge ${
                            parseFloat(month.achievementRate) >= 90 ? 'success' :
                            parseFloat(month.achievementRate) >= 70 ? 'warning' : 'danger'
                          }`}>
                            {month.achievementRate}%
                          </span>
                        </td>
                        <td className="alarm-count">
                          <span className={`alarm-count-badge ${month.alarmCount > 0 ? 'has-alarms' : 'no-alarms'}`}>
                            {month.alarmCount}
                          </span>
                        </td>
                        <td className="amount alarm-loss">
                          {month.alarmLoss > 0 ? (
                            <span className="alarm-loss-badge">
                              {formatCurrency(month.alarmLoss)}
                            </span>
                          ) : (
                            <span className="no-loss">-</span>
                          )}
                        </td>
                        <td>
                          <div className="loss-breakdown">
                            {month.lossBreakdown && month.lossBreakdown.length > 0 && (
                              month.lossBreakdown.map((loss, i) => (
                                <div key={i} className="loss-item">
                                  <span
                                    className="loss-type-badge"
                                    style={{
                                      background: `${getLossTypeColor(loss.lossType)}20`,
                                      color: getLossTypeColor(loss.lossType)
                                    }}
                                  >
                                    {loss.lossTypeName}
                                  </span>
                                  <span className="loss-amount-small">
                                    {formatCurrency(loss.totalLoss)}
                                  </span>
                                </div>
                              ))
                            )}
                            {/* 添加查看损失分析按钮 */}
                            <button
                              className="view-alarm-btn"
                              onClick={() => {
                                setSelectedMonth(month.month);
                                setShowMonthlyAlarmModal(true);
                              }}
                            >
                              查看损失分析
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
              {timeView === 'monthly' && lossComparison.length > 0 && (() => {
                const monthlyData = aggregateByMonth(lossComparison);
                const grandTotals = monthlyData.reduce((acc, month) => ({
                  expectedRevenue: acc.expectedRevenue + month.expectedRevenue,
                  actualRevenue: acc.actualRevenue + month.actualRevenue,
                  revenueLoss: acc.revenueLoss + month.revenueLoss,
                  alarmCount: acc.alarmCount + month.alarmCount,
                  alarmLoss: acc.alarmLoss + month.alarmLoss
                }), { expectedRevenue: 0, actualRevenue: 0, revenueLoss: 0, alarmCount: 0, alarmLoss: 0 });

                const overallAchievementRate = grandTotals.expectedRevenue > 0
                  ? ((grandTotals.actualRevenue / grandTotals.expectedRevenue) * 100).toFixed(2)
                  : '0.00';

                return (
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>总计</strong></td>
                      <td className="amount"><strong>{formatCurrency(grandTotals.expectedRevenue)}</strong></td>
                      <td className="amount"><strong>{formatCurrency(grandTotals.actualRevenue)}</strong></td>
                      <td className="amount loss"><strong>{formatCurrency(grandTotals.revenueLoss)}</strong></td>
                      <td>
                        <span className={`achievement-badge ${
                          parseFloat(overallAchievementRate) >= 90 ? 'success' :
                          parseFloat(overallAchievementRate) >= 70 ? 'warning' : 'danger'
                        }`}>
                          <strong>{overallAchievementRate}%</strong>
                        </span>
                      </td>
                      <td className="alarm-count">
                        <span className={`alarm-count-badge ${grandTotals.alarmCount > 0 ? 'has-alarms' : 'no-alarms'}`}>
                          <strong>{grandTotals.alarmCount}</strong>
                        </span>
                      </td>
                      <td className="amount alarm-loss">
                        {grandTotals.alarmLoss > 0 ? (
                          <span className="alarm-loss-badge">
                            <strong>{formatCurrency(grandTotals.alarmLoss)}</strong>
                          </span>
                        ) : (
                          <span className="no-loss"><strong>-</strong></span>
                        )}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {/* 告警弹窗 */}
      <AlarmModal
        isOpen={showAlarmModal}
        onClose={() => setShowAlarmModal(false)}
        stationId={stationId}
        date={selectedDate}
      />

      {/* 月度告警弹窗 */}
      <MonthlyAlarmModal
        isOpen={showMonthlyAlarmModal}
        onClose={() => setShowMonthlyAlarmModal(false)}
        stationId={stationId}
        month={selectedMonth}
      />

      {/* SOC详情弹窗 */}
      <SocDetailModal
        isOpen={showSocModal}
        onClose={() => setShowSocModal(false)}
        stationId={stationId}
        date={selectedDate}
        stationName={stationData?.stationName}
      />

      {/* 设备停机损失详情弹窗 */}
      <EquipmentOutageDetailModal
        isOpen={showEquipmentOutageModal}
        onClose={() => setShowEquipmentOutageModal(false)}
        alarmData={allAlarms}
      />

      {/* 非计划性停机损失详情弹窗 */}
      <UnplannedOutageDetailModal
        isOpen={showUnplannedOutageModal}
        onClose={() => setShowUnplannedOutageModal(false)}
        unplannedOutageData={unplannedOutageLossData}
      />
    </div>
  );
}
