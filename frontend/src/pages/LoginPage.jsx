import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Lock, AlertCircle, Mail, Key } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      const res = await authService.login(formData.email, formData.password);
      onLogin(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="form form-card">
        <div className="form-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Lock size={32} style={{ color: 'var(--accent)' }} />
            ESS 平台
          </h1>
          <p className="form-subtitle">欢迎登录</p>
        </div>

        {error && (
          <div className="error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <strong>登录失败</strong>
            </div>
            <p>{error}</p>
            <button onClick={() => setError('')} className="close-btn" title="关闭" aria-label="关闭错误消息">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              autoFocus
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
              placeholder="输入你的密码"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={loading}
            style={{ width: '100%', cursor: 'pointer' }}
            aria-label="登录"
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="form-divider">
          <span>或</span>
        </div>

        <div className="form-footer">
          <p>还没有账户？</p>
          <Link to="/register" className="link-primary">
            立即注册 →
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
