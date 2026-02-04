import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (username, email, password, firstName, lastName) =>
    api.post('/auth/register', { username, email, password, firstName, lastName }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getCurrentUser: () =>
    api.get('/auth/me'),
};

export const boardService = {
  createBoard: (data) =>
    api.post('/boards', data),
  getUserBoards: () =>
    api.get('/boards'),
  getBoardById: (id) =>
    api.get(`/boards/${id}`),
  updateBoard: (id, data) =>
    api.put(`/boards/${id}`, data),
  deleteBoard: (id) =>
    api.delete(`/boards/${id}`),
  addMember: (boardId, userId) =>
    api.post(`/boards/${boardId}/members`, { userId }),
};

export const taskService = {
  createTask: (data) =>
    api.post('/tasks', data),
  getTasksByList: (listId) =>
    api.get(`/tasks/list/${listId}`),
  updateTask: (id, data) =>
    api.put(`/tasks/${id}`, data),
  deleteTask: (id) =>
    api.delete(`/tasks/${id}`),
  moveTask: (id, data) =>
    api.patch(`/tasks/${id}/move`, data),
};

export const resellerService = {
  // 基础 CRUD
  createReseller: (data) =>
    api.post('/resellers', data),
  getAllResellers: (params) =>
    api.get('/resellers', { params }),
  getResellerById: (id) =>
    api.get(`/resellers/${id}`),
  updateReseller: (id, data) =>
    api.put(`/resellers/${id}`, data),
  deleteReseller: (id) =>
    api.delete(`/resellers/${id}`),

  // 层级管理
  getResellerTree: (parentId = null) =>
    api.get('/resellers/tree/hierarchy', { params: { parentId } }),
  getSubResellers: (id, includeDescendants = false) =>
    api.get(`/resellers/${id}/sub-resellers`, { params: { includeDescendants } }),
  getResellerAncestors: (id) =>
    api.get(`/resellers/${id}/ancestors`),
  moveReseller: (id, newParentId) =>
    api.put(`/resellers/${id}/move`, { newParentId }),

  // 设备分配
  assignDevices: (resellerId, deviceIds, userId) =>
    api.post(`/resellers/${resellerId}/assign-devices`, { deviceIds, userId }),
  unassignDevices: (resellerId, deviceIds) =>
    api.post(`/resellers/${resellerId}/unassign-devices`, { deviceIds }),
};

export const deviceService = {
  getAllDevices: (params) =>
    api.get('/devices', { params }),
  getDeviceById: (id) =>
    api.get(`/devices/${id}`),
  createDevice: (data) =>
    api.post('/devices', data),
  updateDevice: (id, data) =>
    api.put(`/devices/${id}`, data),
  deleteDevice: (id) =>
    api.delete(`/devices/${id}`),
  getResellerDevices: (resellerId) =>
    api.get(`/devices/reseller/${resellerId}/devices`),
};

export const staffService = {
  createStaff: (resellerId, data) =>
    api.post(`/resellers/${resellerId}/staff`, data),
  getResellerStaff: (resellerId, params) =>
    api.get(`/resellers/${resellerId}/staff`, { params }),
  getStaffById: (resellerId, staffId) =>
    api.get(`/resellers/${resellerId}/staff/${staffId}`),
  updateStaff: (resellerId, staffId, data) =>
    api.put(`/resellers/${resellerId}/staff/${staffId}`, data),
  updateStaffPermissions: (resellerId, staffId, permissions) =>
    api.put(`/resellers/${resellerId}/staff/${staffId}/permissions`, { permissions }),
  deleteStaff: (resellerId, staffId) =>
    api.delete(`/resellers/${resellerId}/staff/${staffId}`),
};

export default api;
