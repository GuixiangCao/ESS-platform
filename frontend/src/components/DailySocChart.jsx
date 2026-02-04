import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const DailySocChart = ({ socData, dateStr }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !socData || socData.length === 0) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 准备数据
    const timeData = socData.map(point => {
      const date = new Date(point.time);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    });

    const socValues = socData.map(point => point.soc);

    // 配置选项
    const option = {
      grid: {
        left: '10%',
        right: '5%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: timeData,
        axisLabel: {
          rotate: 45,
          interval: Math.floor(timeData.length / 8), // 只显示部分标签
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#94a3b8'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'SOC (%)',
        nameTextStyle: {
          fontSize: 11,
          color: '#64748b'
        },
        axisLabel: {
          fontSize: 10,
          formatter: '{value}%'
        },
        axisLine: {
          lineStyle: {
            color: '#94a3b8'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: 'SOC',
          type: 'line',
          data: socValues,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#a855f7',
            width: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(168, 85, 247, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(168, 85, 247, 0.05)'
                }
              ]
            }
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const param = params[0];
          return `${param.axisValue}<br/>SOC: ${param.value}%`;
        }
      }
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
  }, [socData, dateStr]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (!socData || socData.length === 0) {
    return (
      <div className="soc-chart-empty">
        <p>无SOC数据</p>
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: '200px' }} />;
};

export default DailySocChart;
