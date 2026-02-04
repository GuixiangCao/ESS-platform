#!/bin/bash

echo "======================================"
echo "ESS Platform - 项目初始化脚本"
echo "======================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "[OK] Node.js 版本: $(node -v)"

# 后端设置
echo ""
echo "[SETUP] 设置后端..."
cd backend
npm install
echo "[OK] 后端依赖安装完成"

# 创建 .env 文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] 已创建 .env 文件，请编辑配置"
fi

cd ..

# 前端设置
echo ""
echo "[SETUP] 设置前端..."
cd frontend
npm install
echo "[OK] 前端依赖安装完成"

cd ..

echo ""
echo "======================================"
echo "[SUCCESS] 初始化完成！"
echo ""
echo "后续步骤:"
echo ""
echo "[1] 配置后端环境变量"
echo "    编辑 backend/.env 配置 MongoDB 和 JWT"
echo ""
echo "[2] 启动 MongoDB（三选一）"
echo "    Option A - Docker 容器 (推荐):"
echo "      docker run --name mongodb -d -p 27017:27017 mongo:latest"
echo ""
echo "    Option B - macOS (Homebrew):"
echo "      brew services start mongodb-community"
echo ""
echo "    Option C - Docker Compose:"
echo "      docker-compose up mongodb -d"
echo ""
echo "[3] 启动后端服务"
echo "    在终端1: cd backend && npm run dev"
echo "    应该看到: '[OK] MongoDB connected'"
echo ""
echo "[4] 启动前端服务"
echo "    在终端2: cd frontend && npm run dev"
echo ""
echo "[5] 打开浏览器"
echo "    访问: http://localhost:3000"
echo ""
echo "======================================"
