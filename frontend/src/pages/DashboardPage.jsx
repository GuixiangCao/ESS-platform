import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardService } from '../services/api';
import { Trash2, Plus, LogOut, BarChart3, Users, StickyNote } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function DashboardPage({ user, onLogout }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    backgroundColor: '#3b82f6'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setError('');
      const res = await boardService.getUserBoards();
      setBoards(res.data);
    } catch (err) {
      setError('加载看板失败，请重试');
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('看板名称不能为空');
      return;
    }
    try {
      setError('');
      setIsCreating(true);
      await boardService.createBoard(formData);
      setFormData({ title: '', description: '', backgroundColor: '#3b82f6' });
      setShowModal(false);
      fetchBoards();
    } catch (err) {
      setError('创建看板失败，请重试');
      console.error('Error creating board:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId, boardTitle) => {
    if (window.confirm(`确定要删除"${boardTitle}"吗？此操作无法撤销。`)) {
      try {
        setError('');
        await boardService.deleteBoard(boardId);
        fetchBoards();
      } catch (err) {
        setError('删除看板失败，请重试');
        console.error('Error deleting board:', err);
      }
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <div style={{ flex: 1 }}>
      <div className="header">
        <div className="header-content">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={28} style={{ color: 'var(--accent)' }} />
            ESS 平台
          </h1>
          <div className="user-info">
            <span className="hide-on-mobile">欢迎, {user?.username || '用户'}</span>
            <div className="user-avatar" title={user?.username}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>

            <button onClick={handleLogout} className="btn btn-secondary" title="退出登录" aria-label="退出登录">
              <LogOut size={18} />
              <span className="hide-on-mobile">退出登录</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>我的看板</h2>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            <span className="hide-on-mobile">创建看板</span>
          </button>
        </div>

        {error && (
          <div className="error">
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>加载看板中...</p>
          </div>
        ) : boards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', color: 'var(--text-tertiary)' }}>
              <StickyNote size={64} strokeWidth={1.5} />
            </div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>暂无看板</h3>
            <p>点击上方"创建看板"按钮开始你的第一个项目</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map(board => (
              <div key={board._id} className="board-card">
                <div className="board-card-header">
                  <h2>{board.title}</h2>
                </div>
                {board.description && (
                  <div className="board-card-description">{board.description}</div>
                )}
                <div className="board-card-members" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} />
                  <span>成员: {board.members.length}</span>
                </div>
                <div className="board-card-actions">
                  <button
                    onClick={() => navigate(`/board/${board._id}`)}
                    className="btn btn-primary btn-small"
                    style={{ cursor: 'pointer' }}
                  >
                    打开
                  </button>
                  <button
                    onClick={() => handleDeleteBoard(board._id, board.title)}
                    className="btn btn-danger btn-small"
                    title="删除看板"
                    aria-label="删除看板"
                    style={{ cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <>
            <div className="drawer-overlay" onClick={() => setShowModal(false)} />
            <div className="drawer-right open" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>创建新看板</h2>
                <button onClick={() => setShowModal(false)} className="close-btn" title="关闭">
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateBoard} className="drawer-form">
                <div className="form-group">
                  <label>看板名称 *</label>
                  <input
                    type="text"
                    placeholder="输入看板名称"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-group">
                  <label>描述</label>
                  <textarea
                    placeholder="输入看板描述（可选）"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>背景颜色</label>
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  />
                </div>
                <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                    disabled={isCreating}
                    style={{ cursor: 'pointer' }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreating}
                    style={{ cursor: 'pointer' }}
                  >
                    {isCreating ? (
                      <>
                        <div className="spinner-small" />
                        <span>创建中...</span>
                      </>
                    ) : (
                      '创建看板'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
