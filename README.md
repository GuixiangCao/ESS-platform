# ESS Platform - 账户系统与看板系统

一个现代的全栈 Web 应用，集成用户账户管理和项目看板管理功能。

## 🎯 功能特性

### 账户系统
- 用户注册与登录
- JWT 身份验证
- 用户资料管理
- 密码加密存储
- 角色管理 (用户/管理员)

### 看板系统
- 创建、编辑、删除看板
- 看板成员管理
- 多列表任务组织
- 任务优先级设置
- 任务状态追踪 (待办/进行中/已完成)
- 任务分配与管理

## 📋 项目结构

```
ess-platform/
├── backend/                 # Node.js + Express 后端
│   ├── src/
│   │   ├── models/         # MongoDB 数据模型
│   │   ├── controllers/    # 业务逻辑控制器
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件 (认证等)
│   │   └── index.js        # 应用入口
│   ├── package.json
│   └── .env.example
└── frontend/               # React + Vite 前端
    ├── src/
    │   ├── components/     # React 组件
    │   ├── pages/         # 页面组件
    │   ├── services/      # API 服务
    │   ├── App.jsx        # 应用主组件
    │   └── main.jsx       # 应用入口
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🚀 快速开始

### 📌 遇到 `[nodemon] app crashed` 错误？

**99% 的原因：MongoDB 未运行**

```bash
# 启动 MongoDB (选择一个)
brew services start mongodb-community    # macOS
docker run -d -p 27017:27017 mongo     # Docker (推荐)
```

👉 完整故障排查：查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### 前置要求
- Node.js (v14+)
- MongoDB (本地或云端)
- npm 或 yarn

### 后端设置

1. 进入后端目录
```bash
cd backend
bash ../start-backend.sh
```

或手动：
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

服务器将运行在 `http://localhost:5000`

### 前端设置

1. 进入前端目录
```bash
cd frontend
bash ../start-frontend.sh
```

或手动：
```bash
cd frontend
npm install
npm run dev
```

应用将在 `http://localhost:3000` 运行

## 🛠️ 有用的命令

```bash
# 检查环境配置
bash check-startup.sh

# 快速启动脚本
bash start-backend.sh   # 启动后端
bash start-frontend.sh  # 启动前端

# 手动启动
npm run dev             # 在 backend/ 或 frontend/ 目录运行

# 测试 API
curl http://localhost:5000/api/health
```

## 📖 文档

- **[QUICK-START.md](QUICK-START.md)** - ⚡ 快速开始指南
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - 📋 快速参考卡
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - 🔧 问题排查指南
- **[BACKEND.md](BACKEND.md)** - 🖥️ 后端开发文档
- **[FRONTEND.md](FRONTEND.md)** - 🎨 前端开发文档

## 📚 API 文档

### 认证相关 API

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string"
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer {token}
```

### 看板相关 API

#### 创建看板
```
POST /api/boards
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "backgroundColor": "string",
  "isPublic": boolean
}
```

#### 获取用户的所有看板
```
GET /api/boards
Authorization: Bearer {token}
```

#### 获取看板详情
```
GET /api/boards/{boardId}
Authorization: Bearer {token}
```

#### 更新看板
```
PUT /api/boards/{boardId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "backgroundColor": "string",
  "isPublic": boolean
}
```

#### 删除看板
```
DELETE /api/boards/{boardId}
Authorization: Bearer {token}
```

#### 添加看板成员
```
POST /api/boards/{boardId}/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "string"
}
```

### 任务相关 API

#### 创建任务
```
POST /api/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "listId": "string",
  "boardId": "string",
  "priority": "low|medium|high",
  "dueDate": "ISO8601 date"
}
```

#### 获取列表中的任务
```
GET /api/tasks/list/{listId}
Authorization: Bearer {token}
```

#### 更新任务
```
PUT /api/tasks/{taskId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "priority": "low|medium|high",
  "status": "todo|in-progress|done",
  "dueDate": "ISO8601 date",
  "assignee": "userId"
}
```

#### 删除任务
```
DELETE /api/tasks/{taskId}
Authorization: Bearer {token}
```

#### 移动任务
```
PATCH /api/tasks/{taskId}/move
Authorization: Bearer {token}
Content-Type: application/json

{
  "newListId": "string",
  "position": number
}
```

## 🔧 技术栈

### 后端
- **Express.js** - Web 框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **JWT** - 身份验证
- **bcryptjs** - 密码加密

### 前端
- **React 18** - UI 框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Lucide Icons** - 图标库

## 📝 数据模型

### User 用户模型
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  avatar: String,
  bio: String,
  role: String (user|admin),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Board 看板模型
```javascript
{
  title: String,
  description: String,
  owner: ObjectId (ref: User),
  members: [ObjectId] (ref: User),
  backgroundColor: String,
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### List 列表模型
```javascript
{
  title: String,
  board: ObjectId (ref: Board),
  position: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Task 任务模型
```javascript
{
  title: String,
  description: String,
  list: ObjectId (ref: List),
  board: ObjectId (ref: Board),
  assignee: ObjectId (ref: User),
  priority: String (low|medium|high),
  status: String (todo|in-progress|done),
  dueDate: Date,
  tags: [String],
  position: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 安全性

- JWT 用于无状态身份验证
- 密码使用 bcryptjs 进行加密
- 环境变量用于敏感配置
- CORS 配置用于跨域请求控制
- 路由级别的权限验证

## 🚧 未来改进

- [ ] 实时协作功能 (WebSocket)
- [ ] 文件上传支持
- [ ] 评论和活动日志
- [ ] 高级搜索和过滤
- [ ] 邮件通知
- [ ] 日历视图
- [ ] 生产环境部署指南

## 📄 许可证

MIT

## 👨‍💻 开发者

Created with ❤️

---

如有问题或建议，欢迎提交 Issue 或 Pull Request！
