# ESS Platform 快速启动指南

## 问题修复

✅ 已修复前端API代理端口配置问题 (8080 -> 5000)

## 启动步骤

### 1. 确保 MongoDB 正在运行

```bash
# macOS (Homebrew)
brew services start mongodb-community

# 或使用 Docker
docker run --name mongodb -d -p 27017:27017 mongo:latest
```

### 2. 启动后端服务

```bash
cd backend
npm run dev
```

应该看到:
```
Server running on port 5000
✓ MongoDB connected
```

### 3. 启动前端服务 (新终端窗口)

```bash
cd frontend
npm run dev
```

应该看到:
```
VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 4. 重新启动前端(重要!)

由于我们刚修复了 `vite.config.js` 的端口配置,请:
1. 停止前端服务 (Ctrl+C)
2. 重新运行: `npm run dev`

### 5. 访问应用

打开浏览器访问: http://localhost:3000

## 查看新功能

1. 登录系统
2. 进入"电站列表"页面
3. 你将看到:
   - **顶部**: 金色高亮的"预估提升金额"统计卡片
   - **表格**: 新增"预估提升金额"列
     - 普通电站显示绿色金额 (如: +¥12,345.67)
     - AI电站显示 "-"
   - **底部汇总行**: 显示所有普通电站的预估提升金额总和

## 调试信息

打开浏览器控制台 (F12),你会看到:
```
API返回的数据: {success: true, data: [...], summary: {...}}
summary: {totalEstimatedImprovement: xxx, aiAverageRate: xxx}
第一个电站数据: {stationId: xxx, estimatedImprovement: xxx, ...}
```

## 预估提升金额计算说明

**公式**:
```
预估提升金额 = 预期收益 × (AI平均达成率 - 当前达成率) / 100
```

**示例**:
- 某普通电站预期收益: ¥100,000
- 当前达成率: 75%
- AI平均达成率: 85%
- 预估提升金额: ¥100,000 × (85% - 75%) / 100 = ¥10,000

**规则**:
- 只计算普通电站(非AI电站)
- 只有当 AI达成率 > 当前达成率 时才计算
- AI电站的预估提升金额为 0

## 故障排查

### 如果看不到数据:

1. **检查后端日志**:确认 MongoDB 连接成功
2. **检查浏览器控制台**:查看是否有API错误
3. **检查网络请求**:打开 Network 面板,确认 `/api/revenue/stations` 返回正确数据
4. **清除缓存**:Ctrl+Shift+R (硬刷新)

### 如果看到 "获取电站列表失败":

1. 确认后端在 5000 端口运行
2. 确认前端代理配置正确 (已修复为 5000)
3. 检查是否有登录 token (localStorage 中应该有 'token')

## 文件修改清单

### 后端:
- `backend/src/routes/stationRevenue.js` - 添加预估提升金额计算

### 前端:
- `frontend/src/pages/StationList.jsx` - 添加表格列和���计卡片
- `frontend/src/pages/StationList.css` - 添加样式
- `frontend/vite.config.js` - 修复API代理端口 ✅

---

如有问题,请检查上述步骤或查看浏览器控制台的调试信息。
