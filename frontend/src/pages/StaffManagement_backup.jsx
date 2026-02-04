import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Lock, Eye, EyeOff, Shield, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import '../styles/StaffManagement.css';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedForPermissions, setSelectedForPermissions] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    role: 'technician'
  });

  const [permissions, setPermissions] = useState({
    canViewDevices: true,
    canEditDevices: false,
    canManageStaff: false,
    canViewReports: true,
    canManagePermissions: false
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const mockData = [
        {
          _id: '1',
          username: 'zhang_tech',
          email: 'zhang@example.com',
          firstName: '张',
          lastName: '三',
          phone: '13800000001',
          role: 'technician',
          status: 'active',
          permissions: {
            canViewDevices: true,
            canEditDevices: false,
            canManageStaff: false,
            canViewReports: true,
            canManagePermissions: false
          },
          createdAt: '2024-01-01'
        },
        {
          _id: '2',
          username: 'li_supervisor',
          email: 'li@example.com',
          firstName: '李',
          lastName: '四',
          phone: '13800000002',
          role: 'supervisor',
          status: 'active',
          permissions: {
            canViewDevices: true,
            canEditDevices: true,
            canManageStaff: false,
            canViewReports: true,
            canManagePermissions: false
          },
          createdAt: '2024-01-02'
        },
        {
          _id: '3',
          username: 'wang_manager',
          email: 'wang@example.com',
          firstName: '王',
          lastName: '五',
          phone: '13800000003',
          role: 'manager',
          status: 'active',
          permissions: {
            canViewDevices: true,
            canEditDevices: true,
            canManageStaff: true,
            canViewReports: true,
            canManagePermissions: true
          },
          createdAt: '2024-01-03'
        }
      ];
      setStaff(mockData);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少需要3个字符';
    }

    if (!formData.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '邮箱格式不正确';
    }

    if (!formData.firstName.trim()) errors.firstName = '姓不能为空';
    if (!formData.lastName.trim()) errors.lastName = '名不能为空';

    if (!formData.phone.trim()) {
      errors.phone = '电话不能为空';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入正确的手机号码';
    }

    if (!editingStaff && !formData.password) {
      errors.password = '密码不能为空';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = '密码至少需要6个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Calculate password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handlePermissionChange = (e) => {
    const { name, checked } = e.target;
    setPermissions(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({ ...prev, role }));
    const defaultPermissions = {
      technician: {
        canViewDevices: true,
        canEditDevices: false,
        canManageStaff: false,
        canViewReports: true,
        canManagePermissions: false
      },
      supervisor: {
        canViewDevices: true,
        canEditDevices: true,
        canManageStaff: false,
        canViewReports: true,
        canManagePermissions: false
      },
      manager: {
        canViewDevices: true,
        canEditDevices: true,
        canManageStaff: true,
        canViewReports: true,
        canManagePermissions: true
      }
    };
    setPermissions(defaultPermissions[role]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingStaff) {
      console.log('Updating staff:', editingStaff._id, formData);
      setStaff(prev => prev.map(s =>
        s._id === editingStaff._id
          ? { ...s, ...formData, permissions }
          : s
      ));
    } else {
      console.log('Creating staff:', formData);
      const newStaff = {
        _id: Date.now().toString(),
        ...formData,
        permissions,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setStaff(prev => [newStaff, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      username: staffMember.username,
      email: staffMember.email,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      phone: staffMember.phone,
      password: '',
      role: staffMember.role
    });
    setPermissions(staffMember.permissions);
    setShowModal(true);
  };

  const handleEditPermissions = (staffMember) => {
    setSelectedForPermissions(staffMember);
    setPermissions(staffMember.permissions);
    setShowPermissionModal(true);
  };

  const handlePermissionSubmit = (e) => {
    e.preventDefault();
    if (selectedForPermissions) {
      setStaff(prev => prev.map(s =>
        s._id === selectedForPermissions._id
          ? { ...s, permissions }
          : s
      ));
    }
    setShowPermissionModal(false);
    setSelectedForPermissions(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('确定要删除该员工吗？')) {
      setStaff(prev => prev.filter(s => s._id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      role: 'technician'
    });
    setPermissions({
      canViewDevices: true,
      canEditDevices: false,
      canManageStaff: false,
      canViewReports: true,
      canManagePermissions: false
    });
    setEditingStaff(null);
    setShowModal(false);
    setPasswordStrength(0);
    setShowPassword(false);
    setFormErrors({});
  };

  const filteredStaff = staff.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels = {
    technician: '技术员',
    supervisor: '主管',
    manager: '经理'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1 }} className="staff-management">
      <div className="staff-header">
        <div className="staff-title">
          <h1>运维人员管理</h1>
          <p>管理经销商的内部运维人员和权限</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          添加员工
        </button>
      </div>

      <div className="staff-search">
        <Search size={20} />
        <input
          type="text"
          placeholder="搜索员工名称或邮箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="staff-table">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>用户名</th>
                <th>角色</th>
                <th>电话</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(member => (
                <tr key={member._id}>
                  <td className="staff-name">
                    <div className="avatar"></div>
                    {member.firstName} {member.lastName}
                  </td>
                  <td>{member.email}</td>
                  <td>{member.username}</td>
                  <td>
                    <span className={`role role-${member.role}`}>
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td>{member.phone}</td>
                  <td>
                    <span className={`status status-${member.status}`}>
                      {member.status === 'active' ? '活跃' : '非活跃'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => handleEdit(member)}>
                      <Edit size={18} />
                    </button>
                    <button className="btn-icon btn-warning" onClick={() => handleEditPermissions(member)}>
                      <Lock size={18} />
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(member._id)}>
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
              <h2>{editingStaff ? '编辑员工' : '添加员工'}</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="drawer-form">
              <div className="form-group">
                <label>角色 *</label>
                <div className="role-selector">
                  {['technician', 'supervisor', 'manager'].map(role => (
                    <label key={role} className="role-option">
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={() => handleRoleChange(role)}
                      />
                      <span className={`label label-${role}`}>{roleLabels[role]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>用户名 *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入用户名"
                  />
                </div>
                <div className="form-group">
                  <label>邮箱 *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>姓</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="请输入姓"
                  />
                </div>
                <div className="form-group">
                  <label>名</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="请输入名"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>电话</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="请输入电话"
                  />
                </div>
                <div className="form-group">
                  <label>密码 {!editingStaff && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingStaff}
                    placeholder="请输入密码"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>权限配置</label>
                <div className="permissions-grid">
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      name="canViewDevices"
                      checked={permissions.canViewDevices}
                      onChange={handlePermissionChange}
                    />
                    <span>查看设备</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      name="canEditDevices"
                      checked={permissions.canEditDevices}
                      onChange={handlePermissionChange}
                    />
                    <span>编辑设备</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      name="canManageStaff"
                      checked={permissions.canManageStaff}
                      onChange={handlePermissionChange}
                    />
                    <span>管理员工</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      name="canViewReports"
                      checked={permissions.canViewReports}
                      onChange={handlePermissionChange}
                    />
                    <span>查看报告</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      name="canManagePermissions"
                      checked={permissions.canManagePermissions}
                      onChange={handlePermissionChange}
                    />
                    <span>管理权限</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingStaff ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {showPermissionModal && selectedForPermissions && (
        <>
          <div className="drawer-overlay" onClick={() => setShowPermissionModal(false)} />
          <div className="drawer-right open" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>编辑 {selectedForPermissions.firstName} {selectedForPermissions.lastName} 的权限</h2>
              <button className="btn-close" onClick={() => setShowPermissionModal(false)}>×</button>
            </div>

            <form onSubmit={handlePermissionSubmit} className="drawer-form">
              <div className="permissions-list">
                <label className="permission-item">
                  <input
                    type="checkbox"
                    name="canViewDevices"
                    checked={permissions.canViewDevices}
                    onChange={handlePermissionChange}
                  />
                  <div className="permission-info">
                    <p className="permission-name">查看设备</p>
                    <p className="permission-desc">可以查看分配给经销商的设备信息</p>
                  </div>
                </label>

                <label className="permission-item">
                  <input
                    type="checkbox"
                    name="canEditDevices"
                    checked={permissions.canEditDevices}
                    onChange={handlePermissionChange}
                  />
                  <div className="permission-info">
                    <p className="permission-name">编辑设备</p>
                    <p className="permission-desc">可以编辑设备信息和状态</p>
                  </div>
                </label>

                <label className="permission-item">
                  <input
                    type="checkbox"
                    name="canManageStaff"
                    checked={permissions.canManageStaff}
                    onChange={handlePermissionChange}
                  />
                  <div className="permission-info">
                    <p className="permission-name">管理员工</p>
                    <p className="permission-desc">可以添加、编辑或删除员工账户</p>
                  </div>
                </label>

                <label className="permission-item">
                  <input
                    type="checkbox"
                    name="canViewReports"
                    checked={permissions.canViewReports}
                    onChange={handlePermissionChange}
                  />
                  <div className="permission-info">
                    <p className="permission-name">查看报告</p>
                    <p className="permission-desc">可以查看运营数据和报告</p>
                  </div>
                </label>

                <label className="permission-item">
                  <input
                    type="checkbox"
                    name="canManagePermissions"
                    checked={permissions.canManagePermissions}
                    onChange={handlePermissionChange}
                  />
                  <div className="permission-info">
                    <p className="permission-name">管理权限</p>
                    <p className="permission-desc">可以分配和管理其他员工的权限</p>
                  </div>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPermissionModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  保存权限
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

export default StaffManagement;
