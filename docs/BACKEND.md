# 后端开发指南

## 环境设置

### 1. MongoDB 连接

确保你已安装 MongoDB 或使用 MongoDB Atlas 云服务。

在 `.env` 文件中配置：
```
MONGODB_URI=mongodb://localhost:27017/ess-platform
```

### 2. JWT 配置

生成一个安全的 JWT 密钥：
```
JWT_SECRET=your_secure_random_string_here
JWT_EXPIRE=7d
```

### 3. 依赖安装

```bash
npm install
```

## 启动服务

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## 项目结构详解

### models/
定义 MongoDB 数据模型

- **User.js** - 用户模型，包含认证逻辑
- **Board.js** - 看板模型
- **List.js** - 看板列表模型
- **Task.js** - 任务模型

### controllers/
处理业务逻辑

- **authController.js** - 注册、登录、用户管理
- **boardController.js** - 看板 CRUD 操作和成员管理
- **taskController.js** - 任务 CRUD 操作和状态管理
- **listController.js** - 列表 CRUD 操作

### routes/
定义 API 路由

- **auth.js** - 认证相关路由
- **boards.js** - 看板相关路由
- **tasks.js** - 任务相关路由
- **lists.js** - 列表相关路由

### middleware/
中间件层

- **auth.js** - JWT 认证中间件

## API 开发流程

### 添加新的 API 端点步骤

1. **创建/修改控制器方法** (`controllers/`)
   ```javascript
   exports.methodName = async (req, res) => {
     try {
       // 业务逻辑
       res.json({ data });
     } catch (error) {
       res.status(500).json({ message: error.message });
     }
   };
   ```

2. **在路由文件中添加路由** (`routes/`)
   ```javascript
   router.post('/endpoint', auth, controllerMethod);
   ```

3. **在主文件中导入路由** (`src/index.js`)
   ```javascript
   app.use('/api/path', routes);
   ```

## 常见操作

### 获取认证用户 ID
```javascript
const userId = req.user.userId;
```

### 查询数据库并填充关联
```javascript
const board = await Board.findById(id)
  .populate('owner members', 'username email avatar');
```

### 错误处理最佳实践
```javascript
try {
  // 操作
} catch (error) {
  console.error('操作失败:', error);
  res.status(500).json({ 
    message: '操作失败', 
    error: error.message 
  });
}
```

## 测试 API

使用 Postman 或 curl 测试 API：

```bash
# 注册用户
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 创建看板 (需要在 headers 中添加 Authorization: Bearer {token})
curl -X POST http://localhost:5000/api/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_token}" \
  -d '{
    "title": "My Board",
    "description": "My first board",
    "isPublic": false
  }'
```

## 调试技巧

1. **启用详细日志**
   ```javascript
   console.log('Debug info:', variable);
   ```

2. **使用 MongoDB 客户端查看数据**
   - MongoDB Compass
   - MongoDB Atlas Web Interface
   - mongosh CLI

3. **检查 JWT Token**
   ```javascript
   console.log('Token:', req.headers.authorization);
   ```

## 常见问题

### 连接数据库失败
- 确保 MongoDB 服务运行
- 检查 MONGODB_URI 配置
- 验证网络连接

### JWT 验证失败
- 确保 token 格式正确: `Bearer {token}`
- 检查 JWT_SECRET 是否匹配
- 确保 token 未过期

### CORS 错误
- 检查前端请求域名
- 修改 CORS 配置以支持新域名

## 性能优化

- 使用数据库索引
- 实现分页查询
- 缓存频繁查询结果
- 异步处理耗时操作

---

更多问题请参考主 README.md
