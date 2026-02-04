#!/bin/bash

echo ""
echo "======================================"
echo "ESS Platform - 前端启动助手"
echo "======================================"
echo ""

# 确保在 frontend 目录中
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请从项目根目录运行此脚本"
    echo "用法: cd frontend && bash ../start-frontend.sh"
    exit 1
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

echo "✓ 启动前端服务..."
echo ""
echo "应用将运行在: http://localhost:3000"
echo "请确保后端服务运行在: http://localhost:5000"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm run dev
