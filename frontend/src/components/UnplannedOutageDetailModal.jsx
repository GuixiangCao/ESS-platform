import { X } from 'lucide-react';
import DailySocChart from './DailySocChart';
import './UnplannedOutageDetailModal.css';

const UnplannedOutageDetailModal = ({ isOpen, onClose, unplannedOutageData }) => {
  if (!isOpen) return null;

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

  const details = unplannedOutageData?.details || [];
  const totalLoss = unplannedOutageData?.totalUnplannedOutageLoss || 0;
  const noChargingDays = unplannedOutageData?.noChargingDays || 0;

  // 按日期倒序排列
  const sortedDetails = [...details].sort((a, b) =>
    new Date(b.dateStr) - new Date(a.dateStr)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content unplanned-outage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>非计划性停机损失详情</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {noChargingDays === 0 ? (
            <div className="empty-state">
              <p>暂无非计划性停机损失数据</p>
              <p className="empty-state-hint">所有工作日都有正常的充放电活动</p>
            </div>
          ) : (
            <>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">无充放电天数</span>
                  <span className="summary-value highlight-orange">{noChargingDays} 天</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">总损失</span>
                  <span className="summary-value highlight">
                    {formatCurrency(totalLoss)}
                  </span>
                </div>
              </div>

              <div className="info-banner">
                <p>
                  以下工作日未检测到充放电活动（SOC波动 &lt; 1%），可能原因：
                  <strong>设备故障、策略配置问题或人为停机</strong>
                </p>
              </div>

              <div className="daily-list">
                {sortedDetails.map((day, index) => (
                  <div key={index} className="daily-item">
                    <div className="daily-header">
                      <div className="daily-date">
                        <span className="date-text">{formatDate(day.dateStr)}</span>
                        <span className="date-badge">工作日</span>
                      </div>
                      <div className="daily-stats">
                        <span className="daily-loss-orange">
                          {formatCurrency(day.loss)}
                        </span>
                      </div>
                    </div>

                    <div className="day-details">
                      <div className="detail-row">
                        <div className="detail-item">
                          <span className="detail-label">理论收益</span>
                          <span className="detail-value">
                            {formatCurrency(day.expectedRevenue)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">实际收益</span>
                          <span className="detail-value">
                            {formatCurrency(day.actualRevenue)}
                          </span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-item">
                          <span className="detail-label">SOC波动</span>
                          <span className="detail-value-small">
                            {day.socRange?.toFixed(2) || '0.00'}%
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">数据点数</span>
                          <span className="detail-value-small">
                            {day.dataPoints || 0} 个
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SOC曲线展示 */}
                    <div className="soc-chart-container">
                      <h4 className="soc-chart-title">全天SOC变化曲线</h4>
                      <DailySocChart socData={day.socData} dateStr={day.dateStr} />
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

export default UnplannedOutageDetailModal;
