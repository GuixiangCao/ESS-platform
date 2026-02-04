import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin,
  Package, Users, FolderTree, Calendar, AlertCircle,
  Edit, Trash2, Activity, TrendingUp
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { resellerService, deviceService, staffService } from '../services/api';
import '../styles/ResellerDetail.css';

const ResellerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reseller, setReseller] = useState(null);
  const [parentReseller, setParentReseller] = useState(null);
  const [devices, setDevices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [ancestors, setAncestors] = useState([]);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    fetchResellerDetails();
  }, [id]);

  const fetchResellerDetails = async () => {
    setLoading(true);
    try {
      // 获取经销商基本信息
      const resellerRes = await resellerService.getResellerById(id);
      const resellerData = resellerRes.data.data;
      setReseller(resellerData);

      // 获取父级经销商详细信息
      if (resellerData.parentResellerId) {
        try {
          const parentRes = await resellerService.getResellerById(resellerData.parentResellerId);
          setParentReseller(parentRes.data.data);
        } catch (err) {
          console.log('Failed to fetch parent reseller');
        }
      }

      // 获取祖先路径
      try {
        const ancestorsRes = await resellerService.getResellerAncestors(id);
        setAncestors(ancestorsRes.data.data || []);
      } catch (err) {
        console.log('Failed to fetch ancestors');
      }

      // 获取子经销商
      try {
        const childrenRes = await resellerService.getSubResellers(id);
        setChildren(childrenRes.data.data || []);
      } catch (err) {
        console.log('Failed to fetch children');
      }

      // 获取设备列表
      try {
        const devicesRes = await deviceService.getResellerDevices(id);
        setDevices(devicesRes.data.data || []);
      } catch (err) {
        console.log('Failed to fetch devices');
        setDevices([]);
      }

      // 获取员工列表
      try {
        const staffRes = await staffService.getResellerStaff(id);
        setStaff(staffRes.data.data || []);
      } catch (err) {
        console.log('Failed to fetch staff');
        setStaff([]);
      }

      // 计算统计数据
      const onlineDevices = devices.filter(d => d.status === 'online').length;
      const offlineDevices = devices.filter(d => d.status === 'offline').length;
      setStatistics({
        totalDevices: devices.length,
        onlineDevices,
        offlineDevices,
        totalStaff: staff.length,
        subResellers: children.length
      });

    } catch (error) {
      console.error('Error fetching reseller details:', error);
      // 使用模拟数据
      setReseller({
        _id: id,
        name: '深圳分销商',
        code: 'RS003',
        status: 'active',
        contactPerson: '王五',
        contactPhone: '13800000003',
        contactEmail: 'wangwu@example.com',
        address: '深圳市南山区科技园南区',
        description: '负责深圳地区的设备销售和维护',
        hierarchyLevel: 1,
        parentResellerId: 'parent001',
        deviceCount: 8,
        staffCount: 3,
        subResellerCount: 1,
        createdAt: '2024-01-03'
      });

      // 模拟父级经销商数据
      setParentReseller({
        _id: 'parent001',
        name: '华南地区总经销',
        code: 'RS001',
        status: 'active',
        contactPerson: '张三',
        contactPhone: '13800000001',
        contactEmail: 'zhang@example.com',
        address: '深圳市南山区科技园',
        hierarchyLevel: 0,
        deviceCount: 15,
        staffCount: 5,
        subResellerCount: 2
      });

      setDevices([
        { _id: '1', serialNumber: 'SN001', model: 'Model-A', status: 'online' },
        { _id: '2', serialNumber: 'SN002', model: 'Model-B', status: 'offline' }
      ]);

      setStaff([
        { _id: '1', username: 'zhang_tech', firstName: '张', lastName: '三', role: 'technician' },
        { _id: '2', username: 'li_super', firstName: '李', lastName: '四', role: 'supervisor' }
      ]);

      setStatistics({
        totalDevices: 15,
        onlineDevices: 12,
        offlineDevices: 3,
        totalStaff: 5,
        subResellers: 2
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/resellers?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`确定删除【${reseller.name}】吗？`)) {
      return;
    }

    try {
      await resellerService.deleteReseller(id);
      navigate('/resellers');
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#22c55e',
      inactive: '#6b7280',
      suspended: '#f59e0b'
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '活跃',
      inactive: '非活跃',
      suspended: '暂停'
    };
    return labels[status] || '未知';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1 }} className="reseller-detail">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1 }} className="reseller-detail">
          <div className="error-state">
            <AlertCircle size={48} />
            <p>经销商不存在</p>
            <button className="btn-primary" onClick={() => navigate('/resellers')}>
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1 }} className="reseller-detail">
        {/* 面包屑导航 */}
        <div className="breadcrumb">
          <button onClick={() => navigate('/')}>首页</button>
          <span>/</span>
          <button onClick={() => navigate('/resellers')}>经销商管理</button>
          {ancestors.map(ancestor => (
            <React.Fragment key={ancestor._id}>
              <span>/</span>
              <button onClick={() => navigate(`/resellers/${ancestor._id}`)}>
                {ancestor.name}
              </button>
            </React.Fragment>
          ))}
          <span>/</span>
          <span className="current">{reseller.name}</span>
        </div>

        {/* 页头 */}
        <div className="detail-header">
          <button className="btn-back" onClick={() => navigate('/resellers')}>
            <ArrowLeft size={20} />
            返回
          </button>
          <div className="header-info">
            <div className="header-left">
              <h1>{reseller.name}</h1>
              <span className="code">{reseller.code}</span>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(reseller.status) }}
              >
                {getStatusLabel(reseller.status)}
              </span>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={handleEdit}>
                <Edit size={18} />
                编辑
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={18} />
                删除
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#3b82f61a', color: '#3b82f6' }}>
              <Package size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">设备总数</p>
              <p className="stat-value">{statistics.totalDevices || 0}</p>
              <p className="stat-detail">
                在线: {statistics.onlineDevices || 0} | 离线: {statistics.offlineDevices || 0}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#8b5cf61a', color: '#8b5cf6' }}>
              <Users size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">员工总数</p>
              <p className="stat-value">{statistics.totalStaff || 0}</p>
              <p className="stat-detail">运维人员</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#10b9811a', color: '#10b981' }}>
              <FolderTree size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">下级经销商</p>
              <p className="stat-value">{statistics.subResellers || 0}</p>
              <p className="stat-detail">层级 {reseller.hierarchyLevel}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f59e0b1a', color: '#f59e0b' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">设备在线率</p>
              <p className="stat-value">
                {statistics.totalDevices > 0
                  ? Math.round((statistics.onlineDevices / statistics.totalDevices) * 100)
                  : 0}%
              </p>
              <p className="stat-detail">实时数据</p>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {/* 基本信息 */}
          <div className="detail-card">
            <div className="card-header">
              <Building2 size={20} />
              <h2>基本信息</h2>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>经销商名称</label>
                <span>{reseller.name}</span>
              </div>
              <div className="info-row">
                <label>经销商编码</label>
                <span>{reseller.code}</span>
              </div>
              <div className="info-row">
                <label>状态</label>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(reseller.status) }}
                >
                  {getStatusLabel(reseller.status)}
                </span>
              </div>
              <div className="info-row">
                <label>层级</label>
                <span>Level {reseller.hierarchyLevel}</span>
              </div>
              <div className="info-row">
                <label>创建时间</label>
                <span>{new Date(reseller.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
              {reseller.description && (
                <div className="info-row">
                  <label>描述</label>
                  <span>{reseller.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* 联系信息 */}
          <div className="detail-card">
            <div className="card-header">
              <User size={20} />
              <h2>联系信息</h2>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label><User size={16} /> 联系人</label>
                <span>{reseller.contactPerson}</span>
              </div>
              <div className="info-row">
                <label><Phone size={16} /> 联系电话</label>
                <span>{reseller.contactPhone}</span>
              </div>
              <div className="info-row">
                <label><Mail size={16} /> 邮箱</label>
                <span>{reseller.contactEmail}</span>
              </div>
              <div className="info-row">
                <label><MapPin size={16} /> 地址</label>
                <span>{reseller.address || '未填写'}</span>
              </div>
            </div>
          </div>

          {/* 上级组织信息 */}
          {parentReseller && reseller.hierarchyLevel > 0 && (
            <div className="detail-card full-width parent-organization">
              <div className="card-header">
                <Building2 size={20} />
                <h2>上级组织</h2>
                <button
                  className="btn-link"
                  onClick={() => navigate(`/resellers/${parentReseller._id}`)}
                >
                  查看详情 →
                </button>
              </div>
              <div className="card-content">
                <div className="parent-org-grid">
                  <div className="parent-org-main">
                    <div className="parent-org-header">
                      <h3>{parentReseller.name}</h3>
                      <span className="parent-org-code">{parentReseller.code}</span>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(parentReseller.status) }}
                      >
                        {getStatusLabel(parentReseller.status)}
                      </span>
                    </div>
                    <div className="parent-org-info">
                      <div className="info-item">
                        <User size={14} />
                        <span>{parentReseller.contactPerson}</span>
                      </div>
                      <div className="info-item">
                        <Phone size={14} />
                        <span>{parentReseller.contactPhone}</span>
                      </div>
                      <div className="info-item">
                        <Mail size={14} />
                        <span>{parentReseller.contactEmail}</span>
                      </div>
                      {parentReseller.address && (
                        <div className="info-item">
                          <MapPin size={14} />
                          <span>{parentReseller.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="parent-org-stats">
                    <div className="mini-stat">
                      <Package size={18} />
                      <div>
                        <p className="mini-stat-value">{parentReseller.deviceCount || 0}</p>
                        <p className="mini-stat-label">设备</p>
                      </div>
                    </div>
                    <div className="mini-stat">
                      <Users size={18} />
                      <div>
                        <p className="mini-stat-value">{parentReseller.staffCount || 0}</p>
                        <p className="mini-stat-label">员工</p>
                      </div>
                    </div>
                    <div className="mini-stat">
                      <FolderTree size={18} />
                      <div>
                        <p className="mini-stat-value">{parentReseller.subResellerCount || 0}</p>
                        <p className="mini-stat-label">下级</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 层级关系 */}
          <div className="detail-card full-width">
            <div className="card-header">
              <FolderTree size={20} />
              <h2>层级关系</h2>
            </div>
            <div className="card-content">
              {ancestors.length > 0 && (
                <div className="hierarchy-section">
                  <label>上级经销商</label>
                  <div className="hierarchy-list">
                    {ancestors.map((ancestor, index) => (
                      <div key={ancestor._id} className="hierarchy-item">
                        <span className="hierarchy-level">Level {ancestor.hierarchyLevel}</span>
                        <button
                          className="hierarchy-link"
                          onClick={() => navigate(`/resellers/${ancestor._id}`)}
                        >
                          {ancestor.name} ({ancestor.code})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div className="hierarchy-section">
                  <label>下级经销商 ({children.length}个)</label>
                  <div className="hierarchy-list">
                    {children.map(child => (
                      <div key={child._id} className="hierarchy-item">
                        <span className="hierarchy-level">Level {child.hierarchyLevel}</span>
                        <button
                          className="hierarchy-link"
                          onClick={() => navigate(`/resellers/${child._id}`)}
                        >
                          {child.name} ({child.code})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ancestors.length === 0 && children.length === 0 && (
                <p className="empty-text">无层级关系</p>
              )}
            </div>
          </div>

          {/* 设备列表 */}
          <div className="detail-card full-width">
            <div className="card-header">
              <Package size={20} />
              <h2>设备管理 ({devices.length}台)</h2>
              <button className="btn-primary btn-sm">分配设备</button>
            </div>
            <div className="card-content">
              {devices.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>序列号</th>
                        <th>型号</th>
                        <th>状态</th>
                        <th>分配时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.slice(0, 5).map(device => (
                        <tr key={device._id}>
                          <td>{device.serialNumber}</td>
                          <td>{device.model}</td>
                          <td>
                            <span className={`status-badge status-${device.status}`}>
                              {device.status === 'online' ? '在线' : '离线'}
                            </span>
                          </td>
                          <td>{device.assignedAt ? new Date(device.assignedAt).toLocaleDateString('zh-CN') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {devices.length > 5 && (
                    <button className="btn-text" onClick={() => navigate(`/devices?reseller=${id}`)}>
                      查看全部 {devices.length} 台设备 →
                    </button>
                  )}
                </div>
              ) : (
                <p className="empty-text">暂无设备</p>
              )}
            </div>
          </div>

          {/* 员工列表 */}
          <div className="detail-card full-width">
            <div className="card-header">
              <Users size={20} />
              <h2>员工管理 ({staff.length}人)</h2>
              <button className="btn-primary btn-sm" onClick={() => navigate('/staff')}>
                管理员工
              </button>
            </div>
            <div className="card-content">
              {staff.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>姓名</th>
                        <th>用户名</th>
                        <th>角色</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.slice(0, 5).map(member => (
                        <tr key={member._id}>
                          <td>{member.firstName} {member.lastName}</td>
                          <td>{member.username}</td>
                          <td>
                            <span className={`role-badge role-${member.role}`}>
                              {member.role === 'technician' ? '技术员' :
                               member.role === 'supervisor' ? '主管' : '经理'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge status-${member.status}`}>
                              {member.status === 'active' ? '活跃' : '非活跃'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {staff.length > 5 && (
                    <button className="btn-text" onClick={() => navigate('/staff')}>
                      查看全部 {staff.length} 位员工 →
                    </button>
                  )}
                </div>
              ) : (
                <p className="empty-text">暂无员工</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResellerDetail;
