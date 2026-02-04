# ESS Platform - Material Design System 完整指南

## 📋 目录

1. [设计系统概述](#设计系统概述)
2. [颜色调色板](#颜色调色板)
3. [排版系统](#排版系统)
4. [间距与尺寸](#间距与尺寸)
5. [组件库](#组件库)
6. [暗黑模式](#暗黑模式)
7. [响应式设计](#响应式设计)
8. [最佳实践](#最佳实践)

---

## 🎨 设计系统概述

本项目采用 **Google Material Design 3** 规范，实现了：

✅ 完整的CSS变量系统（40+ 自定义属性）  
✅ 自动暗黑模式检测与切换  
✅ 移动端优先的响应式设计  
✅ 平滑的过渡与动画效果  
✅ 完整的无障碍访问支持  

### 核心特性

| 特性 | 说明 |
|------|------|
| **颜色系统** | 从`:root`和`html.dark`自动切换 |
| **排版** | 基于系统字体栈的现代字体设置 |
| **间距** | 4px到48px的一致间距标度 |
| **圆角** | 4px到9999px的完整圆角系统 |
| **阴影** | 5级深度的Material阴影 |
| **动画** | 3种过渡速度的平滑动画 |

---

## 🎨 颜色调色板

### 亮色模式

#### 主色系
```
--primary:       #1f2937  (深灰色 - 主文本)
--primary-light: #374151  (浅灰色)
--primary-lighter: #4b5563 (更浅灰色)
```

#### 强调色
```
--accent:       #3b82f6  (蓝色 - 交互元素)
--accent-hover: #2563eb  (深蓝色 - 悬停)
--accent-light: #dbeafe  (浅蓝色 - 背景)
--accent-dark:  #1e40af  (深蓝色)
```

#### 语义色
```
--success:      #10b981  (绿色 - 成功)
--success-light: #d1fae5 (浅绿色)
--warning:      #f59e0b  (琥珀色 - 警告)
--warning-light: #fef3c7 (浅琥珀色)
--error:        #ef4444  (红色 - 错误)
--error-light:  #fee2e2  (浅红色)
--error-dark:   #7f1d1d  (深红色)
```

#### 表面与文本
```
--background:      #f9fafb  (页面背景)
--surface:         #ffffff  (卡片/组件背景)
--surface-variant: #f3f4f6  (次要表面)
--surface-dim:     #e5e7eb  (暗表面)
--text-primary:    #1f2937  (主要文本)
--text-secondary:  #6b7280  (次要文本)
--text-tertiary:   #9ca3af  (辅助文本)
--text-inverse:    #ffffff  (反色文本)
```

### 暗黑模式

暗黑模式自动反演所有颜色。使用CSS变量确保自动支持：

```css
html.dark {
  --background: #111827;
  --surface: #1f2937;
  --text-primary: #f3f4f6;
  /* ... 所有颜色自动切换 ... */
}
```

### 使用颜色

✅ **正确做法** - 使用CSS变量：
```jsx
<div style={{ color: 'var(--text-primary)', 
             backgroundColor: 'var(--surface)' }}>
```

❌ **错误做法** - 硬编码颜色：
```jsx
<div style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>
```

---

## 📝 排版系统

### 字体栈
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 
               'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

### 标题尺寸

| 标签 | 大小 | 用途 |
|------|------|------|
| h1 | 2rem (32px) | 页面标题 |
| h2 | 1.5rem (24px) | 分组标题 |
| h3 | 1.25rem (20px) | 子标题 |
| h4 | 1.125rem (18px) | 组件标题 |
| h5 | 1rem (16px) | 标签文本 |
| h6 | 0.875rem (14px) | 小写标签 |

### 字重

```
Regular:  400
Medium:   500
Semibold: 600
Bold:     700
```

### 行高
```
标题:     1.2
文本:     1.6
```

---

## 📏 间距与尺寸

### 间距标度

所有间距使用4px的倍数系统：

```css
--space-xs:   4px
--space-sm:   8px
--space-md:   16px  (默认)
--space-lg:   24px
--space-xl:   32px
--space-2xl:  48px
```

### 实际应用

```jsx
/* 间距 */
<div style={{ padding: 'var(--space-md)' }}>
<div style={{ marginBottom: 'var(--space-lg)' }}>

/* 间隙 */
<div style={{ gap: 'var(--space-sm)' }}>

/* 组合使用 */
<div style={{ 
  padding: 'var(--space-lg)',
  gap: 'var(--space-md)',
  marginBottom: 'var(--space-xl)'
}}>
```

### 圆角系统

```css
--radius-xs:   4px    (小输入框、标签)
--radius-sm:   8px    (按钮、小卡片)
--radius-md:   12px   (表单字段、标准卡片)
--radius-lg:   16px   (大卡片、模态框)
--radius-xl:   24px   (超大元素)
--radius-full: 9999px (完全圆形)
```

### 阴影系统

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05)       (微妙)
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)        (小)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)        (中等)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)      (大)
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1)      (超大)
```

**使用场景：**
- xs: 微妙的悬停效果
- sm: 卡片、小组件
- md: 标准卡片、按钮
- lg: 下拉菜单、浮起状态
- xl: 模态框、全屏覆盖

---

## 🧩 组件库

### 按钮组件

#### 主按钮 (Primary)
```jsx
<button className="btn btn-primary">操作</button>
```
**特性：**
- 背景：强调色
- 文本：白色
- 悬停：更深的强调色 + 提升阴影
- 按下：缩小缩放
- 禁用：50% 透明度

#### 次按钮 (Secondary)
```jsx
<button className="btn btn-secondary">取消</button>
```
**特性：**
- 背景：表面变体
- 边框：轮廓颜色
- 文本：主要文本

#### 危险按钮 (Danger)
```jsx
<button className="btn btn-danger">删除</button>
```
**特性：**
- 背景：错误色
- 文本：白色
- 悬停：更深的错误色

#### 按钮尺寸

```jsx
<button className="btn btn-small">小</button>      {/* 紧凑 */}
<button className="btn btn-primary">标准</button>   {/* 默认 */}
<button className="btn btn-large">大</button>      {/* 48px高 */}
```

### 表单组件

#### 表单容器
```jsx
<form className="form form-card">
  <div className="form-header">
    <h1>表单标题</h1>
    <p className="form-subtitle">副标题</p>
  </div>
  
  {/* 表单内容 */}
</form>
```

#### 表单组
```jsx
<div className="form-group">
  <label htmlFor="email">📧 邮箱</label>
  <input id="email" type="email" placeholder="输入邮箱" />
</div>
```

**输入框状态：**
- 默认：标准外观
- 聚焦：强调色边框 + 3px发光
- 禁用：50% 透明度
- 错误：红色边框（带`.error`类）

#### 表单分隔线
```jsx
<div className="form-divider">
  <span>或</span>
</div>
```

#### 表单页脚
```jsx
<div className="form-footer">
  <p>已有账户？</p>
  <Link to="/login" className="link-primary">
    立即登录 →
  </Link>
</div>
```

### 卡片组件

#### 看板卡片 (Board Card)
```jsx
<div className="board-card">
  <div className="board-card-header">
    <h2>看板标题</h2>
  </div>
  <div className="board-card-description">描述</div>
  <div className="board-card-members">👥 成员: 3</div>
  <div className="board-card-actions">
    <button className="btn btn-primary btn-small">打开</button>
    <button className="btn btn-danger btn-small">删除</button>
  </div>
</div>
```

#### 任务卡片 (Task Card)
```jsx
<div className="task-card">
  <div className="task-card-title">任务标题</div>
  <div className="task-card-description">任务描述</div>
  <span className="task-priority high">高优先级</span>
</div>
```

**优先级样式：**
```
.task-priority.high    - 红色背景
.task-priority.medium  - 琥珀色背景
.task-priority.low     - 绿色背景
```

### 模态框 (Modal)

```jsx
<div className="modal" onClick={() => setOpen(false)}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    <div className="modal-header">
      <h2>模态框标题</h2>
      <button className="close-btn">✕</button>
    </div>
    
    {/* 模态框内容 */}
    
    <form style={{ padding: 'var(--space-lg)' }}>
      {/* 表单字段 */}
    </form>
  </div>
</div>
```

**特性：**
- 背景：半透明黑色 + 模糊
- 动画：向上滑动 + 淡入
- 外部点击关闭
- 滚动溢出内容

### 看板布局 (Kanban)

```jsx
<div className="kanban-board">
  <div className="kanban-list">
    <div className="kanban-list-header">
      <h3>📋 待办</h3>
    </div>
    <div className="kanban-tasks">
      {/* 任务卡片 */}
    </div>
  </div>
</div>
```

### 反馈组件

#### 成功消息
```jsx
<div className="success">
  <strong>✅ 成功</strong>
  <p>操作成功完成</p>
</div>
```

#### 错误消息
```jsx
<div className="error">
  <strong>❌ 错误</strong>
  <p>发生了一个错误</p>
  <button className="close-btn">×</button>
</div>
```

#### 警告消息
```jsx
<div className="warning">
  <strong>⚠️ 警告</strong>
  <p>请注意此操作</p>
</div>
```

#### 加载状态
```jsx
<div className="loading-container">
  <div className="spinner"></div>
  <p>加载中...</p>
</div>
```

---

## 🌙 暗黑模式

### 工作原理

1. **检测系统偏好**
```javascript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

2. **localStorage 持久化**
```javascript
localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
```

3. **应用类名**
```javascript
if (isDarkMode) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}
```

4. **CSS 自动切换**
```css
:root { --background: #f9fafb; }
html.dark { --background: #111827; }
```

### 主题切换按钮

```jsx
<button className="theme-toggle" onClick={toggleDarkMode}>
  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
</button>
```

**位置：** 固定在右下角（56px 圆形FAB）  
**行为：** 悬停时放大 + 提升阴影  
**响应式：** 移动端为 48px

---

## 📱 响应式设计

### 断点系统

```css
/* 桌面: 无媒体查询（默认） */
/* 平板: 768px 及以下 */
@media (max-width: 768px) { }

/* 手机: 480px 及以下 */
@media (max-width: 480px) { }
```

### 响应式工具类

#### 隐藏元素

```jsx
<span className="hide-on-mobile">仅桌面显示</span>
<span className="hide-on-tablet">仅非平板显示</span>
```

#### 网格布局

```jsx
<div className="boards-grid">
  {/* 
    桌面: 多列自动填充
    平板: 较少列
    手机: 单列
  */}
</div>
```

**响应式断点：**
```css
/* 桌面 */
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));

/* 平板 */
@media (max-width: 768px) {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

/* 手机 */
@media (max-width: 480px) {
  grid-template-columns: 1fr;
}
```

### 移动优先方法

1. **首先为移动设计**：基础样式适配 480px
2. **平板增强**：在 768px 媒体查询中改进
3. **桌面优化**：添加大屏幕特定功能

### 响应式组件示例

#### 响应式标题

```jsx
<div className="header">
  <div className="header-content">
    <h1>ESS 平台</h1>    {/* 桌面: 32px, 手机: 24px */}
    <div className="user-info">
      <span className="hide-on-mobile">欢迎, 用户</span>
      <div className="user-avatar">D</div>
      <button className="btn btn-secondary">
        <LogOut size={18} />
        <span className="hide-on-mobile">退出登录</span>
      </button>
    </div>
  </div>
</div>
```

#### 响应式表单

```jsx
<form className="form form-card">
  {/* 
    桌面: 最大500px, 居中
    平板: 全宽, 有边距
    手机: 全宽, 最小边距
  */}
</form>
```

---

## ✨ 最佳实践

### 1. 使用CSS变量

✅ **正确：**
```jsx
<div style={{ 
  color: 'var(--text-primary)',
  backgroundColor: 'var(--surface)',
  padding: 'var(--space-md)'
}}>
```

❌ **错误：**
```jsx
<div style={{ 
  color: '#1f2937',
  backgroundColor: '#ffffff',
  padding: '16px'
}}>
```

### 2. 间距一致性

✅ **正确：**
```jsx
<div style={{ 
  padding: 'var(--space-lg)',
  gap: 'var(--space-md)',
  marginBottom: 'var(--space-xl)'
}}>
```

❌ **错误：**
```jsx
<div style={{ 
  padding: '24px',
  gap: '13px',
  marginBottom: '30px'
}}>
```

### 3. 利用现有类

✅ **正确：**
```jsx
<div className="flex-between">
  <h2>标题</h2>
  <button>操作</button>
</div>
```

❌ **错误：**
```jsx
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
```

### 4. 暗黑模式支持

✅ **正确 - 所有颜色均支持暗黑模式：**
```jsx
<p style={{ color: 'var(--text-secondary)' }}>文本</p>
```

❌ **错误 - 硬编码颜色在暗黑模式下不可见：**
```jsx
<p style={{ color: '#6b7280' }}>文本</p>
```

### 5. 响应式布局

✅ **正确 - 移动优先：**
```jsx
<div className="boards-grid">
  {/* 基础: 单列
     768px+: 2列
     1024px+: 3列 */}
</div>
```

❌ **错误 - 硬编码列数：**
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
```

### 6. 标签关联

✅ **正确 - 可访问性：**
```jsx
<label htmlFor="email">邮箱</label>
<input id="email" type="email" />
```

❌ **错误 - 不可访问：**
```jsx
<label>邮箱</label>
<input type="email" />
```

### 7. 焦点状态

✅ **正确 - 内置焦点样式：**
```jsx
<input type="text" />  {/* 焦点时: 强调色边框 + 发光 */}
```

### 8. 图标尺寸

✅ **正确 - 响应式图标：**
```jsx
<Plus size={18} className="hide-on-mobile" />
```

---

## 🔧 文件结构

```
frontend/src/
├── App.jsx              # 主应用 + 暗黑模式切换
├── App.css              # 完整样式系统 (1100+ 行)
│                        # 包含:
│                        # - CSS 变量系统
│                        # - 组件样式
│                        # - 响应式设计
│                        # - 动画库
│                        # - 暗黑模式
│
├── pages/
│   ├── LoginPage.jsx    # 登录页 (Material Design)
│   ├── RegisterPage.jsx # 注册页
│   ├── DashboardPage.jsx# 看板列表
│   └── BoardPage.jsx    # 看板详情 (Kanban)
│
├── services/
│   └── api.js           # API 端点
│
└── index.css            # 全局重置样式
```

---

## 🚀 快速开始

### 1. 创建一个组件

```jsx
import { Plus } from 'lucide-react';

export default function MyComponent() {
  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{ marginBottom: 'var(--space-md)' }}>标题</h2>
      <p style={{ color: 'var(--text-secondary)' }}>描述文本</p>
      <button className="btn btn-primary">
        <Plus size={18} />
        操作
      </button>
    </div>
  );
}
```

### 2. 添加响应式

```jsx
<div style={{ 
  padding: 'var(--space-lg)',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 'var(--space-lg)'
}}>
  {/* 内容自动适应屏幕 */}
</div>
```

### 3. 支持暗黑模式

```jsx
<div style={{
  backgroundColor: 'var(--surface)',
  color: 'var(--text-primary)',
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)'
}}>
  {/* 自动支持亮色和暗黑模式 */}
