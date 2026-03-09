import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const LossBreakdownPieChart = ({ alarmLoss, totalRevenueLoss, holidayLoss = 0, unplannedOutageLoss = 0, powerLimitationLoss = 0, strategyDeviationLoss = 0, onItemClick, stationId, aiSummary }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const isNestedStation = [205, 233].includes(Number(stationId));

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
      chartInstance.current.setOption(option, true);
      return;
    }

    // 添加设备停机损失（工作日告警损失）
    if (alarmLoss > 0) {
      chartData.push({
        name: '故障停机损失',
        value: alarmLoss,
        itemStyle: {
          color: '#e17055' // 深橙色
        }
      });
    }

    // 添加非计划性停机损失（工作日无充放电损失）
    if (unplannedOutageLoss > 0) {
      chartData.push({
        name: '非计划性停机损失',
        value: unplannedOutageLoss,
        itemStyle: {
          color: '#f59e0b' // 橙色
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

    // 添加功率受限损失
    if (powerLimitationLoss > 0) {
      chartData.push({
        name: '超容损失',
        value: powerLimitationLoss,
        itemStyle: {
          color: '#06b6d4' // 青色
        }
      });
    }

    // 添加策略偏差损失
    if (strategyDeviationLoss > 0) {
      chartData.push({
        name: '策略偏差损失',
        value: strategyDeviationLoss,
        itemStyle: {
          color: '#ec4899' // 粉红色
        }
      });
    }

    // 添加其他损失（总损失收益 - 设备停机损失 - 非计划性停机损失 - 节假日损失 - 功率受限损失 - 策略偏差损失）
    const otherLoss = totalRevenueLoss - alarmLoss - unplannedOutageLoss - holidayLoss - powerLimitationLoss - strategyDeviationLoss;

    // 嵌套电站且有AI分析数据时，将其他损失拆分为AI分类+其余损失
    const AI_RULE_LABELS = { 1: '充电周期优化', 2: '放电周期优化', 3: '静置优化', 4: '充电周期优化' };
    const AI_RULE_COLORS = { 1: '#38bdf8', 2: '#fb923c', 3: '#34d399', 4: '#38bdf8' };
    const ruleBreakdown = isNestedStation && aiSummary?.ruleBreakdown;

    let aiTotal = 0;
    let remainingLoss = 0;

    if (otherLoss > 0 && ruleBreakdown && ruleBreakdown.length > 0) {
      // 合并同名规则（规则1和4都是充电周期优化）
      const mergedRules = {};
      ruleBreakdown.forEach(r => {
        const label = AI_RULE_LABELS[r.ruleId] || `规则${r.ruleId}`;
        const color = AI_RULE_COLORS[r.ruleId] || '#6B7280';
        if (mergedRules[label]) {
          mergedRules[label].value += r.totalImprovement;
        } else {
          mergedRules[label] = { name: label, value: r.totalImprovement, color };
        }
      });

      Object.values(mergedRules).forEach(rule => {
        if (rule.value > 0) {
          chartData.push({
            name: rule.name,
            value: Math.round(rule.value * 100) / 100,
            itemStyle: { color: rule.color }
          });
          aiTotal += rule.value;
        }
      });

      // 其余损失 = 其他损失 - AI可提升总额
      remainingLoss = otherLoss - aiTotal;
      if (remainingLoss > 0) {
        chartData.push({
          name: '其余损失',
          value: Math.round(remainingLoss * 100) / 100,
          itemStyle: { color: '#94a3b8' }
        });
      }
    } else if (otherLoss > 0) {
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
      chartInstance.current.setOption(option, true);
      return;
    }

    const totalLoss = chartData.reduce((sum, item) => sum + item.value, 0);

    // 在控制台输出数据验证信息
    console.log('=== LossBreakdownPieChart 组件数据 ===');
    console.log('总损失收益 (totalRevenueLoss):', totalRevenueLoss);
    console.log('设备停机损失 (alarmLoss):', alarmLoss.toFixed(2), '元');
    console.log('非计划性停机损失 (unplannedOutageLoss):', unplannedOutageLoss.toFixed(2), '元');
    console.log('节假日损失 (holidayLoss):', holidayLoss.toFixed(2), '元');
    console.log('超容损失 (powerLimitationLoss):', powerLimitationLoss.toFixed(2), '元');
    console.log('策略偏差损失 (strategyDeviationLoss):', strategyDeviationLoss.toFixed(2), '元');
    console.log('其他损失:', otherLoss.toFixed(2), '元');
    console.log('计算出的总损失:', totalLoss.toFixed(2), '元');
    console.log('图表数据项数量:', chartData.length);
    console.log('图表数据明细:', chartData);

    // 嵌套电站：按可挽回性分组排列，可挽回在前使其出现在右侧（与外环对齐）
    if (isNestedStation && aiTotal > 0) {
      const recoverableNames = new Set(Object.values(AI_RULE_LABELS));
      const unrecoverableItems = chartData.filter(d => !recoverableNames.has(d.name));
      const recoverableItems = chartData.filter(d => recoverableNames.has(d.name));
      unrecoverableItems.sort((a, b) => b.value - a.value);
      recoverableItems.sort((a, b) => b.value - a.value);
      chartData.length = 0;
      chartData.push(...recoverableItems, ...unrecoverableItems);
    } else {
      chartData.sort((a, b) => b.value - a.value);
    }

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2
      }).format(value);
    };

    let option;
    let unrecoverableLoss = 0;
    let recoverableLoss = 0;

    if (isNestedStation) {
      // ============ 嵌套模式（电站205/233） ============
      unrecoverableLoss = (alarmLoss > 0 ? alarmLoss : 0)
        + (unplannedOutageLoss > 0 ? unplannedOutageLoss : 0)
        + (holidayLoss > 0 ? holidayLoss : 0)
        + (powerLimitationLoss > 0 ? powerLimitationLoss : 0)
        + (strategyDeviationLoss > 0 ? strategyDeviationLoss : 0)
        + (remainingLoss > 0 ? remainingLoss : 0);
      recoverableLoss = aiTotal > 0 ? aiTotal : (otherLoss > 0 ? otherLoss : 0);

      const innerData = [];

      // 可挽回放在首位，使其弧段出现在饼图右侧（与外环对齐）
      if (recoverableLoss > 0) {
        innerData.push({
          name: '可挽回',
          value: recoverableLoss,
          itemStyle: { color: '#8b5cf6' }
        });
      }
      if (unrecoverableLoss > 0) {
        innerData.push({
          name: '不可挽回',
          value: unrecoverableLoss,
          itemStyle: { color: '#f87171' }
        });
      }

      const pieCenter = ['25%', '50%'];

      option = {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const value = formatCurrency(params.value);
            const colorStr = typeof params.color === 'string' ? params.color : (params.name === '不可挽回' ? '#f87171' : params.name === '可挽回' ? '#8b5cf6' : params.color?.colorStops?.[1]?.color || '#666');
            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorStr};margin-right:6px;vertical-align:middle;"></span>`;
            return `
            <div style="font-size:0px;color:rgba(255,255,255,0.7);margin-bottom:0px;"></div>
            ${dot}
            <span style="font-weight:600;">${params.name}</span><br/><span style="font-size:18px;font-weight:700;letter-spacing:0.5px;">${value}</span>
            <br/><span style="color:rgba(255,255,255,0.6);">占比 ${params.percent}%</span>`;
          },
          backgroundColor: 'rgba(20, 20, 30, 0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: [12, 16],
          textStyle: { color: '#fff', fontSize: 13 },
          extraCssText: 'border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.35); backdrop-filter: blur(8px);'
        },
        legend: [
          // 内环图例（损失明细）
          {
            orient: 'vertical',
            right: '15%',
            top: 'middle',
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 12,
            textStyle: {
              fontSize: 12,
              color: '#555',
              rich: {
                name: { fontSize: 12, color: '#333', padding: [0, 0, 0, 4] },
                pct: { fontSize: 12, color: '#666', fontWeight: 600 },
                rec: { fontSize: 10, color: '#7c3aed', backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 3, padding: [2, 4] },
                unrec: { fontSize: 10, color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 3, padding: [2, 4] }
              }
            },
            data: chartData.map(d => d.name),
            formatter: (name) => {
              const item = chartData.find(d => d.name === name);
              if (!item) return name;
              const pct = ((item.value / totalLoss) * 100).toFixed(1);
              const recSet = new Set(Object.values(AI_RULE_LABELS));
              const isRec = recSet.has(name);
              return isRec
                ? `{name|${name}} {pct|${pct}%} {rec|可挽回}`
                : `{name|${name}} {pct|${pct}%} {unrec|不可挽回}`;
            },
            selectedMode: 'multiple',
            inactiveColor: '#ddd'
          },
          // 外环图例（可挽回性）
          {
            orient: 'horizontal',
            left: 'center',
            bottom: '2%',
            itemWidth: 16,
            itemHeight: 10,
            itemGap: 36,
            textStyle: {
              fontSize: 13,
              fontWeight: 600,
              rich: {
                name: { fontSize: 13, fontWeight: 600, color: '#333', padding: [0, 0, 0, 4] },
                pct: { fontSize: 13, fontWeight: 700, color: '#555' }
              }
            },
            data: innerData.map(d => ({
              name: d.name,
              icon: 'roundRect'
            })),
            formatter: (name) => {
              const item = innerData.find(d => d.name === name);
              if (!item) return name;
              const innerTotal = innerData.reduce((s, d) => s + d.value, 0);
              const pct = ((item.value / innerTotal) * 100).toFixed(1);
              return `{name|${name}} {pct|${pct}%}`;
            },
            selectedMode: false
          }
        ],
        animationDuration: 800,
        animationEasing: 'cubicInOut',
        series: [
          // 内环：实心饼图 - 损失明细
          {
            name: '损失构成',
            type: 'pie',
            radius: [0, '42%'],
            center: pieCenter,
            cursor: onItemClick ? 'pointer' : 'default',
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'inside',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              formatter: (params) => params.percent >= 8 ? `${params.percent}%` : '',
              textBorderColor: 'rgba(0,0,0,0.3)',
              textBorderWidth: 2
            },
            emphasis: {
              scale: true,
              scaleSize: 4,
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
                formatter: '{b}\n{d}%',
                lineHeight: 18
              },
              itemStyle: {
                shadowBlur: 20,
                shadowColor: 'rgba(0, 0, 0, 0.35)'
              }
            },
            labelLine: { show: false },
            data: chartData
          },
          // 间隔装饰环
          {
            name: '',
            type: 'pie',
            radius: ['43%', '45%'],
            center: pieCenter,
            silent: true,
            animation: false,
            label: { show: false },
            labelLine: { show: false },
            tooltip: { show: false },
            data: [{
              value: 1,
              itemStyle: {
                color: 'rgba(0,0,0,0.04)',
                borderWidth: 0
              }
            }]
          },
          // 外环：环形图 - 可挽回 vs 不可挽回
          {
            name: '可挽回性',
            type: 'pie',
            radius: ['48%', '62%'],
            center: pieCenter,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'inside',
              formatter: '{b}\n{d}%',
              lineHeight: 18,
              rich: {
                b: { fontSize: 13, fontWeight: 700, color: '#1a1a2e' },
                d: { fontSize: 12, fontWeight: 600, color: '#444' }
              },
              fontSize: 13,
              fontWeight: 700,
              color: '#1a1a2e',
              textBorderColor: 'rgba(255,255,255,0.7)',
              textBorderWidth: 2
            },
            emphasis: {
              scale: true,
              scaleSize: 8,
              label: { fontSize: 15, fontWeight: 800 },
              itemStyle: {
                shadowBlur: 20,
                shadowColor: 'rgba(0, 0, 0, 0.35)'
              }
            },
            labelLine: { show: false },
            data: innerData
          }
        ]
      };
    } else {
      // ============ 普通模式（其他电站） ============
      option = {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const value = formatCurrency(params.value);
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
          right: '5%',
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
            center: ['33%', '50%'],
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
    }

    chartInstance.current.setOption(option, true);

    // 绘制从外环"可挽回"弧段到图表右边缘的虚线引导线
    const drawGuideLine = () => {
      if (!isNestedStation || aiTotal <= 0 || recoverableLoss <= 0 || !chartInstance.current) return;

      const cw = chartInstance.current.getWidth();
      const ch = chartInstance.current.getHeight();
      if (cw <= 0 || ch <= 0) return;

      // 饼图几何参数（与 option 中的 pieCenter/radius 一致）
      const cX = cw * 0.33;
      const cY = ch * 0.50;
      const outerR = 0.62 * Math.min(cw, ch) / 2;

      // 计算"可挽回"弧段中点角度（首项，从12点钟方向顺时针）
      const innerTotal = recoverableLoss + unrecoverableLoss;
      if (innerTotal <= 0) return;
      const recRatio = recoverableLoss / innerTotal;
      const midAngleDeg = 90 - (recRatio * 360 / 2);
      const midAngleRad = midAngleDeg * Math.PI / 180;

      // 弧段外边缘起点（外环外侧偏移6px，整体上移20px）
      const startX = cX + (outerR + 6) * Math.cos(midAngleRad);
      const startY = cY - (outerR + 6) * Math.sin(midAngleRad) - 20;
      const endX = cw;

      // 标签位置参数
      const tagText = '可挽回详情';
      const tagW = 72;
      const tagH = 22;
      const tagX = (startX + endX) / 2;
      const tagY = startY;

      chartInstance.current.setOption({
        graphic: [
          // 起点：弧段上的小圆点
          {
            type: 'circle',
            shape: { cx: startX, cy: startY, r: 4 },
            style: { fill: '#8b5cf6', opacity: 0.9 },
            silent: true, z: 100
          },
          // 起点光晕
          {
            type: 'circle',
            shape: { cx: startX, cy: startY, r: 8 },
            style: { fill: 'rgba(139, 92, 246, 0.2)' },
            silent: true, z: 99
          },
          // 前半段虚线（起点到标签左侧）
          {
            type: 'line',
            shape: { x1: startX + 10, y1: startY, x2: tagX - tagW / 2 - 4, y2: startY },
            style: { stroke: '#8b5cf6', lineWidth: 2, lineDash: [6, 4], opacity: 0.7 },
            silent: true, z: 100
          },
          // 标签胶囊背景
          {
            type: 'rect',
            shape: { x: tagX - tagW / 2, y: tagY - tagH / 2, width: tagW, height: tagH, r: tagH / 2 },
            style: {
              fill: 'rgba(139, 92, 246, 0.12)',
              stroke: 'rgba(139, 92, 246, 0.4)',
              lineWidth: 1.2
            },
            silent: true, z: 101
          },
          // 标签文字
          {
            type: 'text',
            style: {
              text: tagText,
              x: tagX, y: tagY,
              fill: '#7c3aed',
              fontSize: 12,
              fontWeight: '800',
              textAlign: 'center',
              textVerticalAlign: 'middle'
            },
            silent: true, z: 102
          },
          // 后半段虚线（标签右侧到箭头）
          {
            type: 'line',
            shape: { x1: tagX + tagW / 2 + 4, y1: startY, x2: endX - 8, y2: startY },
            style: { stroke: '#8b5cf6', lineWidth: 2, lineDash: [6, 4], opacity: 0.7 },
            silent: true, z: 100
          },
          // 末端箭头（V形）
          {
            type: 'polyline',
            shape: {
              points: [[endX - 7, startY - 6], [endX, startY], [endX - 7, startY + 6]]
            },
            style: {
              stroke: '#7c3aed',
              lineWidth: 2.5,
              fill: 'none',
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round'
            },
            silent: true, z: 100
          }
        ]
      });
    };

    drawGuideLine();

    const handleResize = () => {
      chartInstance.current?.resize();
      drawGuideLine();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [alarmLoss, totalRevenueLoss, holidayLoss, unplannedOutageLoss, powerLimitationLoss, strategyDeviationLoss, onItemClick, isNestedStation, aiSummary]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const hasAiGuide = isNestedStation && aiSummary?.ruleBreakdown?.length > 0;

  return <div ref={chartRef} style={{
    width: hasAiGuide ? 'calc(100% + 20px)' : '100%',
    marginRight: hasAiGuide ? '-20px' : undefined,
    height: isNestedStation ? '425px' : '350px'
  }} />;
};

export default LossBreakdownPieChart;
