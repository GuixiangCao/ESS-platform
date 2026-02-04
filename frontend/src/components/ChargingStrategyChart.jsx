import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const ChargingStrategyChart = ({ date, stationId }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [strategyData, setStrategyData] = useState(null);

  useEffect(() => {
    if (!chartRef.current || !date || !stationId) return;

    const fetchStrategyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 格式化日期为 YYYY-MM-DD
        const formatDateForAPI = (dateStr) => {
          const d = new Date(dateStr);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const formattedDate = formatDateForAPI(date);
        console.log('Fetching charging strategy for:', stationId, formattedDate);

        // 获取充放电策略数据
        const response = await fetch(
          `http://localhost:5001/api/charging-strategies/station/${stationId}/date/${formattedDate}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        console.log('Charging strategy response status:', response.status);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('该日期暂无充放电策略数据');
          }
          throw new Error('获取充放电策略失败');
        }

        const result = await response.json();
        console.log('Charging strategy data:', result);

        if (result.success && result.data) {
          setStrategyData(result.data);
          renderChart(result.data);
        } else {
          renderEmptyChart('暂无策略数据');
        }
      } catch (error) {
        console.error('获取充放电策略失败:', error);
        setError(error.message);
        renderEmptyChart(error.message);
      } finally {
        setLoading(false);
      }
    };

    const renderEmptyChart = (message = '暂无策略数据') => {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const option = {
        title: {
          text: '充放电策略',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)'
          },
          subtext: message,
          subtextStyle: {
            fontSize: 12,
            color: 'var(--text-secondary)'
          }
        },
        grid: {
          left: '60px',
          right: '20px',
          top: '80px',
          bottom: '40px'
        }
      };

      chartInstance.current.setOption(option, true);
    };

    const renderChart = (strategy) => {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      // 转换分钟为时:分格式
      const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      // 转换时:分格式为分钟数
      const timeToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      // 构建时间段数据
      const periods = [];
      let chargeCount = 0;
      let dischargeCount = 0;

      if (strategy.timeslots && strategy.timeslots.length > 0) {
        strategy.timeslots.forEach((slot) => {
          const startMinutes = timeToMinutes(slot.stime);
          const endMinutes = timeToMinutes(slot.etime);

          let name, color, type;

          if (slot.ctype === 1) {
            // 充电
            chargeCount++;
            name = `充电 ${chargeCount}`;
            color = '#3b82f6'; // 蓝色
            type = 'charge';
          } else if (slot.ctype === 2) {
            // 放电
            dischargeCount++;
            name = `放电 ${dischargeCount}`;
            color = '#f97316'; // 橙色
            type = 'discharge';
          } else {
            // 空闲
            name = '空闲';
            color = '#e5e7eb'; // 浅灰色
            type = 'idle';
          }

          periods.push({
            name,
            value: [startMinutes, endMinutes],
            itemStyle: { color },
            type,
            power: slot.power || 0
          });
        });
      }

      // 如果没有任何周期数据，显示空闲状态
      if (periods.length === 0) {
        periods.push({
          name: '空闲',
          value: [0, 1440],
          itemStyle: { color: '#9ca3af' },
          type: 'idle',
          power: 0
        });
      }

      // 注意：数据库中的策略已经包含了空闲时段(ctype=3)，所以不需要再自动填充间隙

      // 调试日志
      console.log('Periods to render:', periods);
      console.log('Valid periods count:', periods.filter(p => p && p.itemStyle).length);

      // 按类型分组数据
      const chargeData = periods.filter(p => p.type === 'charge');
      const dischargeData = periods.filter(p => p.type === 'discharge');
      const idleData = periods.filter(p => p.type === 'idle');

      const option = {
        title: {
          text: '充放电策略',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (!params || !params.data || !params.value) {
              return '';
            }

            const [start, end] = params.value;
            const duration = ((end - start) / 60).toFixed(2);
            const typeName = params.data.type === 'charge' ? '充电' :
                            params.data.type === 'discharge' ? '放电' : '空闲';

            const color = params.data.itemStyle.color;

            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                  <span>${typeName}</span>
                </div>
                <div style="font-size: 12px; line-height: 1.6;">
                  <div><strong>时段:</strong> ${minutesToTime(start)} - ${minutesToTime(end)}</div>
                  <div><strong>时长:</strong> ${duration} 小时</div>
                  ${params.data.power > 0 ? `<div><strong>功率:</strong> ${params.data.power} kW</div>` : ''}
                </div>
              </div>
            `;
          }
        },
        legend: {
          data: ['充电', '放电', '空闲'],
          top: 40,
          left: 'center',
          itemWidth: 20,
          itemHeight: 12,
          textStyle: {
            fontSize: 12,
            color: 'var(--text-primary)'
          }
        },
        grid: {
          left: '80px',
          right: '20px',
          top: '80px',
          bottom: '40px'
        },
        xAxis: {
          type: 'value',
          min: 0,
          max: 1440,
          interval: 180, // 每3小时一个刻度
          axisLabel: {
            fontSize: 10,
            formatter: (value) => minutesToTime(value),
            rotate: 0,
            margin: 8
          },
          splitLine: {
            show: true,
            lineStyle: {
              type: 'dashed',
              color: 'var(--border)',
              opacity: 0.3
            }
          },
          axisTick: {
            show: true,
            alignWithLabel: true
          }
        },
        yAxis: {
          type: 'category',
          data: ['充电', '放电', '空闲'],
          axisLabel: {
            fontSize: 11,
            color: 'var(--text-primary)',
            fontWeight: 500
          },
          axisTick: {
            show: false
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: 'var(--border)'
            }
          }
        },
        series: [
          // 充电时段
          {
            name: '充电',
            type: 'custom',
            renderItem: (params, api) => {
              if (!params.data || !params.data.itemStyle) {
                return null;
              }

              const start = api.value(0);
              const end = api.value(1);
              const startPoint = api.coord([start, '充电']);
              const endPoint = api.coord([end, '充电']);
              const height = api.size([0, 1])[1] * 0.5;
              const y = startPoint[1] - height / 2;

              const rectShape = echarts.graphic.clipRectByRect(
                {
                  x: startPoint[0],
                  y: y,
                  width: endPoint[0] - startPoint[0],
                  height: height
                },
                {
                  x: params.coordSys.x,
                  y: params.coordSys.y,
                  width: params.coordSys.width,
                  height: params.coordSys.height
                }
              );

              return (
                rectShape && {
                  type: 'rect',
                  transition: ['shape'],
                  shape: rectShape,
                  style: {
                    fill: params.data.itemStyle.color,
                    stroke: params.data.itemStyle.color,
                    lineWidth: 1
                  }
                }
              );
            },
            data: chargeData
              .filter(p => p && p.itemStyle && p.value && p.value.length >= 2)
              .map(p => ({
                value: [p.value[0], p.value[1]],
                itemStyle: p.itemStyle,
                name: p.name,
                type: p.type,
                power: p.power
              }))
          },
          // 放电时段
          {
            name: '放电',
            type: 'custom',
            renderItem: (params, api) => {
              if (!params.data || !params.data.itemStyle) {
                return null;
              }

              const start = api.value(0);
              const end = api.value(1);
              const startPoint = api.coord([start, '放电']);
              const endPoint = api.coord([end, '放电']);
              const height = api.size([0, 1])[1] * 0.5;
              const y = startPoint[1] - height / 2;

              const rectShape = echarts.graphic.clipRectByRect(
                {
                  x: startPoint[0],
                  y: y,
                  width: endPoint[0] - startPoint[0],
                  height: height
                },
                {
                  x: params.coordSys.x,
                  y: params.coordSys.y,
                  width: params.coordSys.width,
                  height: params.coordSys.height
                }
              );

              return (
                rectShape && {
                  type: 'rect',
                  transition: ['shape'],
                  shape: rectShape,
                  style: {
                    fill: params.data.itemStyle.color,
                    stroke: params.data.itemStyle.color,
                    lineWidth: 1
                  }
                }
              );
            },
            data: dischargeData
              .filter(p => p && p.itemStyle && p.value && p.value.length >= 2)
              .map(p => ({
                value: [p.value[0], p.value[1]],
                itemStyle: p.itemStyle,
                name: p.name,
                type: p.type,
                power: p.power
              }))
          },
          // 空闲时段
          {
            name: '空闲',
            type: 'custom',
            renderItem: (params, api) => {
              if (!params.data || !params.data.itemStyle) {
                return null;
              }

              const start = api.value(0);
              const end = api.value(1);
              const startPoint = api.coord([start, '空闲']);
              const endPoint = api.coord([end, '空闲']);
              const height = api.size([0, 1])[1] * 0.5;
              const y = startPoint[1] - height / 2;

              const rectShape = echarts.graphic.clipRectByRect(
                {
                  x: startPoint[0],
                  y: y,
                  width: endPoint[0] - startPoint[0],
                  height: height
                },
                {
                  x: params.coordSys.x,
                  y: params.coordSys.y,
                  width: params.coordSys.width,
                  height: params.coordSys.height
                }
              );

              return (
                rectShape && {
                  type: 'rect',
                  transition: ['shape'],
                  shape: rectShape,
                  style: {
                    fill: params.data.itemStyle.color,
                    stroke: params.data.itemStyle.color,
                    lineWidth: 1
                  }
                }
              );
            },
            data: idleData
              .filter(p => p && p.itemStyle && p.value && p.value.length >= 2)
              .map(p => ({
                value: [p.value[0], p.value[1]],
                itemStyle: p.itemStyle,
                name: p.name,
                type: p.type,
                power: p.power
              }))
          }
        ]
      };

      chartInstance.current.setOption(option, true);
    };

    fetchStrategyData();

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

  return (
    <div style={{ width: '100%', marginTop: '1.5rem' }}>
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          加载充放电策略中...
        </div>
      )}
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: '250px',
          display: loading ? 'none' : 'block'
        }}
      />
      {error && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '0.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          fontStyle: 'italic'
        }}>
          {error}
        </div>
      )}

      {/* 充放电策略表格 */}
      {!loading && !error && strategyData && strategyData.timeslots && strategyData.timeslots.length > 0 && (
        <div style={{
          marginTop: '1rem',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem'
          }}>
            <thead>
              <tr style={{
                background: 'var(--surface-hover)',
                borderBottom: '2px solid var(--border)'
              }}>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  width: '15%'
                }}>类型</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  width: '25%'
                }}>开始时间</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  width: '25%'
                }}>结束时间</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  width: '20%'
                }}>时长</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  width: '15%'
                }}>功率</th>
              </tr>
            </thead>
            <tbody>
              {strategyData.timeslots.map((slot, index) => {
                const typeName = slot.ctype === 1 ? '充电' : slot.ctype === 2 ? '放电' : '空闲';
                const typeColor = slot.ctype === 1 ? '#3b82f6' : slot.ctype === 2 ? '#f97316' : '#9ca3af';

                // 计算时长
                const [startH, startM] = slot.stime.split(':').map(Number);
                const [endH, endM] = slot.etime.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                const durationMinutes = endMinutes - startMinutes;
                const durationHours = (durationMinutes / 60).toFixed(2);

                return (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: index % 2 === 0 ? 'transparent' : 'var(--surface-hover)'
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        background: `${typeColor}20`,
                        color: typeColor,
                        fontWeight: 500,
                        fontSize: '0.85rem'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: typeColor
                        }} />
                        {typeName}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      {slot.stime}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      {slot.etime}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      {durationHours} 小时
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      color: slot.power > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: slot.power > 0 ? 500 : 400,
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      {slot.power > 0 ? `${slot.power} kW` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChargingStrategyChart;
