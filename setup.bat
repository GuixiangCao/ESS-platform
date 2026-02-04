@echo off
REM ESS Platform - 项目初始化脚本 (Windows)

echo.
echo ======================================
echo ESS Platform - 项目初始化脚本
echo ======================================

REM 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo OK Node.js 版本: %NODE_VERSION%

REM 后端设置
echo.
echo 设置后端...
cd backend
call npm install
echo OK 后端依赖安装完成

if not exist .env (
    copy .env.example .env
    echo OK 已创建 .env 文件，请编辑配置
)

cd ..

REM 前端设置
echo.
echo 设置前端...
cd frontend
call npm install
echo OK 前端依赖安装完成

cd ..

echo.
echo ======================================
echo OK 初始化完成！
echo.
echo 后续步骤:
echo 1. 编辑 backend/.env 配置 MongoDB 和 JWT
echo 2. 在终端1运行: cd backend ^&^& npm run dev
echo 3. 在终端2运行: cd frontend ^&^& npm run dev
echo 4. 打开浏览器访问: http://localhost:3000
echo ======================================
echo.
pause
