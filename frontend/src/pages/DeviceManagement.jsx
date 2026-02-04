import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Zap } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import '../styles/DeviceManagement.css';

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'other',
    description: '',
    specs: {
      model: '',
      manufacturer: '',
      power: '',
      voltage: '',
      capacity: ''
    },
    quantity: 1
  });

  useEffect(() => {
    fetchDevices();
    fetchResellers();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const mockData = [
        {
          _id: '1',
          name: '48V 5kW 混合逆变器',
          code: 'DEV001',
          type: 'inverter',
          status: 'available',
          specs: { model: 'HY5K-48', manufacturer: '华阳', power: '5kW', voltage: '48V' },
          quantity: 10,
          assignedReseller: null,
          createdAt: '2024-01-01'
        },
        {
          _id: '2',
          name: '400Ah 锂电池',
          code: 'DEV002',
          type: 'battery',
          status: 'assigned',
          specs: { model: 'LB400', manufacturer: '宁德时代', capacity: '400Ah' },
          quantity: 5,
          assignedReseller: { _id: '1', name: '华南地区经销商' },
          createdAt: '2024-01-02'
        }
      ];
      setDevices(mockData);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResellers = async () => {
    try {
      const mockResellers = [
        { _id: '1', name: '华南地区经销商', code: 'RS001' },
        { _id: '2', name: '华东地区经销商', code: 'RS002' }
      ];
      setResellers(mockResellers);
    } catch (error) {
      console.error('Error fetching resellers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('specs.')) {
      const specKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        specs: { ...prev.specs, [specKey]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingDevice) {
      console.log('Updating device:', editingDevice._id, formData);
    } else {
      console.log('Creating device:', formData);
      const newDevice = {
        _id: Date.now().toString(),
        ...formData,
        status: 'available',
        assignedReseller: null,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setDevices(prev => [newDevice, ...prev]);
    }
    resetForm();
  };

  const handleAssignDevice = (deviceId, resellerId) => {
    setDevices(prev => prev.map(d =>
      d._id === deviceId
        ? { ...d, assignedReseller: resellers.find(r => r._id === resellerId), status: 'assigned' }
        : d
    ));
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      code: device.code,
      type: device.type,
      description: device.description || '',
      specs: device.specs || {},
      quantity: device.quantity
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('确定要删除该设备吗？')) {
      setDevices(prev => prev.filter(d => d._id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'other',
      description: '',
      specs: {},
      quantity: 1
    });
    setEditingDevice(null);
    setShowModal(false);
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || device.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const typeLabels = {
    inverter: '逆变器',
    battery: '电池',
    charger: '充电器',
    monitor: '监控器',
    other: '其他'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1 }} className="device-management">
      <div className="device-header">
        <div className="device-title">
          <h1>设备管理</h1>
          <p>管理所有设备并分配给经销商</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          新增设备
        </button>
      </div>

      <div className="device-controls">
        <div className="device-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="搜索设备名称或编码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="device-filter">
          <Filter size={20} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">所有类型</option>
            <option value="inverter">逆变器</option>
            <option value="battery">电池</option>
            <option value="charger">充电器</option>
            <option value="monitor">监控器</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="device-table">
          <table>
            <thead>
              <tr>
                <th>设备名称</th>
                <th>编码</th>
                <th>类型</th>
                <th>规格</th>
                <th>数量</th>
                <th>状态</th>
                <th>分配经销商</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(device => (
                <tr key={device._id}>
                  <td className="device-name">
                    <Zap size={18} />
                    {device.name}
                  </td>
                  <td>{device.code}</td>
                  <td>
                    <span className="badge">{typeLabels[device.type]}</span>
                  </td>
                  <td className="specs">
                    {device.specs.model && `型号: ${device.specs.model}`}
                    {device.specs.power && ` | 功率: ${device.specs.power}`}
                  </td>
                  <td>{device.quantity}</td>
                  <td>
                    <span className={`status status-${device.status}`}>
                      {device.status === 'available' ? '可用' : '已分配'}
                    </span>
                  </td>
                  <td>
                    {device.assignedReseller ? (
                      <span className="reseller-name">
                        {device.assignedReseller.name}
                      </span>
                    ) : (
                      <select
                        className="reseller-select"
                        onChange={(e) => handleAssignDevice(device._id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="">分配经销商...</option>
                        {resellers.map(r => (
                          <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => handleEdit(device)}>
                      <Edit size={18} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(device._id)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <>
          <div className="drawer-overlay" onClick={resetForm} />
          <div className="drawer-right open" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDevice ? '编辑设备' : '新增设备'}</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="drawer-form">
              <div className="form-row">
                <div className="form-group">
                  <label>设备名称 *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入设备名称"
                  />
                </div>
                <div className="form-group">
                  <label>设备编码 *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="如: DEV001"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>设备类型 *</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="inverter">逆变器</option>
                    <option value="battery">电池</option>
                    <option value="charger">充电器</option>
                    <option value="monitor">监控器</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>数量</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>规格 - 型号</label>
                <input
                  type="text"
                  name="specs.model"
                  value={formData.specs.model || ''}
                  onChange={handleInputChange}
                  placeholder="如: HY5K-48"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>规格 - 制造商</label>
                  <input
                    type="text"
                    name="specs.manufacturer"
                    value={formData.specs.manufacturer || ''}
                    onChange={handleInputChange}
                    placeholder="如: 华阳"
                  />
                </div>
                <div className="form-group">
                  <label>规格 - 功率</label>
                  <input
                    type="text"
                    name="specs.power"
                    value={formData.specs.power || ''}
                    onChange={handleInputChange}
                    placeholder="如: 5kW"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingDevice ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default DeviceManagement;
