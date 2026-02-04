import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const ElectricityPriceChart = ({ date, stationId }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !date || !stationId) return;

    const fetchPriceData = async () => {
      try {
        // 将日期格式化为 YYYY-MM-DD
        const formatDateForAPI = (dateStr) => {
          const d = new Date(dateStr);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const formattedDate = formatDateForAPI(date);

        // 获取电价曲线数据
        const response = await fetch(
          `http://localhost:5001/api/electricity-prices/daily-curve?date=${formattedDate}&regionId=330000&userType=0&voltageType=1`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('获取电价数据失败');
        }

        const result = await response.json();
        if (result.success && result.data) {
          renderChart(result.data);
        }
      } catch (error) {
        console.error('获取电价数据失败:', error);
      }
    };

    const renderChart = (data) => {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const { curveData, segments } = data;

      // 准备数据
      const hours = curveData.map(d => d.time);
      const prices = curveData.map(d => d.price || 0);

      // 颜色映射（根据电价类型）
      const colorMap = {
        1: '#ef4444', // 尖峰 - 红色
        2: '#f59e0b', // 高峰 - 橙色
        3: '#10b981', // 平峰 - 绿色
        4: '#3b82f6', // 低谷 - 蓝色
        5: '#8b5cf6'  // 深谷 - 紫色
      };

      // 构建标记线数据
      const markAreas = segments.map(seg => {
        return {
          name: seg.typeName,
          xAxis: `${String(seg.startHour).padStart(2, '0')}:00`,
          xAxisEnd: `${String(seg.endHour).padStart(2, '0')}:00`,
          itemStyle: {
            color: colorMap[seg.type] + '20',
            opacity: 0.2
          },
          label: {
            show: true,
            position: 'insideTop',
            formatter: `{a|${seg.typeName}}`,
            rich: {
              a: {
                fontSize: 10,
                color: colorMap[seg.type],
                fontWeight: 600
              }
            }
          }
        };
      });

      const option = {
        title: {
          text: '全天电价走势',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const param = params[0];
            const segment = segments.find(s =>
              param.dataIndex >= s.startHour && param.dataIndex < s.endHour
            );
            return `
              <div style="padding: 4px;">
                <div style="font-weight: 600; margin-bottom: 4px;">
                  ${param.axisValue}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color};"></span>
                  <span>电价: ${param.value ? param.value.toFixed(4) : '0.0000'} 元/kWh</span>
                </div>
                ${segment ? `<div style="margin-top: 4px; font-size: 12px; color: ${colorMap[segment.type]};">时段: ${segment.typeName}</div>` : ''}
              </div>
            `;
          }
        },
        grid: {
          left: '60px',
          right: '20px',
          top: '60px',
          bottom: '60px'
        },
        xAxis: {
          type: 'category',
          data: hours,
          axisTick: {
            alignWithLabel: true
          },
          axisLabel: {
            fontSize: 10,
            interval: 2  // 每隔2小时显示一个标签
          }
        },
        yAxis: {
          type: 'value',
          name: '电价 (元/kWh)',
          nameTextStyle: {
            fontSize: 11,
            color: 'var(--text-secondary)'
          },
          axisLabel: {
            fontSize: 10,
            formatter: (value) => value.toFixed(2)
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'var(--border)'
            }
          }
        },
        series: [
          {
            name: '电价',
            type: 'line',
            data: prices,
            smooth: false,
            lineStyle: {
              width: 2,
              color: '#3b82f6'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ])
            },
            markArea: {
              silent: true,
              data: markAreas.map(area => [
                { xAxis: area.xAxis, itemStyle: area.itemStyle, label: area.label },
                { xAxis: area.xAxisEnd }
              ])
            }
          }
        ]
      };

      chartInstance.current.setOption(option, true);
    };

    fetchPriceData();

    // 监听窗口大小变化
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [date, stationId]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} style={{ width: '100%', height: '300px', marginTop: '1rem' }} />;
};

export default ElectricityPriceChart;
