# 🔧 修复端口冲突问题

## 问题
5000 端口被 macOS 的 AirPlay Receiver 服务占用,导致后端无法启动。

## 解决方案1: 关闭 AirPlay Receiver (推荐)

### 步骤:
1. 打开 **系统设置 (System Settings)**
2. 点击 **通用 (General)**
3. 点击 **隔空播放与接力 (AirDrop & Handoff)**
4. 找到 **隔空播放接收器 (AirPlay Receiver)**
5. 关闭它或者将端口改为其他端口

### 或者通过命令行:
```bash
# 查看 AirPlay 状态
sudo launchctl list | grep AirPlay

# 临时停止 (重启后会恢复)
sudo launchctl stop com.apple.AirPlayXPCHelper
```

关闭后,重新启动后端服务:
```bash
cd backend
npm run dev
```

---

## 解决方案2: 修改后端端口为 5001

如果不想关闭 AirPlay,可以改用其他端口。

### 需要修改的文件:

1. **backend/.env**
   ```
   PORT=5001
   ```

2. **frontend/vite.config.js**
   ```javascript
   proxy: {
     '/api': {
       target: 'http://localhost:5001',  // 改为 5001
       changeOrigin: true
     }
   }
   ```

然后重启两个服务。

---

## 推荐方案1

方案1更简单,只需要在系统设置中关闭 AirPlay Receiver 即可,不需要修改代码。

关闭后请重新运行:
```bash
cd backend
npm run dev
```

应该看到:
```
Server running on port 5000
✓ MongoDB connected
```
