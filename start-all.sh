#!/bin/bash

# ESS Platform - 完整启动脚本
# 启动 MongoDB、后端和前端服务

set -e  # Exit on error

echo "======================================"
echo "🚀 ESS Platform - 启动所有服务"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取当前目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"

# 检查 MongoDB
echo ""
echo "🔍 检查 MongoDB..."

if command -v mongosh &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB 已安装${NC}"
    
    # 尝试连接
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        echo -e "${GREEN}✓ MongoDB 正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB 未运行，请在另一个终端启动:${NC}"
        echo "   brew services start mongodb-community"
        echo ""
        read -p "继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB 未检测到，请先安装或使用 Docker:${NC}"
    echo "   docker run --name mongodb -d -p 27017:27017 mongo:latest"
    echo ""
    read -p "继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 启动后端
echo ""
echo "🔧 启动后端服务..."
echo -e "${YELLOW}在新窗口中启动后端: cd backend && npm run dev${NC}"
echo ""

# 在后台启动后端（可选）
cd "$SCRIPT_DIR/backend"

if [ "$1" == "--detach" ]; then
    npm run dev > backend.log 2>&1 &
    echo -e "${GREEN}✓ 后端在后台运行，日志: backend.log${NC}"
    sleep 2
else
    echo "提示: 使用 'npm run backend' 在新终端启动后端"
    echo ""
fi

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd "$SCRIPT_DIR/frontend"

if [ "$1" == "--detach" ]; then
    npm run dev > frontend.log 2>&1 &
    echo -e "${GREEN}✓ 前端在后台运行，日志: frontend.log${NC}"
    sleep 2
else
    echo "提示: 使用 'npm run frontend' 在新终端启动前端"
    echo ""
fi

# 显示总结
echo ""
echo "======================================"
echo "📌 服务启动指南"
echo "======================================"
echo ""
echo "在三个不同的终端中运行:"
echo ""
echo "Terminal 1 - 后端服务 (端口 5000):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 - 前端服务 (端口 3000):"
echo "  cd frontend && npm run dev"
echo ""
echo "Terminal 3 - MongoDB (如果需要):"
echo "  brew services start mongodb-community"
echo "  或"
echo "  docker run --name mongodb -d -p 27017:27017 mongo:latest"
echo ""
echo "======================================"
echo "🌐 访问应用"
echo "======================================"
echo -e "${GREEN}前端: http://localhost:3000${NC}"
echo -e "${GREEN}后端: http://localhost:5000${NC}"
echo -e "${GREEN}MongoDB: localhost:27017${NC}"
echo ""
echo "======================================"
echo "🛑 停止服务"
echo "======================================"
echo "按 Ctrl+C 停止各个服务"
echo ""

# 如果使用 --detach 模式，显示停止说明
if [ "$1" == "--detach" ]; then
    echo "停止后台服务:"
    echo "  pkill -f 'npm run dev'"
    echo ""
fi

echo "祝您使用愉快！ 🚀"
