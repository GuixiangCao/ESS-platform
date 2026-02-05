# API 参考 - 经销管理模块

## 📋 快速查询表

### 🏢 经销商 API (Reseller)

#### 创建经销商
```
POST /api/resellers
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "南方经销商",
  "code": "RS001",
  "description": "华南地区经销商",
  "contactPerson": "张三",
  "contactPhone": "13800000001",
  "contactEmail": "zhangsan@example.com",
  "address": "广州市",
  "adminId": "USER_ID"
}

✅ 成功 (201):
{
  "message": "经销商创建成功",
  "data": { _id, name, code, ... }
}
```

#### 获取所有经销商
```
GET /api/resellers?page=1&limit=10&status=active&search=南方
Authorization: Bearer {token}

✅ 成功 (200):
{
  "data": [ { _id, name, code, ... } ],
  "pagination": { total, page, pages }
}
```

#### 获取经销商详情
```
GET /api/resellers/{resellerId}
Authorization: Bearer {token}

✅ 成功 (200):
{
  "data": {
    _id, name, code,
    devices: 15,
    staff: 5,
    staffList: [ ... ]
  }
}
```

#### 更新经销商
```
PUT /api/resellers/{resellerId}
Authorization: Bearer {token}

{
  "name": "更新的名称",
  "contactPerson": "李四",
  "status": "active"
}

✅ 成功 (200)
```

#### 删除经销商
```
DELETE /api/resellers/{resellerId}
Authorization: Bearer {token}

⚠️ 注: 必须先删除所有关联的设备和员工

✅ 成功 (200)
```

#### 分配设备给经销商
```
POST /api/resellers/{resellerId}/assign-devices
Authorization: Bearer {token}

{
  "deviceIds": ["device_id_1", "device_id_2"]
}

✅ 成功 (200):
{
  "message": "设备分配成功",
  "data": { assignedCount: 2 }
}
```

#### 取消分配设备
```
POST /api/resellers/{resellerId}/unassign-devices
Authorization: Bearer {token}

{
  "deviceIds": ["device_id_1"]
}

✅ 成功 (200)
```

---

### 📦 设备 API (Device)

#### 创建设备
```
POST /api/devices
Authorization: Bearer {token}

{
  "name": "5kW混合逆变器",
  "code": "DEV001",
  "type": "inverter",
  "description": "48V离网混合逆变器",
  "specs": {
    "model": "HY5K-48",
    "manufacturer": "华阳",
    "power": "5kW",
    "voltage": "48V",
    "capacity": "5kWh"
  },
  "manufacturerId": "USER_ID",
  "quantity": 10
}

✅ 成功 (201)
```

#### 获取所有设备
```
GET /api/devices?page=1&limit=10&type=inverter&status=available&search=5kW
Authorization: Bearer {token}

✅ 成功 (200):
{
  "data": [ { _id, name, code, type, ... } ],
  "pagination": { total, page, pages }
}
```

#### 获取设备详情
```
GET /api/devices/{deviceId}
Authorization: Bearer {token}

✅ 成功 (200)
```

#### 更新设备信息
```
PUT /api/devices/{deviceId}
Authorization: Bearer {token}

{
  "name": "新名称",
  "specs": { model: "新型号" }
}

✅ 成功 (200)
```

#### 分配设备给经销商
```
POST /api/devices/{deviceId}/assign
Authorization: Bearer {token}

{
  "resellerId": "RESELLER_ID"
}

✅ 成功 (200)
```

#### 删除设备
```
DELETE /api/devices/{deviceId}
Authorization: Bearer {token}

✅ 成功 (200)
```

#### 获取经销商的设备
```
GET /api/devices/reseller/{resellerId}/devices?page=1&limit=10
Authorization: Bearer {token}

✅ 成功 (200)
```

---

### 👥 运维人员 API (Staff)

#### 添加员工
```
POST /api/resellers/{resellerId}/staff
Authorization: Bearer {token}

{
  "username": "zhang_tech",
  "email": "zhang@example.com",
  "firstName": "张",
  "lastName": "三",
  "phone": "13800000001",
  "password": "secure_password",
  "role": "technician"  // technician, supervisor, manager
}

✅ 成功 (201):
{
  "message": "员工添加成功",
  "data": { _id, username, role, permissions, ... }
}
```

#### 获取员工列表
```
GET /api/resellers/{resellerId}/staff?page=1&limit=10&role=technician&status=active
Authorization: Bearer {token}

✅ 成功 (200):
{
  "data": [ { _id, username, email, role, ... } ],
  "pagination": { total, page, pages }
}
```

