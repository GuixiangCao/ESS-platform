# ESS Platform - 快速参考指南

## 🎨 CSS 变量速查表

### 颜色变量
```css
/* 文本颜色 */
color: var(--text-primary);      /* 主要文本 */
color: var(--text-secondary);    /* 次要文本 */
color: var(--text-tertiary);     /* 辅助文本 */

/* 背景颜色 */
background: var(--surface);           /* 白色/深灰 */
background: var(--surface-variant);   /* 浅灰/更深灰 */
background: var(--background);        /* 页面背景 */

/* 强调色 */
background: var(--accent);           /* 蓝色 */
background: var(--accent-hover);     /* 深蓝色 */

/* 语义颜色 */
color: var(--success);    /* 绿色 */
color: var(--warning);    /* 琥珀色 */
color: var(--error);      /* 红色 */
```

### 间距变量
```css
padding: var(--space-xs);   /* 4px */
padding: var(--space-sm);   /* 8px */
padding: var(--space-md);   /* 16px */
padding: var(--space-lg);   /* 24px */
padding: var(--space-xl);   /* 32px */
padding: var(--space-2xl);  /* 48px */
```

### 排版变量
```css
border-radius: var(--radius-xs);   /* 4px */
border-radius: var(--radius-sm);   /* 8px */
border-radius: var(--radius-md);   /* 12px */
border-radius: var(--radius-lg);   /* 16px */
border-radius: var(--radius-xl);   /* 24px */
border-radius: var(--radius-full); /* 9999px */
```

---

## 🧩 常用组件

### 按钮
```jsx
<button className="btn btn-primary">主操作</button>
<button className="btn btn-secondary">取消</button>
<button className="btn btn-danger">删除</button>
<button className="btn btn-small">小</button>
<button className="btn btn-large">大（48px）</button>
```

### 表单
```jsx
<form className="form form-card">
  <div className="form-header">
    <h1>标题</h1>
    <p className="form-subtitle">副标题</p>
  </div>
  <div className="form-group">
    <label htmlFor="field">标签</label>
    <input id="field" type="text" />
  </div>
</form>
```

### 卡片网格
```jsx
<div className="boards-grid">
  {items.map(item => (
    <div key={item.id} className="board-card">
      <h2>{item.title}</h2>
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
  <div className="kanban-list">
    <div className="kanban-list-header"><h3>列</h3></div>
    <div className="kanban-tasks">{/* 任务 */}</div>
  </div>
</div>
```

---

## 🌙 暗黑模式

✅ **自动支持** - 使用 CSS 变量：
```jsx
<div style={{
  color: 'var(--text-primary)',
  backgroundColor: 'var(--surface)'
}}>内容</div>
```

❌ **不支持** - 硬编码颜色：
```jsx
<div style={{
  color: '#1f2937',
  backgroundColor: '#ffffff'
}}>内容</div>
```

---

## 📱 响应式

```jsx
{/* 自动响应的网格 */}
<div className="boards-grid">
  {/* 桌面: 多列, 平板: 2列, 手机: 1列 */}
</div>

{/* 隐藏元素 */}
<span className="hide-on-mobile">仅桌面</span>

{/* 响应式布局 */}
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 'var(--space-lg)'
}}>
```

---

## ✅ 最佳实践

✅ 使用 `var(--text-primary)` 不用 `#1f2937`  
✅ 使用 `var(--space-md)` 不用 `16px`  
✅ 使用 `.btn btn-primary` 不用 `style={{...}}`  
✅ 检查暗黑模式  
✅ 检查响应式  
✅ 标签关联输入 `<label htmlFor="id">`  

---

**详见**: [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | [MODERNIZATION-SUMMARY.md](./MODERNIZATION-SUMMARY.md)
