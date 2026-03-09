import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, Zap, Cloud, TrendingDown, TrendingUp, DollarSign, Calendar, LineChart, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EyeOff, Eye, X } from 'lucide-react';
import * as echarts from 'echarts';
import api from '../services/api';
import AlarmModal from '../components/AlarmModal';
import MonthlyAlarmModal from '../components/MonthlyAlarmModal';
import AlarmPieChart from '../components/AlarmPieChart';
import LossPieChart from '../components/LossPieChart';
import LossBreakdownPieChart from '../components/LossBreakdownPieChart';
import SocDetailModal from '../components/SocDetailModal';
import EquipmentOutageDetailModal from '../components/EquipmentOutageDetailModal';
import UnplannedOutageDetailModal from '../components/UnplannedOutageDetailModal';
import StrategyDeviationDetailModal from '../components/StrategyDeviationDetailModal';
import HolidayLossDetailModal from '../components/HolidayLossDetailModal';
import { getDailyChargingStats } from '../services/chargingStrategyService';
import { calculateStationLosses, getHolidayLosses, getUnplannedOutageLosses, getStrategyDeviationLosses } from '../services/alarmLossService';
import { getPowerLimitationLosses } from '../services/powerLimitationLossService';
import './LossAnalysis.css';

// 默认日期范围常量
const DEFAULT_START_DATE = '2025-09-01';
// 结束日期默认为昨天
const getYesterday = () => {
  const today = new Date();
  today.setDate(today.getDate() - 1);
  return today.toISOString().split('T')[0];
};
const DEFAULT_END_DATE = getYesterday();

