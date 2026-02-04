import { X } from 'lucide-react';
import './EquipmentOutageDetailModal.css';

const EquipmentOutageDetailModal = ({ isOpen, onClose, alarmData }) => {
  if (!isOpen) return null;

  // 按日期汇总告警损失
  const dailySummary = {};

  if (alarmData && alarmData.length > 0) {
    alarmData.forEach(alarm => {
      if (alarm.loss > 0 && !alarm.isHoliday) { // 只统计工作日的告警损失
        const dateKey = new Date(alarm.startTime).toISOString().split('T')[0];

        if (!dailySummary[dateKey]) {
          dailySummary[dateKey] = {
            date: dateKey,
            alarmCount: 0,
            totalLoss: 0,
            alarms: []
          };
        }

        dailySummary[dateKey].alarmCount += 1;
        dailySummary[dateKey].totalLoss += alarm.loss;
        dailySummary[dateKey].alarms.push({
          alarmId: alarm.alarmId,
          alarmName: alarm.alarmName,
          device: alarm.device,
          startTime: alarm.startTime,
          endTime: alarm.endTime,
          durationHours: alarm.durationHours,
          loss: alarm.loss
        });
      }
    });
  }

  // 转换为数组并按日期排序
  const dailyList = Object.values(dailySummary).sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content equipment-outage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>设备停机损失详情</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {dailyList.length === 0 ? (
            <div className="empty-state">
              <p>暂无设备停机损失数据</p>
            </div>
          ) : (
            <>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">停机天数</span>
                  <span className="summary-value">{dailyList.length} 天</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">告警总数</span>
                  <span className="summary-value">
                    {dailyList.reduce((sum, day) => sum + day.alarmCount, 0)} 次
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">总损失</span>
                  <span className="summary-value highlight">
                    {formatCurrency(dailyList.reduce((sum, day) => sum + day.totalLoss, 0))}
                  </span>
                </div>
              </div>

              <div className="daily-list">
                {dailyList.map((day) => (
                  <div key={day.date} className="daily-item">
                    <div className="daily-header">
                      <div className="daily-date">
                        <span className="date-text">{formatDate(day.date)}</span>
                      </div>
                      <div className="daily-stats">
                        <span className="alarm-count">{day.alarmCount} 次告警</span>
                        <span className="daily-loss">{formatCurrency(day.totalLoss)}</span>
                      </div>
                    </div>

                    <div className="alarm-details">
                      {day.alarms.map((alarm, index) => (
                        <div key={index} className="alarm-detail-item">
                          <div className="alarm-info">
                            <span className="alarm-name">{alarm.alarmName}</span>
                            <span className="alarm-device">{alarm.device}</span>
                          </div>
                          <div className="alarm-metrics">
                            <span className="alarm-duration">
                              持续 {alarm.durationHours?.toFixed(2) || 0}h
                            </span>
                            <span className="alarm-loss">
                              {formatCurrency(alarm.loss)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentOutageDetailModal;
