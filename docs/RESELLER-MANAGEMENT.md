# 经销管理模块设计文档

## 1. 模块概述

经销管理模块是一个完整的经销商生命周期管理系统，包括：
- **经销商账户管理** - 创建、编辑、删除经销商账户
- **设备管理** - 管理所有设备库存及分配
- **权限管理** - 细粒度的权限控制系统
- **运维人员管理** - 经销商可管理自己的内部团队

## 2. 数据模型

### 2.1 经销商模型 (Reseller)

```javascript
{
  _id: ObjectId,
  name: String,              // 经销商名称 (必填, 唯一)
  code: String,              // 经销商代码 (必填, 唯一, 大写)
  description: String,       // 描述
  contactPerson: String,     // 联系人名称
  contactPhone: String,      // 联系电话
  contactEmail: String,      // 联系邮箱
  address: String,           // 地址
  adminId: ObjectId,         // 管理员用户ID (关联User)
  status: String,            // 状态: 'active', 'inactive', 'suspended'
  deviceCount: Number,       // 已分配设备数
  staffCount: Number,        // 员工数
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 设备模型 (Device)

```javascript
{
  _id: ObjectId,
  name: String,              // 设备名称
  code: String,              // 设备编码 (必填, 唯一)
  type: String,              // 类型: 'inverter', 'battery', 'charger', 'monitor', 'other'
  description: String,       // 描述
  specs: {
    model: String,           // 型号
    manufacturer: String,    // 制造商
    power: String,           // 功率
    voltage: String,         // 电压
    capacity: String         // 容量
  },
  manufacturerId: ObjectId,  // 制造商用户ID
  assignedReseller: ObjectId,// 分配的经销商ID
  status: String,            // 状态: 'available', 'assigned', 'inactive', 'maintenance'
  quantity: Number,          // 库存数量
  createdAt: Date,
  updatedAt: Date
}
```

### 2.3 运维人员模型 (ResellerStaff)

```javascript
{
  _id: ObjectId,
  username: String,          // 用户名 (必填)
  email: String,             // 邮箱 (必填, 唯一)
  password: String,          // 加密密码
  firstName: String,         // 名字
  lastName: String,          // 姓氏
  phone: String,             // 电话
  avatar: String,            // 头像URL
  resellerId: ObjectId,      // 所属经销商ID
  createdBy: ObjectId,       // 创建者用户ID
  role: String,              // 角色: 'technician', 'supervisor', 'manager'
  permissions: {
    canViewDevices: Boolean,
    canEditDevices: Boolean,
    canManageStaff: Boolean,
    canViewReports: Boolean,
    canManagePermissions: Boolean
  },
  status: String,            // 状态: 'active', 'inactive', 'suspended'
  createdAt: Date,
  updatedAt: Date
}
```

### 2.4 权限模型 (Permission)

```javascript
{
  _id: ObjectId,
  code: String,              // 权限编码 (必填, 唯一)
  name: String,              // 权限名称
  description: String,       // 描述
  category: String,          // 类别: 'reseller', 'device', 'staff', 'report', 'system'
  level: String,             // 级别: 'view', 'create', 'edit', 'delete', 'manage'
  createdAt: Date
}
```

## 3. API 端点设计

### 3.1 经销商管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/resellers` | 创建经销商 |
| GET | `/api/resellers` | 获取所有经销商 (分页) |
| GET | `/api/resellers/:id` | 获取经销商详情 |
| PUT | `/api/resellers/:id` | 更新经销商信息 |
| DELETE | `/api/resellers/:id` | 删除经销商 |
| POST | `/api/resellers/:resellerId/assign-devices` | 分配设备 |
| POST | `/api/resellers/:resellerId/unassign-devices` | 取消设备分配 |

### 3.2 设备管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/devices` | 创建设备 |
| GET | `/api/devices` | 获取所有设备 (分页, 可过滤) |
| GET | `/api/devices/:id` | 获取设备详情 |
| PUT | `/api/devices/:id` | 更新设备信息 |
| POST | `/api/devices/:id/assign` | 分配设备给经销商 |
| DELETE | `/api/devices/:id` | 删除设备 |
| GET | `/api/devices/reseller/:resellerId/devices` | 获取经销商的设备列表 |

