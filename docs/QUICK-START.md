# 🚀 快速启动指南 | Quick Start Guide

## ⚡ 最快启动 (5 分钟)

### 方式 1: 使用初始化脚本（推荐）

```bash
# 进入项目目录
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform

# 运行初始化脚本
bash setup.sh

# 然后按照脚本提示的步骤操作
```

### 方式 2: 手动快速设置

```bash
# 进入项目目录
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform

# 安装所有依赖
npm install  # 根 package.json 中有 npm workspaces 配置

# 或分别安装
cd backend && npm install
cd ../frontend && npm install
cd ..

# 创建后端环境配置
cp backend/.env.example backend/.env
```

## 🔧 启动服务

**在三个不同的终端中分别运行：**

### Terminal 1 - MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Docker (推荐)
docker run --name mongodb -d -p 27017:27017 mongo:latest

# Docker Compose
docker-compose up mongodb -d
```

### Terminal 2 - 后端服务

```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/backend
npm run dev

# 期望输出:
# ✓ MongoDB connected
# Server running on port 5000
```

### Terminal 3 - 前端服务

```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/frontend
npm run dev

# 期望输出:
# VITE v4.x.x ready in xxx ms
# Local: http://localhost:3000/
```

## 🌐 访问应用

- **前端:** http://localhost:3000
- **后端 API:** http://localhost:5000
- **MongoDB:** localhost:27017

## 🆘 遇到问题？

### 快速诊断

```bash
# 运行诊断脚本（会检查所有配置）
bash /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/diagnose.sh
```

### 常见问题

#### 问题：`port 5000 already in use` or `EADDRINUSE`

**原因：** 端口被占用

**解决：**
```bash
# 查看占用的进程
lsof -i :5000

# 杀死进程 (替换 <PID>)
kill -9 <PID>

# 或使用其他端口
cd backend
PORT=5001 npm run dev
```

#### 问题：`MongoDB connection error`

**原因：** MongoDB 没有运行

**解决：**
```bash
# macOS
brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 mongo:latest

# 验证连接
mongosh  # 如果能进入命令行说明成功
```

#### 问题：`Cannot find module`

**原因：** 依赖未安装

**解决：**
```bash
# 后端
cd backend
rm -rf node_modules package-lock.json
npm install

# 前端
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

#### 问题：`.env` 文件不存在

**原因：** 环境配置文件缺失

**解决：**
```bash
cd backend
cp .env.example .env

# 编辑 .env 配置数据库和其他参数（可选）
nano .env
```

#### 问题：`ENOENT: no such file or directory, open '/path/to/package.json'`

**原因：** 在错误的目录运行 npm 命令

**解决：**
```bash
# 确保在正确的目录
cd backend   # 启动后端
cd frontend  # 启动前端

# 不要在项目根目录运行 npm start
# 根目录只用于 npm install --workspaces
```

## 📝 环境配置

编辑 `backend/.env`：

```env
# 服务器配置
PORT=5000
NODE_ENV=development

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/ess-platform

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_here

# 前端 URL
CORS_ORIGIN=http://localhost:3000
```

## ✅ 验证安装成功

### 检查后端
```bash
# 终端中应该看到
✓ MongoDB connected
Server running on port 5000
```

### 检查前端
打开 http://localhost:3000，应该看到 ESS 平台登录页面

### 检查 MongoDB
```bash
mongosh
# 连接成功后可以看到 mongodb>
```

## 🐳 使用 Docker 启动（可选）

最简单的方式 - 一条命令启动所有服务：

```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform

# 启动所有服务（MongoDB + 后端 + 前端）
docker-compose up

# 或后台启动
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止
docker-compose down
```

## 📚 更多文档

- [诊断指南](./diagnose.sh) - 自动检查系统配置
- [故障排查](./TROUBLESHOOTING.md) - 详细问题解决
- [完整文档](./INDEX.md) - 所有文档索引
- [项目报告](./FINAL-PROJECT-REPORT.md) - 项目信息

## 🎯 下一步

1. ✅ 启动所有服务
2. 🔑 使用默认账户登录（见登录页面）
3. 📊 浏览看板和管理功能
4. ⚙️ 查看 [API 参考](./API-REFERENCE.md) 了解 API

---

**遇到问题？** 运行 `bash diagnose.sh` 获得帮助。

祝您使用愉快！ 🚀
```bash
# 安装（如果还未安装）
brew tap mongodb/brew
brew install mongodb-community

# 启动服务
brew services start mongodb-community

# 验证
brew services list | grep mongodb
```

**Windows**
```bash
# 从 https://www.mongodb.com/try/download/community 下载安装
# 然后
net start MongoDB
```

**Docker (推荐，适用所有系统)**
```bash
# 拉取并运行 MongoDB 容器
docker run --name mongodb -d -p 27017:27017 mongo:latest

# 验证
docker ps | grep mongodb
```

**验证 MongoDB 运行：**
```bash
mongosh
# 或
mongo
```

### 问题：端口已被占用

**后端端口 5000:**
```bash
# 查看占用情况
lsof -i :5000

# 杀死进程
kill -9 <PID>

# 或改用其他端口，编辑 backend/.env
PORT=5001
```

**前端端口 3000:**
```bash
# 查看占用情况
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或在 frontend/vite.config.js 改端口
```

### 问题：缺少依赖

```bash
# 后端
cd backend
rm -rf node_modules package-lock.json
npm install

# 前端
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📋 完整的手动启动步骤

如果自动脚本不工作：

### 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 创建 .env 文件
cp .env.example .env

# 编辑 .env (可选，除非需要改默认配置)
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/ess-platform
# JWT_SECRET=your_secret_here

# 3. 安装依赖
npm install

# 4. 启动服务
npm run dev
```

### 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动服务
npm run dev
```

---

## ✅ 验证一切正常

### 检查后端

在浏览器或终端运行：
```bash
curl http://localhost:5000/api/health
```

期望响应：
```json
{
  "status": "OK",
  "message": "ESS Platform Backend is running"
}
```

### 检查前端

访问 http://localhost:3000

你应该看到登录页面。

---

## 📚 如需更多帮助

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - 详细的问题排查指南
- **[BACKEND.md](BACKEND.md)** - 后端开发文档
- **[FRONTEND.md](FRONTEND.md)** - 前端开发文档
- **[README.md](README.md)** - 项目完整文档

---

## 常见命令速查

```bash
# 后端相关
cd backend && npm run dev      # 启动后端
cd backend && npm install      # 安装依赖
cd backend && npm test         # 运行测试

# 前端相关
cd frontend && npm run dev     # 启动前端
cd frontend && npm run build   # 构建生产版本
cd frontend && npm install     # 安装依赖

# MongoDB 相关 (macOS)
brew services start mongodb-community   # 启动
brew services stop mongodb-community    # 停止
brew services list                      # 查看状态

# MongoDB 相关 (Docker)
docker run --name mongodb -d -p 27017:27017 mongo:latest  # 启动
docker stop mongodb                                        # 停止
docker ps -a | grep mongodb                              # 查看状态
```

---

## 💡 小贴士

1. **使用两个终端** - 一个后端，一个前端，这样能同时看到两边的日志
2. **监看日志** - 任何错误信息都会帮助诊断问题
3. **硬刷新浏览器** - 如前端有问题，试试 Cmd+Shift+R
4. **检查网络标签** - 用浏览器开发者工具 (F12) 检查 API 请求

---

**遇到问题？** 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) 获取详细帮助！
