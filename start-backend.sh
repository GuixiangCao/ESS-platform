#!/bin/bash

echo ""
echo "======================================"
echo "ESS Platform - 后端启动助手"
echo "======================================"
echo ""

# 确保在 backend 目录中
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请从项目根目录运行此脚本"
    echo "用法: cd backend && bash ../start-backend.sh"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 创建..."
    cp .env.example .env
    echo "✓ .env 已创建，请根据需要编辑配置"
    echo ""
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install 失败"
        exit 1
    fi
    echo "✓ 依赖安装完成"
    echo ""
fi

# 检查 MongoDB 连接
echo "检查 MongoDB 连接..."
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✓ MongoDB 已连接"
elif mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✓ MongoDB 已连接"
else
    echo ""
    echo "⚠️  ⚠️  ⚠️  MongoDB 连接失败! ⚠️  ⚠️  ⚠️"
    echo ""
    echo "请启动 MongoDB 服务："
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew services start mongodb-community"
    echo ""
    echo "macOS (Intel/M1/M2):"
    echo "  brew services start mongodb-community"
    echo ""
    echo "Windows:"
    echo "  net start MongoDB"
    echo ""
    echo "Linux (Ubuntu/Debian):"
    echo "  sudo systemctl start mongod"
    echo ""
    echo "或使用 Docker:"
    echo "  docker run --name mongodb -d -p 27017:27017 mongo:latest"
    echo ""
    read -p "按 Enter 继续或 Ctrl+C 停止..."
fi

echo ""
echo "✓ 启动后端服务..."
echo ""
echo "服务将运行在: http://localhost:5000"
echo "API 文档: http://localhost:5000/api/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm run dev