#### 获取员工详情
```
GET /api/resellers/{resellerId}/staff/{staffId}
Authorization: Bearer {token}

✅ 成功 (200):
{
  "data": {
    _id, username, email, role,
    permissions: { ... }
  }
}
```

#### 更新员工信息
```
PUT /api/resellers/{resellerId}/staff/{staffId}
Authorization: Bearer {token}

{
  "firstName": "新名字",
  "phone": "13900000001",
  "role": "supervisor",
  "status": "active"
}

✅ 成功 (200)
```

#### 更新员工权限
```
PUT /api/resellers/{resellerId}/staff/{staffId}/permissions
Authorization: Bearer {token}

{
  "permissions": {
    "canViewDevices": true,
    "canEditDevices": true,
    "canManageStaff": false,
    "canViewReports": true,
    "canManagePermissions": false
  }
}

✅ 成功 (200)
```

#### 删除员工
```
DELETE /api/resellers/{resellerId}/staff/{staffId}
Authorization: Bearer {token}

✅ 成功 (200)
```

---

## 🔍 常见查询参数

### 分页
```
?page=1&limit=10
```

### 搜索
```
?search=关键词
```

### 过滤
```
?status=active|inactive|suspended
?type=inverter|battery|charger|monitor|other
?role=technician|supervisor|manager
```

### 组合
```
GET /api/devices?page=1&limit=20&type=inverter&search=5kW&status=available
```

---

## 📊 响应状态码

| 状态码 | 含义 |
|--------|------|
| 200 | ✅ 成功 |
| 201 | ✅ 创建成功 |
| 400 | ❌ 请求错误 |
| 404 | ❌ 不存在 |
| 500 | ❌ 服务器错误 |

---

## 🔐 权限

所有API都需要有效的JWT Token:

```javascript
headers: {
  'Authorization': 'Bearer eyJhbGc...'
}
```

---

## 📱 前端调用示例

### 使用 fetch
```javascript
// 获取经销商列表
const response = await fetch('/api/resellers?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

### 使用 axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001'
});

api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return config;
});

// 创建经销商
const response = await api.post('/api/resellers', {
  name: '南方经销商',
  code: 'RS001',
  ...
});
```

---

## 🧪 测试命令

### 使用 cURL

```bash
# 创建经销商
curl -X POST http://localhost:5001/api/resellers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "南方经销商",
    "code": "RS001",
    "contactPerson": "张三",
    "contactPhone": "13800000001",
    "contactEmail": "zhangsan@example.com",
    "adminId": "USER_ID"
  }'

# 获取经销商列表
curl http://localhost:5001/api/resellers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建设备
curl -X POST http://localhost:5001/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "5kW混合逆变器",
    "code": "DEV001",
    "type": "inverter"
  }'
```

---

## 💾 数据模型示例

### Reseller 示例
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  name: "南方经销商",
  code: "RS001",
  description: "华南地区经销商",
  contactPerson: "张三",
  contactPhone: "13800000001",
  contactEmail: "zhangsan@example.com",
  address: "广州市",
  adminId: "507f1f77bcf86cd799439012",
  status: "active",
  deviceCount: 15,
  staffCount: 5,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-09T10:30:00Z"
}
```

### Device 示例
```javascript
{
  _id: "507f1f77bcf86cd799439013",
  name: "5kW混合逆变器",
  code: "DEV001",
  type: "inverter",
  description: "48V离网混合逆变器",
  specs: {
    model: "HY5K-48",
    manufacturer: "华阳",
    power: "5kW",
    voltage: "48V",
    capacity: "5kWh"
  },
  assignedReseller: "507f1f77bcf86cd799439011",
  status: "assigned",
  quantity: 10,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-09T10:30:00Z"
}
```

### ResellerStaff 示例
```javascript
{
  _id: "507f1f77bcf86cd799439014",
  username: "zhang_tech",
  email: "zhang@example.com",
  firstName: "张",
  lastName: "三",
  phone: "13800000001",
  resellerId: "507f1f77bcf86cd799439011",
  createdBy: "507f1f77bcf86cd799439012",
  role: "technician",
  permissions: {
    canViewDevices: true,
    canEditDevices: false,
    canManageStaff: false,
    canViewReports: true,
    canManagePermissions: false
  },
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-09T10:30:00Z"
}
```

---

**API参考完成！** 所有端点都已列出，可以直接使用。

---

**最后更新**: 2026-01-09
