import axios from 'axios';

const API_BASE_URL = '/api/charging-strategies';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 获取所有充放电策略
export const getAllStrategies = async (params = {}) => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('获取充放电策略列表失败:', error);
    throw error;
  }
};

// 获取每日充放电统计
export const getDailyChargingStats = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/daily-stats`, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('获取每日充放电统计失败:', error);
    throw error;
  }
};

// 根据电站 ID 获取策略
export const getByStationId = async (stationId, params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/station/${stationId}`, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('查询电站充放电策略失败:', error);
    throw error;
  }
};

// 根据网关 ID 获取策略
export const getByGatewayId = async (gatewayId, params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gateway/${gatewayId}`, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('查询网关充放电策略失败:', error);
    throw error;
  }
};

// 获取统计信息
export const getStatistics = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/statistics`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw error;
  }
};

export default {
  getAllStrategies,
  getDailyChargingStats,
  getByStationId,
  getByGatewayId,
  getStatistics
};
