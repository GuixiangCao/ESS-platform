import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boardService, taskService } from '../services/api';
import { ArrowLeft, Plus, Trash2, LogOut, FileText, Users, ClipboardList, Rocket, CheckCircle, Sparkles, StickyNote, Target } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function BoardPage({ user, onLogout }) {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const fetchBoard = async () => {
    try {
      const res = await boardService.getBoardById(id);
      setBoard(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching board:', err);
      navigate('/');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskService.createTask({
        ...newTask,
        boardId: id,
        listId: board.lists?.[0]?._id
      });
      setNewTask({ title: '', description: '', priority: 'medium' });
      setShowNewTask(false);
      fetchBoard();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!board) {
    return <div className="loading">看板未找到</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="header">
          <div className="header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary"
                title="返回看板列表"
                aria-label="返回看板列表"
                style={{ cursor: 'pointer' }}
              >
                <ArrowLeft size={18} />
              </button>
              <h1 style={{ margin: 0 }}>{board.title}</h1>
            </div>
            <div className="user-info">
              <span className="hide-on-mobile">{user?.username || '用户'}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                title="退出登录"
                aria-label="退出登录"
                style={{ cursor: 'pointer' }}
              >
                <LogOut size={18} />
                <span className="hide-on-mobile">退出登录</span>
              </button>
            </div>
          </div>
        </div>

        <div className="container">
        {board.description && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} />
            {board.description}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <strong style={{ color: 'var(--text-primary)' }}>看板成员:</strong>
            <span style={{ marginLeft: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
              {board.members?.length || 0} 人
            </span>
          </div>
          <button onClick={() => setShowNewTask(true)} className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Plus size={18} />
            <span className="hide-on-mobile">添加任务</span>
          </button>
        </div>

        <div className="kanban-board">
          <div className="kanban-list">
            <div className="kanban-list-header">
              <h3 className="kanban-list-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} />
                待办
              </h3>
            </div>
            <div className="kanban-tasks">
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-lg) var(--space-sm)', margin: 0 }}>
                暂无任务
              </p>
            </div>
          </div>

          <div className="kanban-list">
            <div className="kanban-list-header">
              <h3 className="kanban-list-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Rocket size={18} />
                进行中
              </h3>
            </div>
            <div className="kanban-tasks">
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-lg) var(--space-sm)', margin: 0 }}>
                暂无任务
              </p>
            </div>
          </div>

          <div className="kanban-list">
            <div className="kanban-list-header">
              <h3 className="kanban-list-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                已完成
              </h3>
            </div>
            <div className="kanban-tasks">
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-lg) var(--space-sm)', margin: 0 }}>
                暂无任务
              </p>
            </div>
          </div>
        </div>

        {showNewTask && (
          <>
            <div className="drawer-overlay" onClick={() => setShowNewTask(false)} />
            <div className="drawer-right open" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} />
                  添加新任务
                </h2>
                <button onClick={() => setShowNewTask(false)} className="close-btn" title="关闭" aria-label="关闭">
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="drawer-form" style={{ padding: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label htmlFor="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StickyNote size={16} />
                    任务名称 *
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    placeholder="输入任务标题"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="task-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} />
                    描述
                  </label>
                  <textarea
                    id="task-desc"
                    placeholder="输入任务描述（可选）"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="task-priority" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={16} />
                    优先级
                  </label>
                  <select
                    id="task-priority"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="low">🟢 低</option>
                    <option value="medium">🟡 中</option>
                    <option value="high">🔴 高</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' }}>
                  <button type="button" onClick={() => setShowNewTask(false)} className="btn btn-secondary">
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    添加任务
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
