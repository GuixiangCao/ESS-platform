#!/bin/bash

# ESS Platform - 诊断脚本
# 检查系统状态和常见问题

echo "======================================"
echo "🔍 ESS Platform 诊断工具"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查函数
check_status() {
    local name=$1
    local command=$2
    
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓ $name 已安装${NC}"
        return 0
    else
        echo -e "${RED}✗ $name 未安装或不可用${NC}"
        return 1
    fi
}

# 1. 检查 Node.js 和 npm
echo -e "${BLUE}1. 检查 Node.js 环境${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
else
    echo -e "${RED}✗ Node.js 未安装${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"
else
    echo -e "${RED}✗ npm 未安装${NC}"
fi

# 2. 检查 MongoDB
echo ""
echo -e "${BLUE}2. 检查 MongoDB${NC}"

if command -v mongosh &> /dev/null; then
    echo -e "${GREEN}✓ mongosh 已安装${NC}"
else
    echo -e "${YELLOW}⚠️  mongosh 未安装（可选）${NC}"
fi

if command -v mongo &> /dev/null; then
    echo -e "${GREEN}✓ mongo 已安装${NC}"
else
    echo -e "${YELLOW}⚠️  mongo 未安装（可选）${NC}"
fi

# 测试 MongoDB 连接
if mongosh --eval "db.adminCommand('ping')" &> /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB 正在运行 (localhost:27017)${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB 未响应${NC}"
    echo "   启动方式:"
    echo "   - brew services start mongodb-community"
    echo "   - docker run -d -p 27017:27017 mongo:latest"
fi

# 3. 检查端口占用
echo ""
echo -e "${BLUE}3. 检查端口占用${NC}"

check_port() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        local cmd=$(ps -p $pid -o comm=)
        echo -e "${YELLOW}⚠️  端口 $port ($name) 已被占用 - 进程: $cmd (PID: $pid)${NC}"
    else
        echo -e "${GREEN}✓ 端口 $port ($name) 可用${NC}"
    fi
}

check_port 3000 "前端"
check_port 5000 "后端"
check_port 27017 "MongoDB"

# 4. 检查依赖安装
echo ""
echo -e "${BLUE}4. 检查依赖安装${NC}"

check_dir_deps() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir/node_modules" ]; then
        local count=$(ls -1 "$dir/node_modules" 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ $name 依赖已安装 ($count 个包)${NC}"
    else
        echo -e "${RED}✗ $name 依赖未安装${NC}"
        echo "   运行: cd $dir && npm install"
    fi
}

check_dir_deps "backend" "后端"
check_dir_deps "frontend" "前端"

# 5. 检查环境文件
echo ""
echo -e "${BLUE}5. 检查环境配置${NC}"

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ backend/.env 存在${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env 不存在${NC}"
    if [ -f "backend/.env.example" ]; then
        echo "   运行: cd backend && cp .env.example .env"
    fi
fi

if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✓ frontend/.env 存在${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env 不存在（可选）${NC}"
fi

# 6. 检查 Git
echo ""
echo -e "${BLUE}6. 检查 Git${NC}"

if command -v git &> /dev/null; then
    echo -e "${GREEN}✓ Git 已安装 (版本: $(git --version | awk '{print $3}'))${NC}"
    
    if [ -d ".git" ]; then
        echo -e "${GREEN}✓ 这是一个 Git 仓库${NC}"
    else
        echo -e "${YELLOW}⚠️  不是一个 Git 仓库${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Git 未安装（可选）${NC}"
fi

# 7. 系统信息
echo ""
echo -e "${BLUE}7. 系统信息${NC}"
echo "OS: $(uname -s)"
echo "Arch: $(uname -m)"
echo "Free Memory: $(vm_stat 2>/dev/null | grep 'Pages free' | awk '{print $3}' || echo '未知')"

# 8. 快速检查清单
echo ""
echo "======================================"
echo "📋 快速检查清单"
echo "======================================"
echo ""

ISSUES=0

# 检查关键依赖
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    ((ISSUES++))
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    ((ISSUES++))
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${RED}❌ 后端依赖未安装${NC}"
    echo "   运行: cd backend && npm install"
    ((ISSUES++))
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}❌ 前端依赖未安装${NC}"
    echo "   运行: cd frontend && npm install"
    ((ISSUES++))
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  后端环境配置缺失${NC}"
    echo "   运行: cd backend && cp .env.example .env"
fi

# 总结
echo ""
echo "======================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo ""
    echo "现在可以启动服务:"
    echo "  Terminal 1: cd backend && npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
else
    echo -e "${RED}⚠️  发现 $ISSUES 个问题，需要修复${NC}"
fi
echo "======================================"
echo ""

# 9. 快速修复建议
echo -e "${BLUE}快速修复建议${NC}"
echo ""
echo "如果启动失败，按顺序尝试:"
echo "1. npm install -- 重装所有依赖"
echo "2. npm run dev -- 在不同终端中启动"
echo "3. 检查 MongoDB 是否运行"
echo "4. 检查端口 3000 和 5000 是否被占用"
echo "5. 查看详细错误日志"
echo ""

echo "更多帮助请查看 TROUBLESHOOTING.md 或 FIX-NODEMON-CRASH.md"
