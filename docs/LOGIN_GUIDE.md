# 🔧 登录问题解决方案

## 问题状态
✅ 已重置用户密码
⚠️ 后端服务需要启动

## 📝 登录凭据

**邮箱**: paul09@126.com
**密码**: paul123456

---

## 🚀 完整启动步骤

### 第1步: 启动 MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# 或使用 Docker
docker run --name mongodb -d -p 27017:27017 mongo:latest

# 验证 MongoDB 是否运行
mongosh --eval "db.version()"
```

### 第2步: 启动后端服务

**打开终端1**:
```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/backend
npm run dev
```

**预期输出**:
```
[nodemon] 3.0.2
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node src/index.js`
Server running on port 5000
✓ MongoDB connected
```

### 第3步: 启动前端服务

**打开终端2**:
```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/frontend
npm run dev
```

**预期输出**:
```
VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 第4步: 登录系统

1. 打开浏览器访问: **http://localhost:3000**
2. 使用以下凭据登录:
   - 邮箱: **paul09@126.com**
   - 密码: **paul123456**

---

## 🎯 查看新功能

登录成功后:

1. 点击左侧菜单的 **"电站列表"**
2. 你将看到三个新增的显示位置:

### ① 顶部统计卡片
- 金色渐变背景
- 显示"预估提升金额"总和
- ✨ Sparkles 图标

### ② 表格列
- 每个电站都有"预估提升金额"列
- 普通电站: 绿色金额 `+¥12,345.67`
- AI电站: 灰色 `-`

### ③ 底部汇总行
- 显示筛选后的预估提升金额总和
- 深绿色粗体

---

## 🐛 故障排查

### 问题1: 后端无法启动

```bash
# 检查端口是否被占用
lsof -i :5000

# 如果被占用,杀掉进程
kill -9 <PID>

# 重新启动
cd backend && npm run dev
```

### 问题2: MongoDB 连接失败

```bash
# 检查 MongoDB 是否运行
brew services list | grep mongodb

# 启动 MongoDB
brew services start mongodb-community

# 或检查 Docker 容器
docker ps | grep mongodb
```

### 问题3: 前端连接失败

1. 确认后端在 5000 端口运行: `lsof -i :5000`
2. 确认 vite.config.js 代理配置为 5000 (已修复✅)
3. 重启前端服务: Ctrl+C 然后 `npm run dev`

### 问题4: 登录后看不到数据

打开浏览器控制台 (F12):
```javascript
// 应该看到:
API返回的数据: {success: true, data: [...], summary: {...}}
summary: {totalEstimatedImprovement: xxx, aiAverageRate: xxx}
```

如果没有数据,检查:
1. 浏览器 Network 面板的 `/api/revenue/stations` 请求
2. 后端终端是否有错误日志
3. MongoDB 中是否有电站数据

---

## 📊 数据说明

### 预估提升金额计算公式

```
预估提升金额 = 预期收益 × (AI平均达成率 - 当前达成率) / 100
```

### 示例

假设:
- AI电站平均达成率: 85%
- 某普通电站达成率: 75%
- 该电站预期收益: ¥100,000

计算:
```
预估提升金额 = 100,000 × (85% - 75%) / 100
            = 100,000 × 10% / 100
            = ¥10,000
```

### 规则

✅ 只计算普通电站(非AI电站)
✅ 只有当 AI达成率 > 当前达成率 时才计算
✅ AI电站的预估提升金额为 0
✅ 总预估提升金额 = 所有普通电站的预估金额之和

---

## 🔐 重置其他用户密码

如果需要重置其他用户的密码:

```bash
cd backend
node reset-password.js
# 按提示输入邮箱和新密码
```

---

## ✅ 文件修改清单

### 已修改的文件:

1. **backend/src/routes/stationRevenue.js**
   - 为每个电站添加 `estimatedImprovement` 字段
   - 返回 `summary.totalEstimatedImprovement`

2. **frontend/src/pages/StationList.jsx**
   - 添加顶部"预估提升金额"统计卡片
   - 添加表格"预估提升金额"列
   - 添加底部汇总行的预估金额显示

3. **frontend/src/pages/StationList.css**
   - 添加高亮统计卡片样式
   - 添加预估金额文字样式

4. **frontend/vite.config.js** ✅
   - 修复API代理端口: 8080 → 5000

---

## 📞 需要帮助?

如果遇到问题:
1. 检查上述故障排查步骤
2. 查看浏览器控制台和后端终端的错误信息
3. 确保所有服务都在正确的端口运行

---

**祝使用愉快!** 🎉