### 3.3 运维人员管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/resellers/:resellerId/staff` | 添加员工 |
| GET | `/api/resellers/:resellerId/staff` | 获取员工列表 |
| GET | `/api/resellers/:resellerId/staff/:staffId` | 获取员工详情 |
| PUT | `/api/resellers/:resellerId/staff/:staffId` | 更新员工信息 |
| PUT | `/api/resellers/:resellerId/staff/:staffId/permissions` | 更新员工权限 |
| DELETE | `/api/resellers/:resellerId/staff/:staffId` | 删除员工 |

## 4. 权限管理系统

### 4.1 三层角色权限体系

#### 技术员 (Technician)
- ✅ 查看设备信息
- ✅ 查看报告
- ❌ 编辑设备
- ❌ 管理员工
- ❌ 管理权限

#### 主管 (Supervisor)
- ✅ 查看设备信息
- ✅ 编辑设备
- ✅ 查看报告
- ❌ 管理员工
- ❌ 管理权限

#### 经理 (Manager)
- ✅ 查看设备信息
- ✅ 编辑设备
- ✅ 管理员工
- ✅ 查看报告
- ✅ 管理权限

### 4.2 权限编码体系

- `RESELLER_VIEW` - 查看经销商信息
- `RESELLER_CREATE` - 创建经销商
- `RESELLER_EDIT` - 编辑经销商
- `DEVICE_VIEW` - 查看设备
- `DEVICE_EDIT` - 编辑设备
- `DEVICE_ASSIGN` - 分配设备
- `STAFF_VIEW` - 查看员工
- `STAFF_MANAGE` - 管理员工
- `PERMISSION_MANAGE` - 管理权限

## 5. 前端页面设计

### 5.1 经销商管理页面 (ResellerManagement.jsx)

**功能特点:**
- 经销商卡片网格展示
- 搜索过滤
- 创建/编辑/删除操作
- 快速查看设备数和员工数

**关键组件:**
- 经销商信息卡片
- 快速统计区域
- 创建/编辑模态框

### 5.2 设备管理页面 (DeviceManagement.jsx)

**功能特点:**
- 设备表格展示
- 按类型过滤
- 搜索功能
- 在线分配经销商
- 批量操作支持

**关键组件:**
- 设备列表表格
- 设备过滤器
- 分配下拉选择
- 规格显示

### 5.3 运维人员管理页面 (StaffManagement.jsx)

**功能特点:**
- 员工列表管理
- 角色快速选择
- 权限细粒度配置
- 搜索过滤

**关键组件:**
- 员工信息表格
- 角色选择器
- 权限配置界面
- 权限详细说明

## 6. 使用流程示例

### 6.1 创建经销商并分配设备

```
1. 进入经销商管理页面
2. 点击"新建经销商"按钮
3. 填写经销商信息 (名称、代码、联系信息等)
4. 保存创建
5. 进入设备管理页面
6. 选择要分配的设备
7. 在"分配经销商"下拉列表中选择刚创建的经销商
8. 设备状态自动变为"已分配"
```

### 6.2 经销商管理内部员工

```
1. 经销商管理员登录
2. 进入运维人员管理页面
3. 点击"添加员工"
4. 选择员工角色 (技术员/主管/经理)
5. 填写员工信息
6. 保存后可进一步调整权限
7. 点击权限按钮编辑特定权限
```

## 7. 安全考虑

- ✅ 所有API端点需要身份验证 (JWT)
- ✅ 经销商管理员只能管理自己的经销商
- ✅ 员工权限通过中间件严格控制
- ✅ 密码使用bcryptjs加密存储
- ✅ 敏感操作记录日志
- ✅ 支持角色级访问控制 (RBAC)

## 8. 数据库索引建议

```javascript
// Reseller
db.resellers.createIndex({ code: 1 })
db.resellers.createIndex({ adminId: 1 })
db.resellers.createIndex({ status: 1 })

// Device
db.devices.createIndex({ code: 1 })
db.devices.createIndex({ assignedReseller: 1 })
db.devices.createIndex({ type: 1 })

// ResellerStaff
db.resellerstaff.createIndex({ resellerId: 1 })
db.resellerstaff.createIndex({ email: 1 })
db.resellerstaff.createIndex({ role: 1 })
```

## 9. 扩展建议

1. **审计日志** - 记录所有关键操作
2. **报表模块** - 设备分配率、员工效率统计
3. **批量操作** - 支持批量导入/导出经销商和设备
4. **通知系统** - 设备分配、权限变更时通知
5. **API文档** - 使用Swagger自动生成API文档
6. **数据同步** - 与ERP系统集成

---

**最后更新**: 2026-01-09
