# Material Design UI 更新指南

## 🎨 新增功能

### 1. **Google Material Design 3 规范**
- 现代化的颜色系统
- 改进的排版和间距
- 高度可定制的组件
- 平滑的过渡和动画

### 2. **暗黑模式（Dark Mode）**
✅ 完全支持自动检测系统主题
✅ 手动主题切换按钮（右上角）
✅ 主题偏好保存到 localStorage
✅ 流畅的过渡效果

### 3. **响应式设计**
✅ 完美适配桌面、平板和手机
✅ 触摸友好的按钮和交互
✅ 流体网格布局
✅ 灵活的导航布局

---

## 🎯 设计亮点

### 色彩系统
- **主要颜色**：蓝色（#3b82f6）
- **成功颜色**：绿色（#10b981）
- **错误颜色**：红色（#ef4444）
- **警告颜色**：黄色（#f59e0b）

### 排版
- **标题**：24px / 600 font-weight
- **副标题**：18px / 600 font-weight
- **正文**：14px / 400 font-weight
- **标签**：12px / 500 font-weight

### 间距
- **XS**：4px
- **SM**：8px
- **MD**：12px
- **LG**：16px
- **XL**：24px

### 圆角
- **XS**：4px
- **SM**：8px
- **MD**：12px
- **LG**：16px
- **XL**：24px

### 阴影
- **XS**：轻微投影
- **SM**：微投影
- **MD**：标准投影
- **LG**：高投影
- **XL**：非常高投影

---

## 📱 响应式断点

```css
/* Desktop */
max-width: 1200px

/* Tablet */
@media (max-width: 768px)

/* Mobile */
@media (max-width: 480px)
```

---

## 🌓 暗黑模式使用

### 启用暗黑模式
自动检测系统设置或点击右上角的主题切换按钮。

### CSS 变量
```css
/* Light mode (default) */
--background: #f9fafb;
--surface: #ffffff;
--text-primary: #1f2937;

/* Dark mode */
html.dark {
  --background: #111827;
  --surface: #1f2937;
  --text-primary: #f3f4f6;
}
```

### 在组件中使用
```jsx
// 颜色自动适应主题
background-color: var(--surface);
color: var(--text-primary);
```

---

## 🎨 页面预览

### 登录页面
- Material Design 表单
- 居中布局
- 响应式卡片
- 平滑动画

### 仪表板
- 网格布局看板
- 悬停效果
- 响应式多列到单列
- 主题切换按钮

### 看板页面
- 看板列表布局
- 任务卡片设计
- 优先级指示器
- 移动设备优化

---

## 📊 浏览器支持

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |
| IE 11 | - | ❌ 不支持 |

---

## 🎯 最佳实践

### 1. 使用 CSS 变量
```css
/* ✅ 好 */
color: var(--text-primary);
background: var(--surface);

/* ❌ 不好 */
color: #1f2937;
background: #ffffff;
```

### 2. 响应式设计
```css
/* ✅ 好 */
@media (max-width: 768px) {
  padding: 16px;
}

/* ❌ 不好 */
padding: 20px; /* 固定大小 */
```

### 3. 暗黑模式支持
```css
/* ✅ 好 */
.component {
  background: var(--surface);
  color: var(--text-primary);
}

/* ❌ 不好 */
.component {
  background: white;
  color: #333;
}
```

---

## 🔧 自定义主题

### 修改主色
在 `App.css` 中修改 `:root` 中的 `--accent` 变量：

```css
:root {
  --accent: #YOUR_COLOR;
  --accent-hover: #DARKER_COLOR;
  --accent-light: #LIGHTER_COLOR;
  --accent-dark: #DARKEST_COLOR;
}
```

### 添加新颜色
```css
:root {
  --new-color: #hexcolor;
}

html.dark {
  --new-color: #hexcolor;
}
```

---

## 📱 手机预览优化

### 安全区域
```css
@supports (padding: max(0px)) {
  body {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }
}
```

### 触摸友好的按钮
```css
.btn {
  /* 最小 44px x 44px 用于触摸 */
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

### 响应式文字
```css
body {
  font-size: 14px;
}

@media (max-width: 480px) {
  body {
    font-size: 13px;
  }
}
```

---

## 🎨 组件示例

### 按钮
```jsx
<button className="btn btn-primary">主要按钮</button>
<button className="btn btn-secondary">次要按钮</button>
<button className="btn btn-danger">危险按钮</button>
```

### 卡片
```jsx
<div className="board-card">
  <h2>卡片标题</h2>
  <p>卡片描述</p>
  <div className="board-card-actions">
    <button className="btn btn-primary">操作</button>
  </div>
</div>
```

### 表单
```jsx
<form className="form">
  <div className="form-group">
    <label>输入标签</label>
    <input type="text" />
  </div>
</form>
```

---

## 🚀 性能优化

- ✅ CSS 变量而非 SCSS（更快）
- ✅ 原生 CSS 媒体查询
- ✅ 优化的过渡效果
- ✅ 无图片依赖的图标（使用 Lucide React）
- ✅ 最小化的 CSS 包大小

---

## 📚 参考资源

- [Google Material Design 3](https://m3.material.io/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [Web 可访问性最佳实践](https://www.w3.org/WAI/)

---

## 🐛 故障排除

### 暗黑模式不工作
1. 检查浏览器是否支持 `prefers-color-scheme`
2. 清除缓存和 localStorage
3. 硬刷新页面（Ctrl+Shift+R）

### 响应式布局不工作
1. 确保 viewport meta 标签正确
2. 检查浏览器开发者工具中的媒体查询
3. 在不同设备上测试

### 颜色不正确
1. 检查是否正在使用 CSS 变量
2. 验证 `html.dark` 类是否应用
3. 清除浏览器缓存

---

## ✅ 质量检查清单

- [ ] 在浅色模式下测试
- [ ] 在深色模式下测试
- [ ] 在桌面上测试（1920x1080）
- [ ] 在平板上测试（768x1024）
- [ ] 在手机上测试（375x667）
- [ ] 测试所有交互（悬停、点击、焦点）
- [ ] 检查对比度（WCAG AA）
- [ ] 测试键盘导航
- [ ] 测试屏幕阅读器

---

祝你享受新的现代化设计！🎉
