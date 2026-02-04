import axios from 'axios';

const API_BASE_URL = '/api/alarms';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 计算电站告警总损失
export const calculateStationLosses = async (stationId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/losses`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('计算电站告警损失失败:', error);
    throw error;
  }
};

// 按设备类型统计告警损失
export const getLossByDevice = async (stationId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/losses/by-device`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('按设备统计告警损失失败:', error);
    throw error;
  }
};

// 计算单个告警的损失
export const calculateSingleAlarmLoss = async (alarmId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/${alarmId}/loss`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('计算单个告警损失失败:', error);
    throw error;
  }
};

// 获取电站告警统计
export const getAlarmStats = async (stationId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/stats`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取告警统计失败:', error);
    throw error;
  }
};

// 获取电站节假日损失
export const getHolidayLosses = async (stationId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/holiday-losses`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取节假日损失失败:', error);
    throw error;
  }
};

// 获取电站非计划性停机损失（工作日无充放电损失）
export const getUnplannedOutageLosses = async (stationId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/unplanned-outage-losses`,
      {
        params,
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取非计划性停机损失失败:', error);
    throw error;
  }
};

export default {
  calculateStationLosses,
  getLossByDevice,
  calculateSingleAlarmLoss,
  getAlarmStats,
  getHolidayLosses,
  getUnplannedOutageLosses
};
