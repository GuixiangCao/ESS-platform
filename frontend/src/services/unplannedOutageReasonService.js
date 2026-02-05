import api from './api';

export const unplannedOutageReasonService = {
  // 批量获取停机原因
  batchGetReasons: (stationId, dates) =>
    api.post(`/unplanned-outage-reasons/station/${stationId}/batch`, { dates }),

  // 保存/更新停机原因
  saveReason: (stationId, date, data) =>
    api.put(`/unplanned-outage-reasons/station/${stationId}/date/${date}`, data),

  // 获取历史记录
  getHistory: (reasonId) =>
    api.get(`/unplanned-outage-reasons/${reasonId}/history`),
};
