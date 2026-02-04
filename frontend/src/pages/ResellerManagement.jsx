import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Package, Search, ChevronRight, ChevronDown, FolderTree, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { resellerService } from '../services/api';
import '../styles/ResellerManagement.css';

const ResellerManagement = () => {
  const navigate = useNavigate();
  const [resellerTree, setResellerTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReseller, setEditingReseller] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'grid'
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    parentResellerId: null
  });

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    setLoading(true);
    try {
      // 使用树形结构API
      const response = await resellerService.getResellerTree();
      setResellerTree(response.data.data || []);
    } catch (error) {
      console.error('Error fetching resellers:', error);
      // 使用模拟数据作为后备
      const mockData = [
        {
          _id: '1',
          name: '华南地区总经销',
          code: 'RS001',
          contactPerson: '张三',
          contactPhone: '13800000001',
          contactEmail: 'zhangsan@example.com',
          status: 'active',
          deviceCount: 15,
          staffCount: 5,
          subResellerCount: 2,
          hierarchyLevel: 0,
          createdAt: '2024-01-01',
          children: [
            {
              _id: '3',
              name: '深圳分销商',
              code: 'RS003',
              contactPerson: '王五',
              contactPhone: '13800000003',
              contactEmail: 'wangwu@example.com',
              status: 'active',
              deviceCount: 8,
              staffCount: 3,
              subResellerCount: 1,
              hierarchyLevel: 1,
              parentResellerId: '1',
              createdAt: '2024-01-03',
              children: [
                {
                  _id: '5',
                  name: '南山区代理',
                  code: 'RS005',
                  contactPerson: '赵六',
                  contactPhone: '13800000005',
                  contactEmail: 'zhaoliu@example.com',
                  status: 'active',
                  deviceCount: 3,
                  staffCount: 1,
                  subResellerCount: 0,
                  hierarchyLevel: 2,
                  parentResellerId: '3',
                  createdAt: '2024-01-05',
                  children: []
                }
              ]
            },
            {
              _id: '4',
              name: '广州分销商',
              code: 'RS004',
              contactPerson: '刘七',
              contactPhone: '13800000004',
              contactEmail: 'liuqi@example.com',
              status: 'active',
              deviceCount: 5,
              staffCount: 2,
              subResellerCount: 0,
              hierarchyLevel: 1,
              parentResellerId: '1',
              createdAt: '2024-01-04',
              children: []
            }
          ]
        },
        {
          _id: '2',
          name: '华东地区总经销',
          code: 'RS002',
          contactPerson: '李四',
          contactPhone: '13800000002',
          contactEmail: 'lisi@example.com',
          status: 'active',
          deviceCount: 12,
          staffCount: 4,
          subResellerCount: 0,
          hierarchyLevel: 0,
          createdAt: '2024-01-02',
          children: []
        }
      ];
      setResellerTree(mockData);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReseller) {
        await resellerService.updateReseller(editingReseller._id, formData);
      } else {
        await resellerService.createReseller({
          ...formData,
          parentResellerId: selectedParent?._id || null
        });
      }
      await fetchResellers();
      resetForm();
    } catch (error) {
      console.error('Error saving reseller:', error);
      // 模拟数据处理 - 当API失败时，仍然更新本地状态
      if (editingReseller) {
        console.log('Updating reseller:', editingReseller._id, formData);
        // 更新树中的经销商
        const updateTree = (nodes) => {
          return nodes.map(node => {
            if (node._id === editingReseller._id) {
              return { ...node, ...formData };
            }
            if (node.children && node.children.length > 0) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };
        setResellerTree(updateTree(resellerTree));
      } else {
        console.log('Creating reseller:', formData);
        // 创建新经销商
        const newReseller = {
          _id: Date.now().toString(),
          ...formData,
          status: 'active',
          deviceCount: 0,
          staffCount: 0,
          subResellerCount: 0,
          hierarchyLevel: selectedParent ? selectedParent.hierarchyLevel + 1 : 0,
          parentResellerId: selectedParent?._id || null,
          createdAt: new Date().toISOString().split('T')[0],
          children: []
        };

        if (selectedParent) {
          // 添加到父级的子节点
          const addToParent = (nodes) => {
            return nodes.map(node => {
              if (node._id === selectedParent._id) {
                return {
                  ...node,
                  children: [...(node.children || []), newReseller],
                  subResellerCount: (node.subResellerCount || 0) + 1
                };
              }
              if (node.children && node.children.length > 0) {
                return { ...node, children: addToParent(node.children) };
              }
              return node;
            });
          };
          setResellerTree(addToParent(resellerTree));
          // 自动展开父节点
          setExpandedNodes(prev => new Set([...prev, selectedParent._id]));
        } else {
          // 添加为顶级经销商
          setResellerTree([...resellerTree, newReseller]);
        }
      }
      resetForm();
    }
  };

  const handleEdit = (reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      code: reseller.code,
      description: reseller.description || '',
      contactPerson: reseller.contactPerson,
      contactPhone: reseller.contactPhone,
      contactEmail: reseller.contactEmail,
      address: reseller.address || '',
      parentResellerId: reseller.parentResellerId || null
    });
    setShowModal(true);
  };

  const handleDelete = async (id, hasChildren) => {
    if (hasChildren) {
      alert('该经销商存在下级经销商，无法删除');
      return;
    }

    if (window.confirm('确定要删除该经销商吗？')) {
      try {
        await resellerService.deleteReseller(id);
        await fetchResellers();
      } catch (error) {
        console.error('Error deleting reseller:', error);
        // 模拟数据处理 - 从树中删除
        const deleteFromTree = (nodes) => {
          return nodes.filter(node => {
            if (node._id === id) {
              return false;
            }
            if (node.children && node.children.length > 0) {
              node.children = deleteFromTree(node.children);
            }
            return true;
          });
        };
        setResellerTree(deleteFromTree(resellerTree));
      }
    }
  };

  const handleAddSubReseller = (parent) => {
    setSelectedParent(parent);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      parentResellerId: null
    });
    setEditingReseller(null);
    setSelectedParent(null);
    setShowModal(false);
  };

  const renderTreeNode = (reseller, level = 0) => {
    const hasChildren = reseller.children && reseller.children.length > 0;
    const isExpanded = expandedNodes.has(reseller._id);
    const indent = level * 24;

    return (
      <div key={reseller._id} className="tree-node-wrapper">
        <div className="tree-node" style={{ paddingLeft: `${indent}px` }}>
          <div className="tree-node-content">
            <button
              className="tree-toggle"
              onClick={() => toggleNode(reseller._id)}
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              ) : (
                <span style={{ width: '16px', display: 'inline-block' }}></span>
              )}
            </button>

            <div className="tree-node-info">
              <div className="tree-node-main">
                <h4>{reseller.name}</h4>
                <span className="code">代码: {reseller.code}</span>
                <span className={`status status-${reseller.status}`}>
                  {reseller.status === 'active' ? '活跃' : '非活跃'}
                </span>
              </div>

              <div className="tree-node-details">
                <span>联系人: {reseller.contactPerson}</span>
                <span>电话: {reseller.contactPhone}</span>
                <span className="stat-item">
                  <Package size={14} /> {reseller.deviceCount} 设备
                </span>
                <span className="stat-item">
                  <Users size={14} /> {reseller.staffCount} 员工
                </span>
                {hasChildren && (
                  <span className="stat-item">
                    <FolderTree size={14} /> {reseller.subResellerCount} 下级
                  </span>
                )}
              </div>
            </div>

            <div className="tree-node-actions">
              <button
                className="btn-icon btn-sm"
                onClick={() => navigate(`/resellers/${reseller._id}`)}
                title="查看详情"
              >
                <Eye size={16} />
              </button>
              <button
                className="btn-icon btn-sm"
                onClick={() => handleAddSubReseller(reseller)}
                title="添加下级经销商"
              >
                <Plus size={16} />
              </button>
              <button
                className="btn-icon btn-sm"
                onClick={() => handleEdit(reseller)}
                title="编辑"
              >
                <Edit size={16} />
              </button>
              <button
                className="btn-icon btn-sm btn-danger"
                onClick={() => handleDelete(reseller._id, hasChildren)}
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="tree-node-children">
            {reseller.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const flattenTree = (tree) => {
    const result = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return result;
  };

  const filteredResellers = flattenTree(resellerTree).filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGridView = () => (
    <div className="reseller-grid">
      {filteredResellers.map(reseller => (
        <div key={reseller._id} className="reseller-card">
          <div className="reseller-card-header">
            <div>
              <h3>{reseller.name}</h3>
              <p className="code">代码: {reseller.code}</p>
              {reseller.hierarchyLevel > 0 && (
                <p className="hierarchy-badge">层级 {reseller.hierarchyLevel}</p>
              )}
            </div>
            <span className={`status status-${reseller.status}`}>
              {reseller.status === 'active' ? '活跃' : '非活跃'}
            </span>
          </div>

          <div className="reseller-card-info">
            <p><strong>联系人:</strong> {reseller.contactPerson}</p>
            <p><strong>电话:</strong> {reseller.contactPhone}</p>
            <p><strong>邮箱:</strong> {reseller.contactEmail}</p>
          </div>

          <div className="reseller-card-stats">
            <div className="stat">
              <Package size={18} />
              <div>
                <p className="label">设备数</p>
                <p className="value">{reseller.deviceCount}</p>
              </div>
            </div>
            <div className="stat">
              <Users size={18} />
              <div>
                <p className="label">员工数</p>
                <p className="value">{reseller.staffCount}</p>
              </div>
            </div>
            {reseller.subResellerCount > 0 && (
              <div className="stat">
                <FolderTree size={18} />
                <div>
                  <p className="label">下级数</p>
                  <p className="value">{reseller.subResellerCount}</p>
                </div>
              </div>
            )}
          </div>

          <div className="reseller-card-actions">
            <button className="btn-icon" onClick={() => navigate(`/resellers/${reseller._id}`)} title="查看详情">
              <Eye size={18} />
            </button>
            <button className="btn-icon" onClick={() => handleAddSubReseller(reseller)}>
              <Plus size={18} />
            </button>
            <button className="btn-icon" onClick={() => handleEdit(reseller)}>
              <Edit size={18} />
            </button>
            <button
              className="btn-icon btn-danger"
              onClick={() => handleDelete(reseller._id, reseller.subResellerCount > 0)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1 }} className="reseller-management">
        <div className="reseller-header">
          <div className="reseller-title">
            <h1>经销商管理</h1>
            <p>管理经销商层级结构、设备分配和权限</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            新建顶级经销商
          </button>
        </div>

        <div className="reseller-controls">
          <div className="reseller-search">
            <Search size={20} />
            <input
              type="text"
              placeholder="搜索经销商名称或编码..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="view-toggle">
            <button
              className={`btn-toggle ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
            >
              <FolderTree size={16} />
              树形视图
            </button>
            <button
              className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Package size={16} />
              卡片视图
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            {viewMode === 'tree' ? (
              <div className="reseller-tree">
                {resellerTree.length > 0 ? (
                  resellerTree.map(reseller => renderTreeNode(reseller))
                ) : (
                  <div className="empty-state">
                    <FolderTree size={48} />
                    <p>暂无经销商</p>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                      <Plus size={20} />
                      创建第一个经销商
                    </button>
                  </div>
                )}
              </div>
            ) : (
              renderGridView()
            )}
          </>
        )}

        {showModal && (
          <>
            <div className="drawer-overlay" onClick={resetForm} />
            <div className="drawer-right open" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingReseller
                    ? '编辑经销商'
                    : selectedParent
                    ? `添加 ${selectedParent.name} 的下级经销商`
                    : '新建经销商'}
                </h2>
                <button className="btn-close" onClick={resetForm}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="drawer-form">
                {selectedParent && (
                  <div className="form-info">
                    <p>
                      <strong>上级经销商:</strong> {selectedParent.name} ({selectedParent.code})
                    </p>
                    <p>
                      <strong>层级:</strong> {selectedParent.hierarchyLevel + 1}
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label>经销商名称 *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入经销商名称"
                  />
                </div>

                <div className="form-group">
                  <label>经销商代码 *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="如: RS001"
                  />
                </div>

                <div className="form-group">
                  <label>联系人 *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入联系人名称"
                  />
                </div>

                <div className="form-group">
                  <label>联系电话 *</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入联系电话"
                  />
                </div>

                <div className="form-group">
                  <label>联系邮箱 *</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入联系邮箱"
                  />
                </div>

                <div className="form-group">
                  <label>地址</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="请输入地址"
                  />
                </div>

                <div className="form-group">
                  <label>描述</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="请输入经销商描述"
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    取消
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingReseller ? '更新' : '创建'}
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

export default ResellerManagement;
