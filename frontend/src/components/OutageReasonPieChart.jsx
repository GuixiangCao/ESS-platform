import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

// 停机原因类型映射
const REASON_TYPE_OPTIONS = [
  { value: 'power_grid_outage', label: '电网停电', color: '#ef4444' },
  { value: 'equipment_maintenance', label: '设备维护', color: '#f59e0b' },
  { value: 'weather_conditions', label: '天气原因', color: '#10b981' },
  { value: 'policy_restriction', label: '政策限制', color: '#3b82f6' },
  { value: 'manual_shutdown', label: '人工停机', color: '#8b5cf6' },
  { value: 'communication_failure', label: '通讯故障', color: '#ec4899' },
  { value: 'fire', label: '火灾', color: '#dc2626' },
  { value: 'other', label: '其他', color: '#6b7280' },
  { value: 'unfilled', label: '未填写', color: '#d1d5db' }
];

const OutageReasonPieChart = ({ reasons, totalDays }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 统计各类原因的数量
    const reasonCounts = {};
    REASON_TYPE_OPTIONS.forEach(opt => {
      reasonCounts[opt.value] = 0;
    });

    // 统计已填写的原因
    let filledCount = 0;
    Object.values(reasons).forEach(reason => {
      if (reason && reason.reasonType) {
        reasonCounts[reason.reasonType] = (reasonCounts[reason.reasonType] || 0) + 1;
        filledCount++;
      }
    });

    // 计算未填写的数量
    const unfilledCount = totalDays - filledCount;
    reasonCounts['unfilled'] = unfilledCount;

    // 准备图表数据（过滤掉数量为0的项）
    const chartData = REASON_TYPE_OPTIONS
      .filter(opt => reasonCounts[opt.value] > 0)
      .map(opt => ({
        name: opt.label,
        value: reasonCounts[opt.value],
        itemStyle: {
          color: opt.color
        }
      }))
      .sort((a, b) => b.value - a.value);

    // 如果没有数据，显示空状态
    if (chartData.length === 0) {
      chartInstance.current.setOption({
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 14
          }
        }
      });
      return;
    }

    // 配置选项
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}天 ({d}%)',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: '#777',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 14
        }
      },
      legend: {
        orient: 'vertical',
        right: '8%',
        top: 'center',
        textStyle: {
          fontSize: 12
        },
        data: chartData.map(item => item.name),
        formatter: (name) => {
          const item = chartData.find(d => d.name === name);
          const percent = ((item.value / totalDays) * 100).toFixed(1);
          return `${name}: ${item.value}天 (${percent}%)`;
        },
        selectedMode: 'multiple',
        inactiveColor: '#ccc',
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 10
      },
      series: [
        {
          name: '停机原因',
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside',
            fontSize: 13,
            fontWeight: 'bold',
            formatter: (params) => {
              // 只显示占比大于5%的标签
              if (params.percent >= 5) {
                return `${params.percent.toFixed(1)}%`;
              }
              return '';
            },
            color: '#fff',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowBlur: 3,
            textShadowOffsetX: 1,
            textShadowOffsetY: 1
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              formatter: '{d}%'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: chartData
        }
      ]
    };

    // 设置配置
    chartInstance.current.setOption(option);

    // 处理窗口大小变��
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [reasons, totalDays]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} style={{ width: '100%', height: '350px' }} />;
};

export default OutageReasonPieChart;
