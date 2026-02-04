# 常见问题排查指南

## 问题 1: [nodemon] app crashed - waiting for file changes

### 原因
后端应用启动时发生错误，最常见的原因是：
1. **MongoDB 未连接** - 数据库服务未运行
2. **缺少依赖** - 未执行 npm install
3. **端口被占用** - 5000 端口已被其他程序使用
4. **环境变量配置错误** - .env 文件配置有误

### 解决方案

#### 步骤 1: 检查 MongoDB 状态

**macOS (使用 Homebrew)**
```bash
# 启动 MongoDB
brew services start mongodb-community

# 检查状态
brew services list | grep mongodb

# 停止 MongoDB
brew services stop mongodb-community
```

**Windows (使用 Chocolatey)**
```bash
# 安装 MongoDB
choco install mongodb

# 启动服务
net start MongoDB
```

**Linux (Ubuntu/Debian)**
```bash
# 启动 MongoDB
sudo systemctl start mongod

# 检查状态
sudo systemctl status mongod
```

**使用 Docker**
```bash
# 拉取并运行 MongoDB 容器
docker run --name mongodb -d -p 27017:27017 mongo:latest
```

#### 步骤 2: 验证 MongoDB 连接

在另一个终端运行：
```bash
# 连接到 MongoDB
mongosh

# 或使用旧版
mongo
```

如果连接成功，你会看到 MongoDB 的交互式 shell。

#### 步骤 3: 检查后端依赖

```bash
cd backend

# 删除旧的 node_modules
rm -rf node_modules
rm package-lock.json

# 重新安装依赖
npm install

# 检查是否有依赖错误
npm list
```

#### 步骤 4: 验证环境变量

```bash
cd backend

# 确保 .env 文件存在
ls -la .env

# 查看内容（不要上传包含敏感信息）
cat .env

# 如果文件不存在，从示例创建
cp .env.example .env
```

#### 步骤 5: 检查端口占用

**macOS/Linux**
```bash
# 查看 5000 端口占用情况
lsof -i :5000

# 如果端口被占用，杀死进程
kill -9 <PID>

# 或更改后端端口，在 .env 中设置
PORT=5001
```

**Windows**
```bash
# 查看端口占用
netstat -ano | findstr :5000

# 杀死进程
taskkill /PID <PID> /F
```

#### 步骤 6: 启用详细日志

编辑 `backend/src/index.js`，添加更多日志：

```javascript
// 在 dotenv.config() 后添加
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 5000);
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
```

### 完整的启动检查清单

```bash
#!/bin/bash

echo "✓ 检查 Node.js..."
node -v

echo "✓ 检查 npm..."
npm -v

echo "✓ 检查 MongoDB..."
mongosh --eval "db.adminCommand('ping')"

echo "✓ 进入后端目录..."
cd backend

echo "✓ 检查 .env 文件..."
[ -f .env ] && echo "✓ .env 存在" || echo "✗ .env 不存在！"

echo "✓ 检查 node_modules..."
[ -d node_modules ] && echo "✓ node_modules 存在" || echo "✗ node_modules 不存在，运行 npm install"

echo "✓ 检查端口 5000..."
lsof -i :5000 && echo "⚠️  端口 5000 被占用" || echo "✓ 端口 5000 空闲"

echo "✓ 所有检查完成！"
```

---

## 问题 2: MongoDB 连接拒绝

错误信息：`connect ECONNREFUSED 127.0.0.1:27017`

**解决方案：**
1. 确保 MongoDB 已启动（见上方）
2. 检查 MONGODB_URI 是否正确
3. 如果使用 MongoDB Atlas 云服务，确保网络白名单包含你的 IP

---

## 问题 3: 前端无法连接后端

浏览器控制台错误：`Failed to fetch from /api/...`

**解决方案：**
1. 确保后端运行在 `http://localhost:5000`
2. 检查 `frontend/vite.config.js` 中的 proxy 配置
3. 清除浏览器缓存并硬刷新（Cmd+Shift+R）

---

## 问题 4: 端口 3000 被占用

**解决方案：**
在 `frontend/vite.config.js` 中修改端口：
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,  // 改为其他端口
    ...
  }
})
```

---

## 快速测试 API

启动后端后，在新终端运行：

```bash
# 健康检查
curl http://localhost:5000/api/health

# 应该返回
# {"status":"OK","message":"ESS Platform Backend is running"}
```

---

## 获取更多帮助

1. 查看完整的 `BACKEND.md` 文档
2. 检查后端日志输出
3. 使用 MongoDB Compass 可视化数据库

记住：大多数启动问题都是由于 MongoDB 未运行导致的！
