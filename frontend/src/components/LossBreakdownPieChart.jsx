import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const LossBreakdownPieChart = ({ alarmLoss, totalRevenueLoss, holidayLoss = 0, unplannedOutageLoss = 0, onItemClick }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);

      // 添加点击事件监听
      if (onItemClick) {
        chartInstance.current.on('click', (params) => {
          console.log('图表点击事件:', params);
          if (params.componentType === 'series') {
            onItemClick(params.name, params.value);
          }
        });
      }
    }

    // 准备数据：设备停机损失、非计划性停机损失、节假日损失和其他损失
    const chartData = [];

    // 如果没有总损失收益数据，显示空状态
    if (!totalRevenueLoss || totalRevenueLoss <= 0) {
      const option = {
        title: {
          text: '暂无损失数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      };
      chartInstance.current.setOption(option);
      return;
    }

    // 添加设备停机损失（工作日告警损失）
    if (alarmLoss > 0) {
      chartData.push({
        name: '故障停机损失',
        value: alarmLoss,
        itemStyle: {
          color: '#ef4444' // 红色
        }
      });
    }

    // 添加非计划性停机损失（工作日无充放电损失）
    if (unplannedOutageLoss > 0) {
      chartData.push({
        name: '非计划性停机损失',
        value: unplannedOutageLoss,
        itemStyle: {
          color: '#a855f7' // 紫色
        }
      });
    }

    // 添加节假日损失
    if (holidayLoss > 0) {
      chartData.push({
        name: '节假日损失',
        value: holidayLoss,
        itemStyle: {
          color: '#3b82f6' // 蓝色
        }
      });
    }

    // 添加其他损失（总损失收益 - 设备停机损失 - 非计划性停机损失 - 节假日损失）
    const otherLoss = totalRevenueLoss - alarmLoss - unplannedOutageLoss - holidayLoss;
    if (otherLoss > 0) {
      chartData.push({
        name: '其他损失',
        value: otherLoss,
        itemStyle: {
          color: '#94a3b8' // 灰色
        }
      });
    }

    // 如果没有任何损失数据，显示空状态
    if (chartData.length === 0) {
      const option = {
        title: {
          text: '暂无损失数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      };
      chartInstance.current.setOption(option);
      return;
    }

    const totalLoss = chartData.reduce((sum, item) => sum + item.value, 0);

    // 在控制台输出数据验证信息
    console.log('=== LossBreakdownPieChart 组件数据 ===');
    console.log('总损失收益 (totalRevenueLoss):', totalRevenueLoss);
    console.log('设备停机损失 (alarmLoss):', alarmLoss.toFixed(2), '元');
    console.log('非计划性停机损失 (unplannedOutageLoss):', unplannedOutageLoss.toFixed(2), '元');
    console.log('节假日损失 (holidayLoss):', holidayLoss.toFixed(2), '元');
    console.log('其他损失:', otherLoss.toFixed(2), '元');
    console.log('计算出的总损失:', totalLoss.toFixed(2), '元');
    console.log('图表数据项数量:', chartData.length);
    console.log('图表数据明细:', chartData);

    // 按金额从高到低排序
    chartData.sort((a, b) => b.value - a.value);

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
          return `${params.name}<br/>${value} (${params.percent}%)`;
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
          fontSize: 13
        },
        formatter: (name) => {
          const item = chartData.find(d => d.name === name);
          const percentage = ((item.value / totalLoss) * 100).toFixed(1);
          return `${name}: ${percentage}%`;
        },
        selectedMode: 'multiple',
        inactiveColor: '#ccc'
      },
      series: [
        {
          name: '损失构成',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          cursor: onItemClick ? 'pointer' : 'default',
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
  }, [alarmLoss, totalRevenueLoss, holidayLoss, unplannedOutageLoss, onItemClick]);

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

export default LossBreakdownPieChart;