</div>
```

---

## 📚 常用组件模板

### 登录表单

```jsx
<div className="auth-container">
  <div className="form form-card">
    <div className="form-header">
      <h1>🔐 标题</h1>
      <p className="form-subtitle">副标题</p>
    </div>
    <form>
      <div className="form-group">
        <label htmlFor="email">邮箱</label>
        <input id="email" type="email" />
      </div>
      <button className="btn btn-primary btn-large">登录</button>
    </form>
  </div>
</div>
```

### 看板网格

```jsx
<div className="boards-grid">
  {boards.map(board => (
    <div key={board._id} className="board-card">
      <div className="board-card-header">
        <h2>{board.title}</h2>
      </div>
      <div className="board-card-actions">
        <button className="btn btn-primary btn-small">打开</button>
      </div>
    </div>
  ))}
</div>
```

### Kanban 看板

```jsx
<div className="kanban-board">
  {['待办', '进行中', '已完成'].map(status => (
    <div key={status} className="kanban-list">
      <div className="kanban-list-header">
        <h3>{status}</h3>
      </div>
      <div className="kanban-tasks">
        {/* 任务卡片 */}
      </div>
    </div>
  ))}
</div>
```

---

## 🎓 学习资源

- [Material Design 3](https://m3.material.io/)
- [CSS 变量指南](https://developer.mozilla.org/zh-CN/docs/Web/CSS/--*)
- [Lucide React 图标](https://lucide.dev/)
- [WCAG 无障碍标准](https://www.w3.org/WAI/WCAG21/quickref/)

---

## ✅ 检查清单

实现新功能时的完整清单：

- [ ] 亮色模式外观
- [ ] 暗黑模式外观
- [ ] 桌面布局 (1920x1080)
- [ ] 平板布局 (768px)
- [ ] 手机布局 (480px)
- [ ] 悬停状态
- [ ] 焦点状态
- [ ] 加载状态
- [ ] 错误状态
- [ ] 键盘导航
- [ ] 屏幕阅读器兼容性
- [ ] 颜色对比度 (WCAG AA)
- [ ] 触摸友好的尺寸 (48px 最小)

---

**上次更新：** 2024年  
**维护者：** ESS 团队
