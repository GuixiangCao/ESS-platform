import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Sparkles, AlertCircle, User, Mail, Key, UserCircle } from 'lucide-react';

export default function RegisterPage({ onRegister }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authService.register(
        formData.username,
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      onRegister(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="form form-card">
        <div className="form-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Sparkles size={32} style={{ color: 'var(--accent)' }} />
            ESS 平台
          </h1>
          <p className="form-subtitle">创建账户开始使用</p>
        </div>

        {error && (
          <div className="error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <strong>注册失败</strong>
            </div>
            <p>{error}</p>
            <button onClick={() => setError('')} className="close-btn" title="关闭" aria-label="关闭错误消息">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} />
              用户名
            </label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="选择你的用户名"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} />
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="输入你的邮箱"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} />
              密码
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="设置你的密码"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCircle size={16} />
              名字
            </label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="你的名字（可选）"
              value={formData.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCircle size={16} />
              姓氏
            </label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder="你的姓氏（可选）"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={loading}
            style={{ width: '100%', cursor: 'pointer' }}
            aria-label="创建账户"
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                注册中...
              </>
            ) : (
              '创建账户'
            )}
          </button>
        </form>

        <div className="form-divider">
          <span>或</span>
        </div>

        <div className="form-footer">
          <p>已有账户？</p>
          <Link to="/login" className="link-primary">
            立即登录 →
          </Link>
        </div>
      </div>

      <div className="auth-bg-decoration">
        <div className="decoration-circle decoration-circle-1"></div>
        <div className="decoration-circle decoration-circle-2"></div>
        <div className="decoration-circle decoration-circle-3"></div>
      </div>
    </div>
  );
}
