# Docker 启动指南

## 使用 Docker Compose 启动整个项目

### 前置要求
- Docker
- Docker Compose

### 快速启动

```bash
# 进入项目根目录
cd ess-platform

# 启动所有服务
docker-compose up

# 或在后台启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

### 访问应用
- **前端：** http://localhost:3000
- **后端：** http://localhost:5000
- **MongoDB：** localhost:27017
  - 用户名：root
  - 密码：password

### 常用命令

```bash
# 启动特定服务
docker-compose up mongodb
docker-compose up backend
docker-compose up frontend

# 构建镜像
docker-compose build

# 重建并启动
docker-compose up --build

# 查看运行的容器
docker-compose ps

# 进入容器 shell
docker-compose exec backend sh
docker-compose exec frontend sh

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# 删除所有容器和数据
docker-compose down -v
```

### 环境变量

在 `docker-compose.yml` 中修改：
```yaml
environment:
  JWT_SECRET: your_secret_here
  MONGODB_URI: mongodb://root:password@mongodb:27017/ess-platform
```

### 故障排查

#### 容器无法启动

```bash
# 查看错误日志
docker-compose logs backend

# 重新构建镜像
docker-compose build --no-cache

# 清除所有数据后重新启动
docker-compose down -v
docker-compose up --build
```

#### MongoDB 连接问题

```bash
# 检查 MongoDB 容器
docker-compose ps | grep mongodb

# 进入 MongoDB 容器
docker-compose exec mongodb mongosh -u root -p password

# 查看数据库
show dbs
```

#### 前后端无法通信

- 确保两个服务都在运行：`docker-compose ps`
- 检查网络：`docker-compose down && docker-compose up`
- 查看日志：`docker-compose logs`

---

更多 Docker 帮助查看官方文档：https://docs.docker.com
