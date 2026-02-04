import axios from 'axios';

const API_BASE_URL = '/api/soc';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 获取电站在指定日期的所有设备SOC数据
export const getStationSocData = async (stationId, date) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/station/${stationId}/daily`,
      {
        params: { date },
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取电站SOC数据失败:', error);
    throw error;
  }
};

// 获取单个设备在指定日期范围的SOC数据
export const getDeviceSocData = async (deviceId, startDate, endDate) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/device/${deviceId}`,
      {
        params: { startDate, endDate },
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取设备SOC数据失败:', error);
    throw error;
  }
};

// 获取设备在特定时刻的SOC值
export const getDeviceSocAtTime = async (deviceId, timestamp) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/device/${deviceId}/at-time`,
      {
        params: { timestamp },
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('获取设备特定时刻SOC失败:', error);
    throw error;
  }
};

// ========== SOC跳变修正相关API ==========

// 触发SOC跳变修正
export const triggerSocCorrection = async (stationId, startDate, endDate) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/correct-jumps`,
      { stationId, startDate, endDate },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('触发SOC跳变修正失败:', error);
    throw error;
  }
};

// 检查是否需要跳变修正
export const checkSocCorrectionStatus = async (stationId, startDate, endDate) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/check-correction/${stationId}`,
      {
        params: { startDate, endDate },
        headers: getAuthHeader()
      }
    );
    return response.data;
  } catch (error) {
    console.error('检查修正状态失败:', error);
    throw error;
  }
};

// 获取修正后的SOC数据（用于前端展示）
export const getCorrectedSocData = async (stationId, date) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/corrected/${stationId}/${date}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('获取修正后的SOC数据失败:', error);
    // 降级：如果修正数据接口失败，回退到原始接口
    console.warn('回退到原始SOC数据接口');
    return await getStationSocData(stationId, date);
  }
};

export default {
  getStationSocData,
  getDeviceSocData,
  getDeviceSocAtTime,
  triggerSocCorrection,
  checkSocCorrectionStatus,
  getCorrectedSocData
};
