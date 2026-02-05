# 经销管理模块 - 快速部署指南

## 📋 已完成的工作

### 后端实现
- ✅ 4个数据模型: `Reseller`, `Device`, `ResellerStaff`, `Permission`
- ✅ 3个控制器: `resellerController`, `deviceController`, `staffController`
- ✅ 3个路由文件: `resellers.js`, `devices.js`, `staff.js`
- ✅ 完整的CRUD操作和业务逻辑

### 前端实现
- ✅ 3个管理页面:
  - `ResellerManagement.jsx` - 经销商管理
  - `DeviceManagement.jsx` - 设备管理
  - `StaffManagement.jsx` - 运维人员管理
- ✅ 3个CSS样式文件 - 完整的Material Design 3风格
- ✅ 模态框、表格、卡片等组件

## 🚀 快速开始

### 1. 验证后端环境

```bash
cd /Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/backend

# 检查新添加的文件是否完整
ls src/models/  # 应该看到: Reseller.js, Device.js, ResellerStaff.js, Permission.js
ls src/controllers/  # 应该看到: resellerController.js, deviceController.js, staffController.js
ls src/routes/  # 应该看到: resellers.js, devices.js, staff.js
```

### 2. 启动后端服务

```bash
cd backend
npm run dev

# 正常启动输出:
# ✓ MongoDB connected
# Server running on port 5001
```

### 3. 验证前端页面

```bash
cd frontend

# 在 App.jsx 中添加新页面路由:
```

在 `/frontend/src/App.jsx` 中添加以下导入和路由:

```javascript
// 在导入部分添加:
import ResellerManagement from './pages/ResellerManagement';
import DeviceManagement from './pages/DeviceManagement';
import StaffManagement from './pages/StaffManagement';

// 在Routes中添加:
<Route path="/resellers" element={<ResellerManagement />} />
<Route path="/devices" element={<DeviceManagement />} />
<Route path="/staff" element={<StaffManagement />} />
```

### 4. 启动前端开发服务

```bash
cd frontend
npm run dev

# 访问本地地址
# http://localhost:3000/resellers
# http://localhost:3000/devices
# http://localhost:3000/staff
```

## 📊 API测试

### 使用 cURL 或 Postman 测试

#### 创建经销商
```bash
curl -X POST http://localhost:5001/api/resellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "南方经销商",
    "code": "RS001",
    "contactPerson": "张三",
    "contactPhone": "13800000001",
    "contactEmail": "zhangsan@example.com",
    "adminId": "USER_ID"
  }'
```

#### 创建设备
```bash
curl -X POST http://localhost:5001/api/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "5kW混合逆变器",
    "code": "DEV001",
    "type": "inverter",
    "specs": {
      "model": "HY5K-48",
      "manufacturer": "华阳",
      "power": "5kW",
      "voltage": "48V"
    }
  }'
```

#### 分配设备给经销商
```bash
curl -X POST http://localhost:5001/api/devices/DEVICE_ID/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resellerId": "RESELLER_ID"
  }'
```

#### 添加员工
```bash
curl -X POST http://localhost:5001/api/resellers/RESELLER_ID/staff \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhang_tech",
    "email": "zhang@example.com",
    "firstName": "张",
    "lastName": "三",
    "phone": "13800000001",
    "password": "secure_password",
    "role": "technician"
  }'
```

## 🔒 权限管理

### 角色权限对照表

| 权限 | 技术员 | 主管 | 经理 |
|------|--------|-------|-------|
| 查看设备 | ✅ | ✅ | ✅ |
| 编辑设备 | ❌ | ✅ | ✅ |
| 管理员工 | ❌ | ❌ | ✅ |
| 查看报告 | ✅ | ✅ | ✅ |
| 管理权限 | ❌ | ❌ | ✅ |

## 🎨 UI/UX特点

### Material Design 3集成
- ✅ 现代化卡片设计
- ✅ 流畅的过渡和动画
- ✅ 响应式布局 (移动/平板/桌面)
- ✅ 深色模式支持
- ✅ 无障碍设计

### 组件库
- lucide-react 图标库
- 自定义模态框
- 响应式表格
- 权限配置界面

## 📱 响应式设计

所有页面支持:
- 📱 移动设备 (< 480px)
- 📱 平板设备 (480px - 768px)
- 💻 桌面设备 (> 768px)

## 🔍 数据库设置

### 创建索引优化查询性能

```bash
# 连接MongoDB并执行
mongo ess-platform

# 创建索引
db.resellers.createIndex({ code: 1 })
db.resellers.createIndex({ adminId: 1 })
db.devices.createIndex({ code: 1 })
db.devices.createIndex({ assignedReseller: 1 })
db.resellerstaff.createIndex({ resellerId: 1 })
db.resellerstaff.createIndex({ email: 1 })
```

## 📄 文件结构

```
backend/
├── src/
│   ├── models/
│   │   ├── Reseller.js          ← 新
│   │   ├── Device.js            ← 新
│   │   ├── ResellerStaff.js      ← 新
│   │   └── Permission.js         ← 新
│   ├── controllers/
│   │   ├── resellerController.js ← 新
│   │   ├── deviceController.js   ← 新
│   │   └── staffController.js    ← 新
│   ├── routes/
│   │   ├── resellers.js          ← 新
│   │   ├── devices.js            ← 新
│   │   └── staff.js              ← 新
│   └── index.js                  ← 已更新

frontend/
├── src/
│   ├── pages/
│   │   ├── ResellerManagement.jsx ← 新
│   │   ├── DeviceManagement.jsx   ← 新
│   │   └── StaffManagement.jsx    ← 新
│   └── styles/
│       ├── ResellerManagement.css ← 新
│       ├── DeviceManagement.css   ← 新
│       └── StaffManagement.css    ← 新

根目录/
└── RESELLER-MANAGEMENT.md        ← 新 (设计文档)
```

## 🐛 常见问题

### Q1: 权限验证失败？
A: 确保在请求头中包含有效的JWT token
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Q2: 图表和样式没有正确显示？
A: 检查CSS文件是否正确导入:
```javascript
import '../styles/ResellerManagement.css';
```

### Q3: 数据保存失败？
A: 检查MongoDB连接:
```bash
# 验证MongoDB正在运行
brew services list | grep mongodb
```

## 🚀 下一步

1. **集成真实API** - 替换模拟数据为真实API调用
2. **添加图表** - 使用recharts展示统计数据
3. **导入/导出** - 支持Excel导入导出
4. **通知系统** - WebSocket实时通知
5. **审计日志** - 记录所有操作

## 📞 技术支持

遇到任何问题，检查:
1. 后端错误日志 - `npm run dev` 输出
2. 浏览器控制台 - F12 > Console
3. 网络请求 - F12 > Network
4. MongoDB日志 - `/usr/local/var/log/mongodb/mongo.log`

---

**最后更新**: 2026-01-09
