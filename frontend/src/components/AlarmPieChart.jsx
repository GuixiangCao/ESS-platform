import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const AlarmPieChart = ({ data, type, getDeviceColor }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 准备数据并按占比从高到低排序
    const sortedData = [...data].sort((a, b) => {
      if (type === 'count') {
        return b.count - a.count;
      } else {
        return parseFloat(b.totalDurationHours) - parseFloat(a.totalDurationHours);
      }
    });

    const chartData = sortedData.map(stat => ({
      name: stat.deviceName,
      value: type === 'count' ? stat.count : parseFloat(stat.totalDurationHours),
      itemStyle: {
        color: getDeviceColor(stat.device)
      }
    }));

    // 配置选项
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: type === 'count'
          ? '{b}: {c}次 ({d}%)'
          : '{b}: {c}小时 ({d}%)',
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
        right: '5%',
        top: 'center',
        textStyle: {
          fontSize: 12
        },
        data: sortedData.map(stat => stat.deviceName),
        formatter: (name) => {
          const item = sortedData.find(stat => stat.deviceName === name);
          if (type === 'count') {
            return `${name}: ${item.count}次 (${item.countPercent}%)`;
          } else {
            return `${name}: ${item.totalDurationHours}h (${item.durationPercent}%)`;
          }
        },
        selectedMode: 'multiple',
        inactiveColor: '#ccc',
        itemStyle: {
          borderWidth: 0
        }
      },
      series: [
        {
          name: type === 'count' ? '告警次数' : '告警时长',
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['30%', '50%'],
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

    // 处理窗口大小变化
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, type, getDeviceColor]);

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

export default AlarmPieChart;
