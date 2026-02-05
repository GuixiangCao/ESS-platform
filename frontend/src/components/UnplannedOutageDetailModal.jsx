import { useState, useEffect } from 'react';
import { X, Edit2, Save, XCircle, Clock } from 'lucide-react';
import DailySocChart from './DailySocChart';
import OutageReasonPieChart from './OutageReasonPieChart';
import { unplannedOutageReasonService } from '../services/unplannedOutageReasonService';
import './UnplannedOutageDetailModal.css';

// 停机原因类型映射
const REASON_TYPE_OPTIONS = [
  { value: 'power_grid_outage', label: '电网停电' },
  { value: 'equipment_maintenance', label: '设备维护' },
  { value: 'weather_conditions', label: '天气原因' },
  { value: 'policy_restriction', label: '政策限制' },
  { value: 'manual_shutdown', label: '人工停机' },
  { value: 'communication_failure', label: '通讯故障' },
  { value: 'fire', label: '火灾' },
  { value: 'other', label: '其他' }
];

const UnplannedOutageDetailModal = ({ isOpen, onClose, unplannedOutageData }) => {
  // 停机原因状态
  const [reasons, setReasons] = useState({});
  const [editingDate, setEditingDate] = useState(null);
  const [editForm, setEditForm] = useState({ reasonType: 'other', reasonNote: '' });
  const [saving, setSaving] = useState(false);

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

  // 加载停机原因数据
  useEffect(() => {
    if (isOpen && unplannedOutageData?.details && unplannedOutageData?.stationId) {
      loadReasons();
    }
  }, [isOpen, unplannedOutageData]);

  const loadReasons = async () => {
    try {
      const dates = unplannedOutageData.details.map(d => d.dateStr);
      const response = await unplannedOutageReasonService.batchGetReasons(
        unplannedOutageData.stationId,
        dates
      );

      if (response.data.success) {
        setReasons(response.data.data || {});
      }
    } catch (error) {
      console.error('加载停机原因失败:', error);
    }
  };

  // 开始编辑
  const handleStartEdit = (day) => {
    const existingReason = reasons[day.dateStr];

    setEditingDate(day.dateStr);
    setEditForm({
      reasonType: existingReason?.reasonType || 'other',
      reasonNote: existingReason?.reasonNote || ''
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingDate(null);
    setEditForm({ reasonType: 'other', reasonNote: '' });
  };

  // 保存停机原因
  const handleSaveReason = async (dateStr) => {
    setSaving(true);
    try {
      const response = await unplannedOutageReasonService.saveReason(
        unplannedOutageData.stationId,
        dateStr,
        editForm
      );

      if (response.data.success) {
        // 更新本地状态
        setReasons(prev => ({
          ...prev,
          [dateStr]: response.data.data
        }));

        setEditingDate(null);
        setEditForm({ reasonType: 'other', reasonNote: '' });
      }
    } catch (error) {
      console.error('保存停机原因失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 查看历史记录（预留功能）
  const handleViewHistory = async (reasonId) => {
    try {
      const response = await unplannedOutageReasonService.getHistory(reasonId);
      if (response.data.success) {
        console.log('历史记录:', response.data.data);
        // TODO: 显示历史记录模态框
        alert('历史记录功能开发中...');
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      alert('获取历史记录失败');
    }
  };

  // 如果未打开或没有数据，不渲染模态框
  if (!isOpen) return null;

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

              {/* 停机原因统计饼图 */}
              <div className="reason-chart-section">
                <h3 className="reason-chart-title">停机原因统计</h3>
                <OutageReasonPieChart reasons={reasons} totalDays={noChargingDays} />
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

                      {/* 停机原因编辑区域 */}
                      <div className="reason-edit-section">
                        {editingDate === day.dateStr ? (
                          // 编辑状态
                          <div className="reason-edit-form">
                            <div className="form-row">
                              <div className="form-group">
                                <label className="form-label">停机原因</label>
                                <select
                                  className="reason-select"
                                  value={editForm.reasonType}
                                  onChange={(e) => setEditForm(prev => ({
                                    ...prev,
                                    reasonType: e.target.value
                                  }))}
                                  disabled={saving}
                                >
                                  {REASON_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group flex-grow">
                                <label className="form-label">备注</label>
                                <input
                                  type="text"
                                  className="reason-note-input"
                                  placeholder="输入备注..."
                                  value={editForm.reasonNote}
                                  onChange={(e) => setEditForm(prev => ({
                                    ...prev,
                                    reasonNote: e.target.value
                                  }))}
                                  disabled={saving}
                                />
                              </div>
                            </div>
                            <div className="form-actions">
                              <button
                                className="btn-icon btn-save"
                                onClick={() => handleSaveReason(day.dateStr)}
                                disabled={saving}
                                title="保存"
                              >
                                <Save size={16} />
                                <span>保存</span>
                              </button>
                              <button
                                className="btn-icon btn-cancel"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                title="取消"
                              >
                                <XCircle size={16} />
                                <span>取消</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 查看状态
                          <div className="reason-display">
                            <div className="reason-info">
                              <div className="reason-item">
                                <span className="reason-label">停机原因：</span>
                                <span className="reason-type-badge">
                                  {reasons[day.dateStr] ?
                                    REASON_TYPE_OPTIONS.find(opt => opt.value === reasons[day.dateStr].reasonType)?.label
                                    : '未填写'}
                                </span>
                              </div>
                              {reasons[day.dateStr]?.reasonNote && (
                                <div className="reason-item">
                                  <span className="reason-label">备注：</span>
                                  <span className="reason-note">
                                    {reasons[day.dateStr].reasonNote}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="reason-actions">
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleStartEdit(day)}
                                title="编辑停机原因"
                              >
                                <Edit2 size={16} />
                                <span>编辑</span>
                              </button>
                              {reasons[day.dateStr]?._id && (
                                <button
                                  className="btn-icon btn-history"
                                  onClick={() => handleViewHistory(reasons[day.dateStr]._id)}
                                  title="查看历史记录"
                                >
                                  <Clock size={16} />
                                  <span>历史</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
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
