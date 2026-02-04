import axios from 'axios';

const API_BASE_URL = '/api/station-gateways';

// 获取认证 token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// 获取所有电站网关列表
export const getAllStationGateways = async (params = {}) => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params,
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('获取电站网关列表失败:', error);
    throw error;
  }
};

// 根据电站 ID 查询网关信息
export const getStationByStationId = async (stationId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/station/${stationId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('查询电站网关失败:', error);
    throw error;
  }
};

// 根据网关 ID 查询电站信息
export const getStationByGatewayId = async (gatewayId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gateway/${gatewayId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('查询网关对应电站失败:', error);
    throw error;
  }
};

// 搜索电站
export const searchStations = async (keyword) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: { keyword },
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('搜索电站失败:', error);
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

// 创建或更新电站网关
export const createOrUpdateStation = async (stationData) => {
  try {
    const response = await axios.post(API_BASE_URL, stationData, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('创建/更新电站网关失败:', error);
    throw error;
  }
};

export default {
  getAllStationGateways,
  getStationByStationId,
  getStationByGatewayId,
  searchStations,
  getStatistics,
  createOrUpdateStation
};
