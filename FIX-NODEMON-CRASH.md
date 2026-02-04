# 🆘 问题诊断：[nodemon] app crashed

## 问题说明

当运行 `npm run dev` 时，看到这个错误说明后端应用无法启动。

```
[nodemon] app crashed - waiting for file changes before starting
```

---

## ✅ 快速诊断检查清单

按顺序检查以下项目：

### 1. **MongoDB 是否运行？** ⭐ 最常见原因

```bash
# 测试 MongoDB 连接
mongosh
# 或
mongo
```

**如果显示 `connection refused`，则需要启动 MongoDB：**

#### macOS (Homebrew)
```bash
brew services start mongodb-community
```

#### Docker (推荐，跨平台)
```bash
docker run --name mongodb -d -p 27017:27017 mongo:latest
```

#### Windows
```bash
net start MongoDB
```

### 2. **是否执行了 npm install？**

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### 3. **.env 文件是否存在？**

```bash
cd backend
cp .env.example .env

# 检查文件
cat .env
```

### 4. **端口 5000 是否被占用？**

```bash
# 查看占用情况
lsof -i :5000

# 如果被占用，杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT
```

### 5. **Node.js 版本是否兼容？**

```bash
node -v  # 应该是 v14+ 
npm -v   # 应该是 v6+
```

---

## 🔍 详细错误诊断

运行以下命令查看具体错误信息：

```bash
cd backend

# 方式 1：直接运行（不使用 nodemon）
node src/index.js

# 方式 2：启用调试模式
DEBUG=* npm run dev

# 方式 3：检查依赖
npm list

# 方式 4：检查 Node 模块
ls -la node_modules/ | head -20
```

---

## 📋 完整的恢复步骤

如果一切都检查过仍然不行，按以下步骤重新开始：

```bash
# 1. 停止所有进程 (Ctrl+C)

# 2. 进入后端目录
cd backend

# 3. 清空所有缓存
rm -rf node_modules package-lock.json
rm -f .env

# 4. 创建新的 .env
cp .env.example .env

# 5. 重新安装依赖
npm install

# 6. 验证 MongoDB 运行
# (在另一个终端)
mongosh

# 7. 重新启动后端
npm run dev
```

---

## 🚀 推荐的启动流程

### 使用自动脚本（最简单）

```bash
# 1. 在项目根目录运行检查
bash check-startup.sh

# 2. 启动 MongoDB（如需要）
docker run -d -p 27017:27017 mongo:latest

# 3. 启动后端
cd backend && bash ../start-backend.sh

# 4. 在新终端启动前端
cd frontend && bash ../start-frontend.sh
```

### 或使用 Docker Compose（最可靠）

```bash
# 一键启动整个项目（MongoDB + 后端 + 前端）
docker-compose up

# 访问 http://localhost:3000
```

---

## 📊 常见错误和解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `MongoDB connection error` | MongoDB 未运行 | `brew services start mongodb-community` |
| `connect ECONNREFUSED` | 端口被占用或服务未启动 | 检查端口或重启服务 |
| `Cannot find module` | 缺少依赖 | `npm install` |
| `ENOENT: no such file or directory, open '.env'` | .env 文件不存在 | `cp .env.example .env` |
| `Port 5000 already in use` | 端口被占用 | 杀死占用进程或改端口 |

---

## 🧪 验证一切正常

### 测试后端

```bash
# 在新终端运行
curl http://localhost:5000/api/health

# 预期输出
# {"status":"OK","message":"ESS Platform Backend is running"}
```

### 测试前端

访问 http://localhost:3000 应该看到登录页面

### 测试 MongoDB

```bash
mongosh
show dbs
use ess-platform
db.users.find()
```

---

## 🆘 还是不行？

1. **收集完整错误信息：**
   ```bash
   npm run dev 2>&1 | tee error.log
   ```

2. **查看项目文档：**
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 详细问题排查
   - [BACKEND.md](BACKEND.md) - 后端文档
   - [DOCKER.md](DOCKER.md) - Docker 方案

3. **检查环境：**
   ```bash
   bash check-startup.sh
   ```

4. **尝试 Docker Compose：**
   ```bash
   docker-compose up
   ```

---

## 💡 预防建议

1. **使用推荐的启动脚本** - 它们会自动处理常见问题
2. **使用 Docker** - 避免本地环境问题
3. **保持依赖最新** - 定期运行 `npm update`
4. **监看日志** - 始终检查终端输出中的错误信息

---

**记住：** 99% 的 `[nodemon] app crashed` 错误都是因为 **MongoDB 未运行**！

需要进一步帮助？查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
