#!/bin/bash

echo ""
echo "======================================"
echo "ESS Platform - 启动前检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -n "检查 Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗${NC} 未安装"
    echo "请访问 https://nodejs.org 安装 Node.js"
    exit 1
fi

# 检查 npm
echo -n "检查 npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} $NPM_VERSION"
else
    echo -e "${RED}✗${NC} 未安装"
    exit 1
fi

# 检查 MongoDB
echo -n "检查 MongoDB... "
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    MONGO_VERSION=$(mongosh --version 2>/dev/null || mongo --version 2>/dev/null)
    echo -e "${GREEN}✓${NC} 已安装"
else
    echo -e "${YELLOW}⚠${NC} 未找到 MongoDB CLI"
    echo "  注意：MongoDB 服务仍可能在运行，继续检查..."
fi

# 尝试连接 MongoDB
echo -n "连接 MongoDB 服务... "
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 已连接"
elif mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 已连接"
else
    echo -e "${RED}✗${NC} 连接失败"
    echo "  启动 MongoDB:"
    echo "    macOS: brew services start mongodb-community"
    echo "    其他:  请参考 TROUBLESHOOTING.md"
fi

# 检查后端目录
echo -n "检查后端项目... "
if [ -d "backend" ]; then
    echo -e "${GREEN}✓${NC} 目录存在"
    
    # 检查 .env
    echo -n "  检查 .env 配置... "
    if [ -f "backend/.env" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 不存在"
        echo "    从 .env.example 创建..."
        cp backend/.env.example backend/.env
    fi
    
    # 检查 node_modules
    echo -n "  检查后端依赖... "
    if [ -d "backend/node_modules" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 未安装"
        echo "    运行: cd backend && npm install"
    fi
else
    echo -e "${RED}✗${NC} 目录不存在"
fi

# 检查前端目录
echo -n "检查前端项目... "
if [ -d "frontend" ]; then
    echo -e "${GREEN}✓${NC} 目录存在"
    
    # 检查 node_modules
    echo -n "  检查前端依赖... "
    if [ -d "frontend/node_modules" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 未安装"
        echo "    运行: cd frontend && npm install"
    fi
else
    echo -e "${RED}✗${NC} 目录不存在"
fi

# 检查端口
echo -n "检查后端端口 5000... "
if lsof -i :5000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} 被占用"
    lsof -i :5000 | grep -v COMMAND
else
    echo -e "${GREEN}✓${NC} 空闲"
fi

echo -n "检查前端端口 3000... "
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} 被占用"
    lsof -i :3000 | grep -v COMMAND
else
    echo -e "${GREEN}✓${NC} 空闲"
fi

echo ""
echo "======================================"
echo "✓ 检查完成！"
echo ""
echo "下一步："
echo "1. 在终端1运行: cd backend && npm run dev"
echo "2. 在终端2运行: cd frontend && npm run dev"
echo "3. 访问: http://localhost:3000"
echo ""
echo "如遇到问题，请查看 TROUBLESHOOTING.md"
echo "======================================"
echo ""
