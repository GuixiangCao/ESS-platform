# 前端开发指南

## 项目设置

### 1. 依赖安装

```bash
npm install
```

### 2. 环境配置

后端 API 的代理已在 `vite.config.js` 中配置：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
}
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 运行

## 项目结构

### src/components/
可复用的 React 组件

### src/pages/
页面级别的组件

- **LoginPage.jsx** - 登录页面
- **RegisterPage.jsx** - 注册页面
- **DashboardPage.jsx** - 仪表板（看板列表）
- **BoardPage.jsx** - 看板详情页面

### src/services/
API 服务层

- **api.js** - Axios 配置和 API 调用方法

### src/styles/
样式文件

- **App.css** - 全局样式

## 核心功能

### 身份认证流程

1. 用户在 LoginPage 或 RegisterPage 输入凭证
2. 调用 `authService.login()` 或 `authService.register()`
3. 后端返回 JWT token
4. Token 存储在 localStorage
5. 后续请求自动添加 token 到 Authorization header

### 看板管理

1. 用户在 DashboardPage 查看所有看板
2. 点击"创建看板"打开模态框
3. 提交表单调用 `boardService.createBoard()`
4. 新看板添加到列表

### 任务管理

1. 用户在 BoardPage 查看看板内的任务
2. 点击"添加任务"打开新任务对话框
3. 提交表单调用 `taskService.createTask()`
4. 任务显示在相应的列表中

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新组件文件
2. 在 `App.jsx` 的 Router 中添加路由
3. 导入必要的服务和样式

示例：
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewPage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 初始化逻辑
  }, []);

  return (
    <div className="container">
      {/* 页面内容 */}
    </div>
  );
}
```

### 添加新服务

在 `src/services/api.js` 中添加新的 API 方法：

```javascript
export const newService = {
  getItem: (id) =>
    api.get(`/endpoint/${id}`),
  createItem: (data) =>
    api.post('/endpoint', data),
  updateItem: (id, data) =>
    api.put(`/endpoint/${id}`, data),
  deleteItem: (id) =>
    api.delete(`/endpoint/${id}`),
};
```

### 添加样式

在 `src/App.css` 中添加新样式类或修改现有样式

## 常用组件模式

### 表单组件
```jsx
const [formData, setFormData] = useState({
  field1: '',
  field2: ''
});

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // API 调用
  } catch (error) {
    // 错误处理
  }
};
```

### 数据获取
```jsx
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await someService.getData();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  fetchData();
}, [dependencies]);
```

### 模态框
```jsx
{showModal && (
  <div className="modal">
    <div className="modal-content">
      <div className="modal-header">
        <h2>标题</h2>
        <button onClick={() => setShowModal(false)} className="close-btn">×</button>
      </div>
      {/* 内容 */}
    </div>
  </div>
)}
```

## 调试技巧

### 查看 API 请求和响应

使用浏览器开发者工具的 Network 标签

### 检查 Token

在浏览器控制台运行：
```javascript
localStorage.getItem('token')
```

### React DevTools

安装 React DevTools 浏览器扩展来检查组件状态和 props

## 构建和部署

### 构建生产版本
```bash
npm run build
```

构建输出将在 `dist/` 目录中

### 预览构建
```bash
npm run preview
```

## 常见问题

### API 请求失败
- 确保后端服务运行在 `http://localhost:5000`
- 检查浏览器开发工具的 Network 和 Console 标签
- 验证请求 URL 和方法是否正确

### Token 过期
- Token 默认过期时间为 7 天
- 用户需要重新登录以获取新 token
- 可在后端 `.env` 的 JWT_EXPIRE 配置过期时间

### 页面刷新后未保存状态
- 组件状态存储在内存中
- 需要从后端重新获取数据
- 考虑使用 localStorage 或 sessionStorage 持久化重要数据

### 样式不加载
- 确保 CSS 文件导入正确
- 检查 CSS 类名是否拼写正确
- 清除浏览器缓存并重新刷新

## 性能优化

- 使用 React.lazy() 进行代码分割
- 避免不必要的重新渲染
- 优化图片大小
- 使用生产构建而非开发版本

---

更多问题请参考主 README.md 或 提交 Issue
