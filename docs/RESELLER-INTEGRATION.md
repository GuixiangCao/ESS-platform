# App.jsx 集成指南

在 `/frontend/src/App.jsx` 中添加经销管理模块的路由

## 步骤1: 导入新页面组件

在 App.jsx 的导入部分添加以下代码:

```javascript
import ResellerManagement from './pages/ResellerManagement';
import DeviceManagement from './pages/DeviceManagement';
import StaffManagement from './pages/StaffManagement';
```

## 步骤2: 添加路由

在 `<Routes>` 组件内添加以下路由:

```javascript
{isAuthenticated && (
  <>
    {/* 现有路由 */}
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/boards" element={<BoardPage />} />
    
    {/* 新增经销管理模块路由 */}
    <Route path="/resellers" element={<ResellerManagement />} />
    <Route path="/devices" element={<DeviceManagement />} />
    <Route path="/staff" element={<StaffManagement />} />
  </>
)}
```

## 步骤3: (可选) 添加导航菜单

在导航栏或侧边栏中添加链接:

```jsx
<nav>
  <Link to="/resellers">经销商管理</Link>
  <Link to="/devices">设备管理</Link>
  <Link to="/staff">运维人员管理</Link>
</nav>
```

## 完整示例

```jsx
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ResellerManagement from './pages/ResellerManagement';
import DeviceManagement from './pages/DeviceManagement';
import StaffManagement from './pages/StaffManagement';
import { authService } from './services/api';
import { Moon, Sun } from 'lucide-react';

function App() {
  // ... 现有代码 ...

  return (
    <Router>
      <div className="app">
        {/* 主题切换按钮 */}
        <button className="theme-toggle" onClick={toggleDarkMode} title="切换主题">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
              <Route path="/register" element={<RegisterPage onRegister={handleRegister} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
              <Route path="/boards" element={<BoardPage />} />
              
              {/* 经销管理模块路由 */}
              <Route path="/resellers" element={<ResellerManagement />} />
              <Route path="/devices" element={<DeviceManagement />} />
              <Route path="/staff" element={<StaffManagement />} />
              
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

## 验证集成

### 1. 启动应用
```bash
cd frontend
npm run dev
```

### 2. 访问新页面
- http://localhost:3000/resellers - 经销商管理
- http://localhost:3000/devices - 设备管理
- http://localhost:3000/staff - 运维人员管理

### 3. 检查浏览器控制台
- 应该没有错误信息
- 样式应该正确加载
- 页面应该正确显示

## 常见问题排查

### 问题1: 页面无法访问 (404)
**解决:** 检查路由路径是否正确匹配

### 问题2: 样式未加载
**解决:** 检查CSS import是否在JSX文件顶部:
```javascript
import '../styles/ResellerManagement.css';
```

### 问题3: 权限提示
**解决:** 确保路由在 `isAuthenticated` 检查后

---

完成后，经销管理模块将完全集成到您的ESS Platform应用中！