export default function LossAnalysis({ stationId, stationData }) {
  const [lossStats, setLossStats] = useState(null);
  const [lossComparison, setLossComparison] = useState([]);
  const [alarmStats, setAlarmStats] = useState(null);
  const [chargingStats, setChargingStats] = useState({}); // 充放电统计数据
  const [alarmLossData, setAlarmLossData] = useState({}); // 告警损失数据
  const [holidayLossData, setHolidayLossData] = useState(null); // 节假日损失数据
  const [unplannedOutageLossData, setUnplannedOutageLossData] = useState(null); // 非计划性停机损失数据
  const [powerLimitationLossData, setPowerLimitationLossData] = useState(null); // 功率受限损失数据
  const [strategyDeviationLossData, setStrategyDeviationLossData] = useState(null); // 策略偏差损失数据
  const [allAlarms, setAllAlarms] = useState([]); // 所有告警详细列表
  const [loading, setLoading] = useState(true);
  const [loadingAlarmDetails, setLoadingAlarmDetails] = useState(false); // 告警明细加载状态
  const [alarmDetailsLoaded, setAlarmDetailsLoaded] = useState(false); // 告警明细是否已加载
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showMonthlyAlarmModal, setShowMonthlyAlarmModal] = useState(false);
  const [showSocModal, setShowSocModal] = useState(false);
  const [showEquipmentOutageModal, setShowEquipmentOutageModal] = useState(false);
  const [showUnplannedOutageModal, setShowUnplannedOutageModal] = useState(false);
  const [showStrategyDeviationModal, setShowStrategyDeviationModal] = useState(false);
  const [showHolidayLossModal, setShowHolidayLossModal] = useState(false);
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false); // AI可提升分析弹窗
  const [aiAnalysisData, setAiAnalysisData] = useState(null); // AI分析弹窗数据
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false); // AI分析加载状态
  const aiSummaryPieRef = useRef(null); // AI汇总饼图容器（主页面）
  const aiSummaryPieInstance = useRef(null); // AI汇总饼图实例（主页面）
  const [aiSummary, setAiSummary] = useState(null); // 预计算的AI提升累计值
  const [showIgnoreModal, setShowIgnoreModal] = useState(false); // 忽略原因弹框
  const [ignoreTargetDay, setIgnoreTargetDay] = useState(null); // 待忽略的日期数据
  const [ignoreLoading, setIgnoreLoading] = useState(false); // 忽略操作加载状态
  const [ignoreReason, setIgnoreReason] = useState(''); // 忽略原因文本
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [timeView, setTimeView] = useState('daily'); // 'daily' or 'monthly'
  const [showAlarmDetails, setShowAlarmDetails] = useState(false); // 控制告警明细表格的展开/收起

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // 每页50条

  // 日期范围选择器状态
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [tempStartDate, setTempStartDate] = useState(DEFAULT_START_DATE);
  const [tempEndDate, setTempEndDate] = useState(DEFAULT_END_DATE);

  // 🚀 防止React StrictMode双重调用的守卫
  const isLoadingRef = useRef(false);

  // 🚀 性能优化：使用 useMemo 缓存过滤和排序后的告警数据
  const sortedAlarms = useMemo(() => {
    return allAlarms
      .filter(alarm => alarm.loss > 0)
      .sort((a, b) => b.loss - a.loss);
  }, [allAlarms]);

  // 🚀 性能优化：使用 useMemo 缓存告警损失汇总计算
  const alarmTotals = useMemo(() => {
    return {
      timeLoss: allAlarms.reduce((sum, a) => sum + (a.timeLoss || 0), 0),
      socTargetLoss: allAlarms.reduce((sum, a) => sum + (a.socTargetLoss || 0), 0),
      totalLoss: allAlarms.reduce((sum, a) => sum + (a.loss || 0), 0)
    };
  }, [allAlarms]);

  // 🚀 性能优化：懒加载告警明细（只在用户展开时才加载）
  const fetchAlarmDetails = useCallback(async () => {
    // 防止重复加载
    if (alarmDetailsLoaded || !lossComparison.length) return;

    setLoadingAlarmDetails(true);
    try {
      // 为每一天获取告警详情
      const alarmsPromises = lossComparison.map(async (day) => {
        const dateObj = new Date(day.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${dayStr}`;

        try {
          const lossResponse = await calculateStationLosses(stationId, {
            startDate: formattedDate,
            endDate: formattedDate
          });

          if (lossResponse.success && lossResponse.data) {
            return lossResponse.data.alarms || [];
          }
        } catch (error) {
          console.error('获取告警详情失败:', error);
        }
        return [];
      });

      // 并行执行所有请求
      const alarmsArrays = await Promise.all(alarmsPromises);
      const allAlarmsArray = alarmsArrays.flat();
      setAllAlarms(allAlarmsArray);
      setAlarmDetailsLoaded(true);
    } catch (error) {
      console.error('获取告警明细失败:', error);
    } finally {
      setLoadingAlarmDetails(false);
    }
  }, [stationId, lossComparison, alarmDetailsLoaded]);

  // 🚀 性能优化：使用 useCallback 缓存事件处理器
  const handleToggleAlarmDetails = useCallback(async () => {
    const willShow = !showAlarmDetails;
    setShowAlarmDetails(willShow);

    // 如果是展开且尚未加载明细，则加载
    if (willShow && !alarmDetailsLoaded) {
      await fetchAlarmDetails();
    }
  }, [showAlarmDetails, alarmDetailsLoaded, fetchAlarmDetails]);

  const fetchLossData = async () => {
    // 🔍 性能监控：开始计时
    const perfStart = performance.now();
    console.log('🚀 [性能监控] 开始加载损失分析数据', new Date().toLocaleTimeString());

    try {
      setLoading(true);

      // 🚀 性能优化：并行获取初始数据（每个请求单独计时）
      const stats_start = performance.now();
      const statsPromise = api.get(
        `/revenue/station/${stationId}/loss-stats`,
        { params: { startDate, endDate } }
      ).then(res => {
        console.log(`  ├─ 📊 损失统计API (loss-stats): ${(performance.now() - stats_start).toFixed(0)}ms`);
        return res;
      });

      const comparison_start = performance.now();
      const comparisonPromise = api.get(
        `/revenue/station/${stationId}/loss-comparison`,
        { params: { startDate, endDate } }
      ).then(res => {
        console.log(`  ├─ 📈 收益对比API (loss-comparison): ${(performance.now() - comparison_start).toFixed(0)}ms`);
        return res;
      });

      const charging_start = performance.now();
      const chargingPromise = getDailyChargingStats({
        stationId,
        limit: 1000
      }).then(res => {
        console.log(`  └─ ⚡ 充放电统计API (charging-stats): ${(performance.now() - charging_start).toFixed(0)}ms`);
        return res;
      }).catch(err => {
        console.log(`  └─ ⚡ 充放电统计API (charging-stats): ${(performance.now() - charging_start).toFixed(0)}ms (失败)`);
        console.error('获取充放电统计失败:', err);
        return { success: false, data: [] };
      });

      const [statsResponse, comparisonResponse, chargingResponse] = await Promise.all([
        statsPromise,
        comparisonPromise,
        chargingPromise
      ]);

      // 🔍 性能监控：初始数据请求完成
      const phase1Time = performance.now() - perfStart;
      console.log(`⏱️  [性能监控] 阶段1完成（初始并行请求）: ${phase1Time.toFixed(0)}ms`, {
        请求数: 3,
        内容: ['loss-stats', 'loss-comparison', 'charging-stats']
      });

      // 处理损失统计数据
      if (statsResponse.data.success) {
        setLossStats(statsResponse.data.data);
      }

      // 处理充放电统计数据
      if (chargingResponse.success) {
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

      // 处理收益对比数据
      if (comparisonResponse.data.success) {
        const comparisonData = comparisonResponse.data.data;

        // 🚀 告警数据已从 loss-comparison API 预存字段中获取（alarmCount/alarmLoss）
        // 无需逐天请求，直接使用
        setLossComparison(comparisonData);

        // 预计算的AI提升累计值（默认全量范围时由后端返回）
        if (comparisonResponse.data.aiSummary) {
          setAiSummary(comparisonResponse.data.aiSummary);
        } else {
          setAiSummary(null);
        }

        const phase1TotalTime = performance.now() - perfStart;
        console.log(`📋 [性能监控] 收益对比数据接收完成: ${phase1TotalTime.toFixed(0)}ms (${(phase1TotalTime / 1000).toFixed(2)}秒)`, {
          时间戳: new Date().toLocaleTimeString(),
          数据行数: comparisonData.length,
          包含告警数据: comparisonData.some(d => d.alarmCount > 0)
        });

        // 🚀 性能优化：并行获取所有损失数据和告警统计
        console.log(`\n🔍 [阶段3] 开始并行获取损失数据API (${startDate} ~ ${endDate})`);
        const phase3Start = performance.now();

        // 🔍 性能监控：为每个API添加独立计时
        const api1Start = performance.now();
        const holidayPromise = getHolidayLosses(stationId, { startDate, endDate })
          .then(res => {
            console.log(`  ├─ 📅 节假日损失API: ${(performance.now() - api1Start).toFixed(0)}ms`);
            return res;
          })
          .catch(err => {
            console.log(`  ├─ 📅 节假日损失API: ${(performance.now() - api1Start).toFixed(0)}ms (失败)`);
            return { success: false, error: err };
          });

        const api2Start = performance.now();
        const unplannedPromise = getUnplannedOutageLosses(stationId, { startDate, endDate })
          .then(res => {
            console.log(`  ├─ 🚫 非计划停机损失API: ${(performance.now() - api2Start).toFixed(0)}ms`);
            return res;
          })
          .catch(err => {
            console.log(`  ├─ 🚫 非计划停机损失API: ${(performance.now() - api2Start).toFixed(0)}ms (失败)`);
            return { success: false, error: err };
          });

        const api3Start = performance.now();
        const powerLimitPromise = getPowerLimitationLosses(stationId, {
          startDate,
          endDate,
          regionId: '330000',
          userType: 0,
          voltageType: 3
        })
          .then(res => {
            console.log(`  ├─ ⚡ 功率受限损失API: ${(performance.now() - api3Start).toFixed(0)}ms`);
            return res;
          })
          .catch(err => {
            console.log(`  ├─ ⚡ 功率受限损失API: ${(performance.now() - api3Start).toFixed(0)}ms (失败)`);
            return { success: false, error: err };
          });

        const api4Start = performance.now();
        const alarmStatsPromise = api.get(`/alarms/station/${stationId}/stats`)
          .then(res => {
            console.log(`  └─ 📊 告警统计API: ${(performance.now() - api4Start).toFixed(0)}ms`);
            return res.data;
          })
          .catch(() => {
            console.log(`  └─ 📊 告警统计API: ${(performance.now() - api4Start).toFixed(0)}ms (失败)`);
            return { success: false };
          });

        // 🚫 暂时禁用策略偏差损失API（预计算数据尚未完成）
        // const api5Start = performance.now();
        // const strategyDeviationPromise = getStrategyDeviationLosses(stationId, {
        //   startDate,
        //   endDate,
        //   regionId: '330000',
        //   userType: 0,
        //   voltageType: 3
        // })
        //   .then(res => {
        //     console.log(`  └─ 📉 策略偏差损失API: ${(performance.now() - api5Start).toFixed(0)}ms`);
        //     return res;
        //   })
        //   .catch(err => {
        //     console.log(`  └─ 📉 策略偏差损失API: ${(performance.now() - api5Start).toFixed(0)}ms (失败)`);
        //     return { success: false, error: err };
        //   });

        const [holidayResponse, unplannedOutageResponse, powerLimitResponse, alarmStatsResponse] = await Promise.all([
          holidayPromise,
          unplannedPromise,
          powerLimitPromise,
          alarmStatsPromise
        ]);

        // 🚫 暂时禁用策略偏差损失数据（设置为空响应）
        const strategyDeviationResponse = { success: false };

        // 🔍 性能监控：损失数据并行请求完成
        const phase3Time = performance.now() - phase3Start;
        const phase3TotalTime = performance.now() - perfStart;
        console.log(`⏱️  [阶段3完成] 损失数据并行请求: ${phase3Time.toFixed(0)}ms (累计${phase3TotalTime.toFixed(0)}ms)`, {
          请求数: 4,
          API列表: [
            '节假日损失 (holiday-losses)',
            '非计划停机 (unplanned-outage-losses)',
            '功率受限 (power-limitation-losses)',
            '告警统计 (alarm-stats)'
            // '策略偏差损失 (strategy-deviation-losses)' - 暂时禁用
          ]
        });

        // 处理节假日损失数据
        if (holidayResponse.success) {
          setHolidayLossData(holidayResponse.data);
        }

        // 处理非计划性停机损失数据
        if (unplannedOutageResponse.success) {
          setUnplannedOutageLossData(unplannedOutageResponse.data);
        }

        // 处理功率受限损失数据
        if (powerLimitResponse.success) {
          setPowerLimitationLossData(powerLimitResponse.data);
        }

        // 处理告警统计数据
        if (alarmStatsResponse.success && alarmStatsResponse.data?.totalCount > 0) {
          setAlarmStats(alarmStatsResponse.data);
        }

        // 处理策略偏差损失数据
        if (strategyDeviationResponse.success) {
          setStrategyDeviationLossData(strategyDeviationResponse.data);
          console.log('策略偏差损失数据:', strategyDeviationResponse.data);
        }
      }
    } catch (error) {
      console.error('获取损失数据失败:', error);
    } finally {
      setLoading(false);

      // 🔍 性能监控：总加载时间
      const totalTime = performance.now() - perfStart;
      console.log('\n' + '═'.repeat(80));
      console.log(`✅ [性能汇总] 损失分析页面加载完成: ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(2)}秒)`);
      console.log('─'.repeat(80));
      console.log(`   电站ID: ${stationId}`);
      console.log(`   完成时间: ${new Date().toLocaleTimeString()}`);
      console.log(`   总耗时: ${(totalTime / 1000).toFixed(2)}秒`);
      console.log('═'.repeat(80));
    }
  };

  useEffect(() => {
    if (stationId && stationData) {
      // 🚀 防止React StrictMode导致的双重调用
      if (isLoadingRef.current) {
        console.log('⏭️  [性能监控] 跳过重复调用（React StrictMode双重渲染）');
        return;
      }

      isLoadingRef.current = true;

      // 重置告警详情加载状态，强制重新加载
      setAlarmDetailsLoaded(false);
      setAllAlarms([]);
      setShowAlarmDetails(false);

      fetchLossData().finally(() => {
        // 数据加载完成后重置守卫，允许下次切换电站时重新加载
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, stationData, startDate, endDate]);

  // 处理查询按钮点击
  const handleDateQuery = () => {
    if (!tempStartDate || !tempEndDate) {
      alert('请选择开始日期和结束日期');
      return;
    }

    if (new Date(tempStartDate) > new Date(tempEndDate)) {
      alert('开始日期不能晚于结束日期');
      return;
    }

    // 更新实际日期范围，触发数据重新加载
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  // 处理重置按钮点击
  const handleDateReset = () => {
    // 重置为默认日期范围
    setTempStartDate(DEFAULT_START_DATE);
    setTempEndDate(DEFAULT_END_DATE);
    setStartDate(DEFAULT_START_DATE);
    setEndDate(DEFAULT_END_DATE);
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

  // 忽略AI提升规则
  const handleIgnoreRule = async () => {
    if (!ignoreTargetDay || !ignoreReason.trim()) return;
    setIgnoreLoading(true);
    try {
      const dateObj = new Date(aiAnalysisData.date);
      const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
      const localDate = new Date(dateObj.getTime() + UTC_OFFSET_MS);
      const dateStr = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;

      const response = await api.put(
        `/revenue/station/${stationId}/ai-improvement/${dateStr}/rule/${ignoreTargetDay.ruleId}/ignore`,
        { ignored: true, reason: ignoreReason.trim() }
      );

      if (response.data.success) {
        // 更新弹框中的规则忽略状态
        setAiAnalysisData(prev => ({
          ...prev,
          aiImprovement: response.data.data.effectiveTotal,
          rules: prev.rules?.map(r => {
            const updated = response.data.data.rules.find(ur => ur.ruleId === r.ruleId);
            return updated ? { ...r, ignored: updated.ignored } : r;
          })
        }));
        // 更新日列表中的 aiImprovement
        setLossComparison(prev => prev.map(day => {
          if (new Date(day.date).getTime() === new Date(aiAnalysisData.date).getTime()) {
            return { ...day, aiImprovement: response.data.data.effectiveTotal };
          }
          return day;
        }));
        // 刷新 aiSummary
        try {
          const summaryRes = await api.get(
            `/revenue/station/${stationId}/loss-comparison`,
            { params: { startDate, endDate } }
          );
          if (summaryRes.data.aiSummary) setAiSummary(summaryRes.data.aiSummary);
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('忽略规则失败:', error);
    } finally {
      setIgnoreLoading(false);
      setShowIgnoreModal(false);
      setIgnoreTargetDay(null);
      setIgnoreReason('');
    }
  };

  // 恢复生效AI提升规则
  const handleRestoreRule = async (ruleId) => {
    try {
      const dateObj = new Date(aiAnalysisData.date);
      const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
      const localDate = new Date(dateObj.getTime() + UTC_OFFSET_MS);
      const dateStr = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;

      const response = await api.put(
        `/revenue/station/${stationId}/ai-improvement/${dateStr}/rule/${ruleId}/ignore`,
        { ignored: false }
      );

      if (response.data.success) {
        setAiAnalysisData(prev => ({
          ...prev,
          aiImprovement: response.data.data.effectiveTotal,
          rules: prev.rules?.map(r => {
            const updated = response.data.data.rules.find(ur => ur.ruleId === r.ruleId);
            return updated ? { ...r, ignored: updated.ignored } : r;
          })
        }));
        setLossComparison(prev => prev.map(day => {
          if (new Date(day.date).getTime() === new Date(aiAnalysisData.date).getTime()) {
            return { ...day, aiImprovement: response.data.data.effectiveTotal };
          }
          return day;
        }));
        try {
          const summaryRes = await api.get(
            `/revenue/station/${stationId}/loss-comparison`,
            { params: { startDate, endDate } }
          );
          if (summaryRes.data.aiSummary) setAiSummary(summaryRes.data.aiSummary);
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('恢复规则失败:', error);
    }
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

  // 分页数据计算
  const paginatedData = useMemo(() => {
    let sourceData;
    if (timeView === 'daily') {
      sourceData = [...lossComparison].sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      sourceData = aggregateByMonth(lossComparison).sort((a, b) => b.month.localeCompare(a.month));
    }

    const totalItems = sourceData.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: sourceData.slice(startIndex, endIndex),
      totalItems,
      totalPages,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalItems)
    };
  }, [lossComparison, timeView, currentPage, pageSize]);

  // 生成页码数组（智能省略中间页码）
  const generatePageNumbers = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [1];
    if (current > 3) pages.push('...');

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push('...');
    pages.push(total);

    return pages;
  };

  // 切换视图或日期范围时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [timeView, startDate, endDate]);

  // AI汇总饼图渲染（主页面）
  useEffect(() => {
    if (loading) return;
    const ruleBreakdown = aiSummary?.ruleBreakdown;
    if (!ruleBreakdown || ruleBreakdown.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      if (!aiSummaryPieRef.current) return;

      // 先 dispose 旧实例再重新 init，确保尺寸正确
      if (aiSummaryPieInstance.current) {
        aiSummaryPieInstance.current.dispose();
        aiSummaryPieInstance.current = null;
      }
      aiSummaryPieInstance.current = echarts.init(aiSummaryPieRef.current);

      const RULE_LABELS = {
        1: '充电周期优化',
        2: '放电周期优化',
        3: '静置优化',
        4: '充电周期优化',
      };
      const RULE_COLORS_MAP = {
        1: '#3B82F6',
        2: '#F59E0B',
        3: '#10B981',
        4: '#3B82F6',
      };

      const pieData = ruleBreakdown
        .filter(r => r.totalImprovement > 0)
        .map(r => ({
          name: RULE_LABELS[r.ruleId] || `规则${r.ruleId}`,
          value: Math.round(r.totalImprovement * 100) / 100,
          itemStyle: { color: RULE_COLORS_MAP[r.ruleId] || '#6B7280' },
        }));

      if (pieData.length === 0) {
        aiSummaryPieInstance.current.clear();
        return;
      }

      const totalValue = pieData.reduce((s, d) => s + d.value, 0);

      aiSummaryPieInstance.current.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: ({ name, value, percent }) => `${name}<br/>¥${value.toFixed(2)} (${percent}%)`,
        },
        legend: {
          bottom: 4,
          left: 'center',
          itemWidth: 12,
          itemHeight: 12,
          textStyle: { fontSize: 12 },
        },
        graphic: [{
          type: 'text',
          left: 'center',
          top: '35%',
          style: {
            text: `¥${totalValue.toFixed(2)}`,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 700,
            fill: '#111827',
          }
        }, {
          type: 'text',
          left: 'center',
          top: '45%',
          style: {
            text: '预计AI可提升总收益',
            textAlign: 'center',
            fontSize: 11,
            fill: '#6b7280',
          }
        }],
        color: pieData.map(d => d.itemStyle.color),
        series: [{
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 600,
              formatter: ({ name, percent }) => `${name}\n${percent}%`,
            }
          },
          data: pieData,
        }],
      });

      // 点击"静置优化"跳转到SOC与功率负载分析页面
      aiSummaryPieInstance.current.on('click', (params) => {
        if (params.name === '静置优化' && [205, 233].includes(Number(stationId))) {
          window.open(`/soc-power-analysis/${stationId}`, '_blank');
        }
      });
    }, 200);

    const handleResize = () => {
      aiSummaryPieInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (aiSummaryPieInstance.current) {
        aiSummaryPieInstance.current.dispose();
        aiSummaryPieInstance.current = null;
      }
    };
  }, [aiSummary, loading]);

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

  // 处理损失饼图点击事件 - 使用 useCallback 优化
  const handleLossBreakdownClick = useCallback((lossType) => {
    if (lossType === '故障停机损失' || lossType === '设备停机损失') {
      setShowEquipmentOutageModal(true);
    } else if (lossType === '非计划性停机损失') {
      setShowUnplannedOutageModal(true);
    } else if (lossType === '策略偏差损失') {
      setShowStrategyDeviationModal(true);
    } else if (lossType === '节假日损失') {
      setShowHolidayLossModal(true);
    }
  }, []);

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
        <h2>损失分析</h2>
        <p className="section-subtitle">分析电站收益损失的原因分类</p>
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
          <div className="revenue-summary-cards" style={[205, 233].includes(Number(stationId)) ? { display: 'none' } : undefined}>
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

      {/* 日期范围选择器 */}
      <div className="date-range-selector" style={[205, 233].includes(Number(stationId)) ? { display: 'none' } : undefined}>
        <div className="date-input-group">
          <label htmlFor="start-date">
            <Calendar size={16} />
            <span>开始日期</span>
          </label>
          <input
            id="start-date"
            type="date"
            value={tempStartDate}
            onChange={(e) => setTempStartDate(e.target.value)}
            max={tempEndDate}
          />
        </div>

        <div className="date-separator">至</div>

        <div className="date-input-group">
          <label htmlFor="end-date">
            <Calendar size={16} />
            <span>结束日期</span>
          </label>
          <input
            id="end-date"
            type="date"
            value={tempEndDate}
            onChange={(e) => setTempEndDate(e.target.value)}
            min={tempStartDate}
          />
        </div>

        <button
          className="query-button"
          onClick={handleDateQuery}
          disabled={loading}
        >
          {loading ? '查询中...' : '查询'}
        </button>

        <button
          className="reset-button"
          onClick={handleDateReset}
          disabled={loading}
        >
          重置
        </button>
      </div>

      {/* 损失收益分析 */}
      {lossComparison.length > 0 && (() => {
        // 计算总告警损失和总损失收益
        const totals = lossComparison.reduce((acc, day) => ({
          alarmLoss: acc.alarmLoss + (day.alarmLoss || 0),
          revenueLoss: acc.revenueLoss + (day.revenueLoss || 0),
          aiImprovement: acc.aiImprovement + (day.aiImprovement || 0),
          actualRevenue: acc.actualRevenue + (day.actualRevenue || 0),
          expectedRevenue: acc.expectedRevenue + (day.expectedRevenue || 0)
        }), { alarmLoss: 0, revenueLoss: 0, aiImprovement: 0, actualRevenue: 0, expectedRevenue: 0 });

        // 优先使用预计算的AI累计值（默认全量范围）
        const totalAiImprovement = aiSummary
          ? aiSummary.totalAiImprovement
          : totals.aiImprovement;

        return (
          <div className="loss-pie-chart-section">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              损失分析
              {Number(stationId) === 205 && (
                <span className="vpp-dispatch-badge" style={{ marginLeft: 'auto' }}>VPP调度信息系统暂未获取</span>
              )}
            </h3>
            <p className="chart-description">分析损失收益的具体构成，包括设备停机损失、非计划性停机损失、节假日损失和其他类型损失</p>
            {[205, 233].includes(Number(stationId)) && totals.expectedRevenue > 0 && (() => {
              const improvementRate = totals.actualRevenue > 0 && totalAiImprovement > 0
                ? ((totalAiImprovement / totals.actualRevenue) * 100).toFixed(2)
                : '0.00';
              const dataDays = lossComparison.length;
              const annualizedAiImprovement = dataDays > 0 && totalAiImprovement > 0 ? (totalAiImprovement / dataDays) * 365 : 0;
              return (
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderRadius: '10px', border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>预期收益</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{formatCurrency(totals.expectedRevenue)}</div>
                  </div>
                  <div style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    borderRadius: '10px', border: '1px solid #a7f3d0'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>实际收益</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{formatCurrency(totals.actualRevenue)}</div>
                  </div>
                  <div style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                    borderRadius: '10px', border: '1px solid #fca5a5'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>损失收益</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{formatCurrency(totals.revenueLoss)}</div>
                  </div>
                  <div style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    borderRadius: '10px', border: '1px solid #fcd34d'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>预计收益提升率</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{improvementRate}%</div>
                  </div>
                  <div style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    background: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%)',
                    borderRadius: '10px', border: '1px solid #c4b5fd'
                  }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>预计年化提升收益</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{formatCurrency(annualizedAiImprovement)}</div>
                  </div>
                </div>
              );
            })()}
            <div className="loss-pie-dual-container">
              <div className="loss-pie-dual-item">
                <LossBreakdownPieChart
                  alarmLoss={totals.alarmLoss}
                  totalRevenueLoss={totals.revenueLoss}
                  holidayLoss={holidayLossData?.totalHolidayLoss || 0}
                  unplannedOutageLoss={unplannedOutageLossData?.totalUnplannedOutageLoss || 0}
                  powerLimitationLoss={powerLimitationLossData?.totalPowerLimitationLoss || 0}
                  strategyDeviationLoss={strategyDeviationLossData?.totalStrategyDeviationLoss || 0}
                  onItemClick={handleLossBreakdownClick}
                  stationId={stationId}
                  aiSummary={aiSummary}
                />
              </div>

              {/* AI预计可提升收益 */}
              {totalAiImprovement > 0 && (
                (() => {
                  const aiImprovementPct = [205, 233].includes(Number(stationId)) && totals.actualRevenue > 0
                    ? (totalAiImprovement / totals.actualRevenue * 100).toFixed(2)
                    : null;
                  return aiSummary?.ruleBreakdown?.length > 0 ? (
                    <div className="loss-pie-dual-item ai-improvement-pie-section">
                      <h4 className="ai-improvement-pie-title">
                        <TrendingUp size={18} />
                        预计AI可提升收益
                        {aiImprovementPct && (
                          <span className="ai-improvement-pct-badge"><TrendingUp size={14} /> +{aiImprovementPct}%</span>
                        )}
                      </h4>
                      <div ref={aiSummaryPieRef} className="ai-improvement-pie-chart" />
                    </div>
                  ) : (
                    <div className="loss-pie-dual-item">
                      <div className="ai-improvement-summary">
                        <div className="ai-improvement-icon">
                          <TrendingUp size={20} />
                        </div>
                        <div className="ai-improvement-content">
                          <div className="ai-improvement-label">AI预计可提升收益</div>
                          <div className="ai-improvement-value">
                            +{formatCurrency(totalAiImprovement)}
                            {aiImprovementPct && (
                              <span className="ai-improvement-pct-badge"><TrendingUp size={14} /> +{aiImprovementPct}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* 告警损失明细表格 */}
            {totals.alarmLoss > 0 && (
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
                        ({alarmDetailsLoaded ? sortedAlarms.length : '点击展开查看'})
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
                    onClick={handleToggleAlarmDetails}
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
                  loadingAlarmDetails ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '3rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div className="spinner" style={{ marginRight: '1rem' }}></div>
                      <span>加载告警明细中...</span>
                    </div>
                  ) : (
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
                        {sortedAlarms.map((alarm, index) => (
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
                            {formatCurrency(alarmTotals.timeLoss)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#8b5cf6' }}>
                            {formatCurrency(alarmTotals.socTargetLoss)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                            {formatCurrency(totals.alarmLoss)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 损失统计概览 */}
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
            <h3>日收益数据详情</h3>
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
                  {/* <th>预期收益</th> */}
                  <th>实际收益</th>
                  {/* <th>收益损失</th> */}
                  <th>达成率</th>
                  <th>故障数</th>
                  <th>故障损失</th>
                  {timeView === 'daily' && <th>预计AI可提升收益</th>}
                  {timeView === 'daily' && <th>SOC变化</th>}
                  {/* {timeView === 'daily' && <th>SOC末端异常</th>} */}
                  {/* <th>损失原因</th> */}
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {timeView === 'daily' ? (
                  // 按日查看 - 使用分页数据
                  paginatedData.data.map((day, index) => {
                    return (
                        <tr key={index}>
                          <td>{formatDate(day.date)}</td>
                          {/* <td className="amount">{formatCurrency(day.expectedRevenue)}</td> */}
                          <td className="amount">{formatCurrency(day.actualRevenue)}</td>
                          {/* <td className="amount loss">{formatCurrency(day.revenueLoss)}</td> */}
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
                          <td className="amount ai-new-improvement">
                            {day.aiImprovement > 0 ? (
                              <span className="ai-new-improvement-badge">
                                +{formatCurrency(day.aiImprovement)}
                              </span>
                            ) : (
                              <span className="no-loss">-</span>
                            )}
                          </td>
                          <td className="soc-changed">
                            {day.socChanged === true ? (
                              <span className="soc-changed-badge yes">是</span>
                            ) : day.socChanged === false ? (
                              <span className="soc-changed-badge no">否</span>
                            ) : (
                              <span className="no-loss">-</span>
                            )}
                          </td>
                          {/* <td className="soc-anomaly">
                            {day.hasSocAnomaly ? (
                              <span className="soc-changed-badge yes">是</span>
                            ) : (
                              <span className="soc-changed-badge no">否</span>
                            )}
                          </td> */}
                          {/* <td>
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
                          </td> */}
                          <td>
                            <div className="action-buttons">
                              <button
                                className="view-alarm-btn"
                                onClick={() => {
                                  setSelectedDate(day.date);
                                  setShowAlarmModal(true);
                                }}
                              >
                                查看故障分析
                              </button>
                              <button
                                className="view-soc-btn"
                                onClick={() => {
                                  const dateObj = new Date(day.date);
                                  const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
                                  const localDate = new Date(dateObj.getTime() + UTC_OFFSET_MS);
                                  const year = localDate.getUTCFullYear();
                                  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
                                  const dayStr = String(localDate.getUTCDate()).padStart(2, '0');
                                  const formattedDate = `${year}-${month}-${dayStr}`;

                                  setSelectedDate(formattedDate);
                                  setShowSocModal(true);
                                }}
                              >
                                <LineChart size={14} />
                                查看SOC详情
                              </button>
                              {!stationData?.isAI && (
                                <button
                                  className="view-ai-analysis-btn"
                                  disabled={aiAnalysisLoading}
                                  onClick={async () => {
                                    const isSpecial = [205, 233].includes(Number(stationId));
                                    // 基础数据先设置
                                    setAiAnalysisData({
                                      date: day.date,
                                      expectedRevenue: day.expectedRevenue,
                                      actualRevenue: day.actualRevenue,
                                      achievementRate: day.achievementRate,
                                      aiImprovement: day.aiImprovement || 0,
                                      isSpecialStation: isSpecial,
                                      rules: null,
                                    });
                                    setShowAiAnalysisModal(true);

                                    // 特殊电站调用详细分析API
                                    if (isSpecial) {
                                      setAiAnalysisLoading(true);
                                      try {
                                        const dateObj = new Date(day.date);
                                        const UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
                                        const localDate = new Date(dateObj.getTime() + UTC_OFFSET_MS);
                                        const dateStr = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;

                                        const response = await api.get(`/revenue/station/${stationId}/ai-improvement`, {
                                          params: { date: dateStr }
                                        });
                                        if (response.data.success) {
                                          setAiAnalysisData(prev => ({
                                            ...prev,
                                            aiImprovement: response.data.data.totalImprovement,
                                            rules: response.data.data.rules,
                                          }));
                                        }
                                      } catch (err) {
                                        console.error('AI分析请求失败:', err);
                                      } finally {
                                        setAiAnalysisLoading(false);
                                      }
                                    }
                                  }}
                                >
                                  <TrendingUp size={14} />
                                  AI可提升分析
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  // 按月查看 - 使用分页数据
                  paginatedData.data.map((month, index) => (
                      <tr key={index}>
                        <td>{formatMonth(month.month)}</td>
                        {/* <td className="amount">{formatCurrency(month.expectedRevenue)}</td> */}
                        <td className="amount">{formatCurrency(month.actualRevenue)}</td>
                        {/* <td className="amount loss">{formatCurrency(month.revenueLoss)}</td> */}
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
                        {/* 损失原因列已隐藏 */}
                        {/* <td>
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
                        </td> */}
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
                      {/* <td className="amount"><strong>{formatCurrency(grandTotals.expectedRevenue)}</strong></td> */}
                      <td className="amount"><strong>{formatCurrency(grandTotals.actualRevenue)}</strong></td>
                      {/* <td className="amount loss"><strong>{formatCurrency(grandTotals.revenueLoss)}</strong></td> */}
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

            {/* 分页控件 */}
            {paginatedData.totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  显示 {paginatedData.startIndex} - {paginatedData.endIndex} 条，
                  共 {paginatedData.totalItems} 条记录
                </div>

                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="首页"
                  >
                    <ChevronsLeft size={18} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    aria-label="上一页"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="pagination-pages">
                    {generatePageNumbers(currentPage, paginatedData.totalPages).map((pageNum, idx) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={pageNum}
                          className={`pagination-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === paginatedData.totalPages}
                    aria-label="下一页"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(paginatedData.totalPages)}
                    disabled={currentPage === paginatedData.totalPages}
                    aria-label="末页"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            )}
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

      {/* 策略偏差损失详情弹窗 */}
      <StrategyDeviationDetailModal
        isOpen={showStrategyDeviationModal}
        onClose={() => setShowStrategyDeviationModal(false)}
        stationId={stationId}
        startDate={strategyDeviationLossData?.dateRange?.startDate || ''}
        endDate={strategyDeviationLossData?.dateRange?.endDate || ''}
      />

      {/* 节假日损失详情弹窗 */}
      <HolidayLossDetailModal
        isOpen={showHolidayLossModal}
        onClose={() => setShowHolidayLossModal(false)}
        holidayLossData={holidayLossData}
      />

      {/* AI可提升分析弹窗 */}
      {showAiAnalysisModal && aiAnalysisData && (
        <div className="ai-analysis-modal-overlay" onClick={() => setShowAiAnalysisModal(false)}>
          <div className={`ai-analysis-modal ${aiAnalysisData.isSpecialStation ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="ai-analysis-modal-header">
              <h3>AI可提升分析</h3>
              <button className="ai-analysis-close-btn" onClick={() => setShowAiAnalysisModal(false)}>&times;</button>
            </div>
            <div className="ai-analysis-modal-body">
              <div className="ai-analysis-date">
                {formatDate(aiAnalysisData.date)}
              </div>
              <div className="ai-analysis-grid">
                <div className="ai-analysis-item">
                  <span className="ai-analysis-label">实际收益</span>
                  <span className="ai-analysis-value">{formatCurrency(aiAnalysisData.actualRevenue)}</span>
                </div>
                <div className="ai-analysis-item highlight">
                  <span className="ai-analysis-label">预计AI可提升收益</span>
                  <span className="ai-analysis-value boost">
                    {aiAnalysisData.aiImprovement > 0 ? `+${formatCurrency(aiAnalysisData.aiImprovement)}` : '-'}
                  </span>
                </div>
              </div>

              {/* 特殊电站详细规则分析 */}
              {aiAnalysisData.isSpecialStation && (
                <div className="ai-rules-section">
                  {aiAnalysisLoading ? (
                    <div className="ai-rules-loading">
                      <span className="spinner-small" /> 正在分析...
                    </div>
                  ) : aiAnalysisData.rules && aiAnalysisData.rules.length > 0 ? (
                    aiAnalysisData.rules.map((rule, rIdx) => (
                      <div key={rIdx} className={`ai-rule-card ${rule.ignored ? 'ignored' : ''}`}>
                        <div className="ai-rule-header">
                          <span className="ai-rule-tag">分析{rule.ruleId}</span>
                          <span className="ai-rule-name">{rule.ruleName}</span>
                          <span className={`ai-rule-amount ${rule.improvement > 0 && !rule.ignored ? 'has-value' : ''} ${rule.ignored ? 'ignored' : ''}`}>
                            {rule.ignored ? (
                              <s>{rule.improvement > 0 ? `+${formatCurrency(rule.improvement)}` : '¥0'}</s>
                            ) : (
                              rule.improvement > 0 ? `+${formatCurrency(rule.improvement)}` : '¥0'
                            )}
                          </span>
                          {rule.improvement > 0 && !rule.ignored && (
                            <button
                              className="ignore-ai-btn"
                              onClick={() => {
                                setIgnoreTargetDay({ ruleId: rule.ruleId, ruleName: rule.ruleName, improvement: rule.improvement });
                                setShowIgnoreModal(true);
                              }}
                            >
                              <EyeOff size={12} />
                              忽略
                            </button>
                          )}
                          {rule.ignored && (
                            <button
                              className="restore-ai-btn"
                              onClick={() => handleRestoreRule(rule.ruleId)}
                            >
                              <Eye size={12} />
                              生效
                            </button>
                          )}
                        </div>
                        {rule.details && (
                          <div className="ai-rule-details">
                            {(rule.details.chargeCycleStart || rule.details.dischargeCycleStart) && (
                              <div className="ai-rule-meta">
                                {(rule.ruleId === 2 || rule.ruleId === 3) ? (
                                  <>
                                    放电周期: {rule.details.dischargeCycleStart} ~ {rule.details.dischargeCycleEnd}
                                    {rule.details.priceDiff > 0 && (
                                      <> | 价差: ¥{rule.details.priceDiff}/kWh</>
                                    )}
                                    {/* 用户用电量已移至表格列 */}
                                  </>
                                ) : (
                                  <>
                                    充电周期: {rule.details.chargeCycleStart} ~ {rule.details.chargeCycleEnd}
                                    {rule.details.dischargeCycleStart && (
                                      <> | 放电周期: {rule.details.dischargeCycleStart} ~ {rule.details.dischargeCycleEnd}</>
                                    )}
                                    {rule.details.priceDiff > 0 && (
                                      <> | 价差: ¥{rule.details.priceDiff}/kWh</>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            {rule.details.gateways && rule.details.gateways.length > 0 && (
                              <table className="ai-rule-table">
                                <thead>
                                  <tr>
                                    <th>网关ID</th>
                                    <th>容量(kWh)</th>
                                    {rule.ruleId === 2 && <th>用户用电量</th>}
                                    {rule.ruleId === 2 && <th>最低购电量</th>}
                                    {rule.ruleId === 2 ? (
                                      <>
                                        <th>endSOC</th>
                                        <th>目标SOC</th>
                                      </>
                                    ) : rule.ruleId === 3 ? (
                                      <>
                                        <th>endSOC</th>
                                        <th>SOC下限</th>
                                      </>
                                    ) : (
                                      <th>最大SOC</th>
                                    )}
                                    {rule.ruleId === 4 && <th>理论最大SOC</th>}
                                    <th>SOC缺失</th>
                                    <th>{rule.ruleId === 3 ? '有效可优化电量' : '缺失电量'}</th>
                                    <th>{rule.ruleId === 3 ? '可优化收益' : '损失收益'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rule.details.gateways.filter(gw => rule.ruleId === 2 ? (gw.hasData && !gw.error) : (!gw.reachedTarget && !gw.error)).map((gw, gIdx) => (
                                    <tr key={gIdx} className={gw.reachedTarget ? 'reached' : 'not-reached'}>
                                      <td className="gateway-id">{gw.gatewayId || '-'}</td>
                                      <td>{gw.capacity || '-'}</td>
                                      {rule.ruleId === 2 && (
                                        <td>{gw.firstDischargeUserConsumption != null ? `${gw.firstDischargeUserConsumption} kWh` : '-'}</td>
                                      )}
                                      {rule.ruleId === 2 && (
                                        <td>{gw.antiBackflowEnergy != null ? `${gw.antiBackflowEnergy} kWh` : '-'}</td>
                                      )}
                                      {rule.ruleId === 2 ? (
                                        <>
                                          <td>{gw.endSoc != null ? `${gw.endSoc}%` : '-'}</td>
                                          <td>{gw.socLowerLimit != null ? `${gw.socLowerLimit}%` : '5%'}</td>
                                        </>
                                      ) : rule.ruleId === 3 ? (
                                        <>
                                          <td>{gw.endSoc != null ? `${gw.endSoc}%` : '-'}</td>
                                          <td>{gw.socLowerLimit != null ? `${gw.socLowerLimit}%` : '-'}</td>
                                        </>
                                      ) : (
                                        <td>{gw.maxSoc != null ? `${gw.maxSoc}%` : '-'}</td>
                                      )}
                                      {rule.ruleId === 4 && (
                                        <td>{gw.expectedMaxSoc != null ? `${gw.expectedMaxSoc}%` : '-'}</td>
                                      )}
                                      <td>{gw.socDeficit > 0 ? `${gw.socDeficit}%` : '-'}</td>
                                      <td>{gw.lostEnergy > 0 ? `${gw.lostEnergy} kWh` : '-'}</td>
                                      <td className="amount">{gw.lostRevenue > 0 ? formatCurrency(gw.lostRevenue) : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {rule.details.error && (
                              <div className="ai-rule-error">{rule.details.error}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="ai-rules-empty">暂无详细规则分析数据</div>
                  )}
                </div>
              )}

              {/* 普通电站简单提示 */}
              {!aiAnalysisData.isSpecialStation && (
                <>
                  {aiAnalysisData.aiImprovement > 0 ? (
                    <div className="ai-analysis-tip">
                      <TrendingUp size={16} />
                      <span>接入AI优化后，该日预计可提升收益 <strong>{formatCurrency(aiAnalysisData.aiImprovement)}</strong>，达成率有望提升至AI电站平均水平。</span>
                    </div>
                  ) : (
                    <div className="ai-analysis-tip neutral">
                      <span>当日暂无可提升空间，表现已接近AI电站水平。</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 忽略AI提升原因弹框 */}
      {showIgnoreModal && ignoreTargetDay && (
        <div className="modal-overlay" onClick={() => { setShowIgnoreModal(false); setIgnoreTargetDay(null); setIgnoreReason(''); }}>
          <div className="ignore-reason-modal" onClick={e => e.stopPropagation()}>
            <div className="ignore-modal-header">
              <h3><AlertTriangle size={18} /> 忽略AI可提升收益</h3>
              <button className="ignore-modal-close-btn" onClick={() => { setShowIgnoreModal(false); setIgnoreTargetDay(null); setIgnoreReason(''); }} aria-label="关闭">
                <X size={20} />
              </button>
            </div>
            <div className="ignore-modal-body">
              {aiAnalysisData && <p className="ignore-date-info">日期：{formatDate(aiAnalysisData.date)}</p>}
              <p className="ignore-date-info">规则：{ignoreTargetDay.ruleName}</p>
              <p className="ignore-date-info">AI可提升收益：+{formatCurrency(ignoreTargetDay.improvement)}</p>
              <label htmlFor="ignore-reason">请填写忽略原因：</label>
              <textarea
                id="ignore-reason"
                value={ignoreReason}
                onChange={e => setIgnoreReason(e.target.value)}
                placeholder="例如：当天设备测试中，数据不具参考价值"
                rows={3}
                maxLength={200}
              />
              <div className="ignore-char-count">{ignoreReason.length}/200</div>
            </div>
            <div className="ignore-modal-footer">
              <button className="ignore-cancel-btn" onClick={() => { setShowIgnoreModal(false); setIgnoreTargetDay(null); setIgnoreReason(''); }} disabled={ignoreLoading}>
                取消
              </button>
              <button
                className="ignore-confirm-btn"
                onClick={handleIgnoreRule}
                disabled={!ignoreReason.trim() || ignoreLoading}
              >
                {ignoreLoading ? <span className="spinner-small" /> : '确认忽略'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
