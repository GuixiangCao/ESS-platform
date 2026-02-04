import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const RevenuePieChart = ({ actualRevenue, revenueLoss }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || (actualRevenue === 0 && revenueLoss === 0)) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const total = actualRevenue + revenueLoss;
    const actualPercentage = ((actualRevenue / total) * 100).toFixed(1);
    const lossPercentage = ((revenueLoss / total) * 100).toFixed(1);

    // 准备数据
    const chartData = [
      {
        name: '实际收益',
        value: actualRevenue,
        itemStyle: {
          color: '#10b981' // 绿色
        }
      },
      {
        name: '损失收益',
        value: revenueLoss,
        itemStyle: {
          color: '#ef4444' // 红色
        }
      }
    ];

    // 配置选项
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const value = new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2
          }).format(params.value);
          return `${params.name}: ${value} (${params.percent}%)`;
        },
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
        right: '10%',
        top: 'center',
        textStyle: {
          fontSize: 14
        },
        formatter: (name) => {
          const percentage = name === '实际收益' ? actualPercentage : lossPercentage;
          return `${name}: ${percentage}%`;
        },
        selectedMode: false
      },
      series: [
        {
          name: '收益构成',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 3
          },
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            formatter: '{d}%',
            color: '#000'
          },
          emphasis: {
            scale: true,
            scaleSize: 10,
            label: {
              show: true,
              fontSize: 20,
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
  }, [actualRevenue, revenueLoss]);

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

export default RevenuePieChart;
