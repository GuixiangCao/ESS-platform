import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ResellerManagement from './pages/ResellerManagement';
import ResellerDetail from './pages/ResellerDetail';
import DeviceManagement from './pages/DeviceManagement';
import StaffManagement from './pages/StaffManagement';
import RevenueView from './pages/RevenueView';
import StationAnalysis from './pages/StationAnalysis';
import StationList from './pages/StationList';
import { authService } from './services/api';
import { Moon, Sun } from 'lucide-react';
import SidebarLayout from './components/SidebarLayout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then(res => {
          setUser(res.data);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* 主题切换按钮 - 所有页面都显示 */}
        <button className="theme-toggle" onClick={toggleDarkMode} title="切换主题">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage onRegister={handleLogin} />} 
          />
          {/* 需要侧边栏的页面全部包裹 */}
          <Route
            path="/"
            element={isAuthenticated ? (
              <SidebarLayout>
                <DashboardPage user={user} onLogout={handleLogout} />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/board/:id"
            element={isAuthenticated ? (
              <SidebarLayout>
                <BoardPage user={user} onLogout={handleLogout} />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/resellers"
            element={isAuthenticated ? (
              <SidebarLayout>
                <ResellerManagement />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/resellers/:id"
            element={isAuthenticated ? (
              <SidebarLayout>
                <ResellerDetail />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/devices"
            element={isAuthenticated ? (
              <SidebarLayout>
                <DeviceManagement />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/staff"
            element={isAuthenticated ? (
              <SidebarLayout>
                <StaffManagement />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/revenue/view"
            element={isAuthenticated ? (
              <SidebarLayout>
                <RevenueView />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/revenue/stations"
            element={isAuthenticated ? (
              <SidebarLayout>
                <StationList />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
          <Route
            path="/revenue/station-analysis"
            element={isAuthenticated ? (
              <SidebarLayout>
                <StationAnalysis />
              </SidebarLayout>
            ) : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
