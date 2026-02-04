import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const LossPieChart = ({ data, getLossTypeColor }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 计算总损失
    const totalLoss = data.reduce((sum, stat) => sum + stat.totalLoss, 0);

    // 准备数据并按占比从高到低排序
    const sortedData = [...data].sort((a, b) => b.totalLoss - a.totalLoss);

    const chartData = sortedData.map(stat => ({
      name: stat.lossTypeName,
      value: stat.totalLoss,
      itemStyle: {
        color: getLossTypeColor(stat.lossType)
      }
    }));

    // 配置选项
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)',
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
          fontSize: 13
        },
        data: sortedData.map(stat => stat.lossTypeName),
        formatter: (name) => {
          const item = sortedData.find(stat => stat.lossTypeName === name);
          const percentage = ((item.totalLoss / totalLoss) * 100).toFixed(1);
          return `${name}: ${percentage}%`;
        },
        selectedMode: 'multiple',
        inactiveColor: '#ccc',
        itemStyle: {
          borderWidth: 0
        }
      },
      series: [
        {
          name: '损失类型',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            formatter: '{d}%',
            color: '#000'
          },
          emphasis: {
            scale: true,
            scaleSize: 10,
            label: {
              show: true,
              fontSize: 18,
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
  }, [data, getLossTypeColor]);

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

export default LossPieChart;
