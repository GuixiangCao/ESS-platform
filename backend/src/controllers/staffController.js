const ResellerStaff = require('../models/ResellerStaff');
const Reseller = require('../models/Reseller');
const bcrypt = require('bcryptjs');

// 添加员工
exports.addStaff = async (req, res) => {
  try {
    const { username, email, firstName, lastName, phone, password, role } = req.body;
    const { resellerId } = req.params;

    // 检查经销商是否存在
    const reseller = await Reseller.findById(resellerId);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    // 检查邮箱是否已存在
    const existingStaff = await ResellerStaff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: '邮箱已被使用' });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = new ResellerStaff({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
      resellerId,
      createdBy: req.user._id,
      permissions: getDefaultPermissions(role)
    });

    await staff.save();

    // 更新经销商的员工计数
    const staffCount = await ResellerStaff.countDocuments({ resellerId });
    reseller.staffCount = staffCount;
    await reseller.save();

    res.status(201).json({
      message: '员工添加成功',
      data: staff
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取经销商的所有员工
exports.getResellerStaff = async (req, res) => {
  try {
    const { resellerId } = req.params;
    const { page = 1, limit = 10, role, status } = req.query;

    let query = { resellerId };
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const staff = await ResellerStaff.find(query, '-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await ResellerStaff.countDocuments(query);

    res.status(200).json({
      data: staff,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取员工详情
exports.getStaffById = async (req, res) => {
  try {
    const staff = await ResellerStaff.findById(req.params.staffId, '-password')
      .populate('resellerId', 'name code')
      .populate('createdBy', 'username email');

    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    res.status(200).json({ data: staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 更新员工信息
exports.updateStaff = async (req, res) => {
  try {
    const { firstName, lastName, phone, role, status } = req.body;
    const { staffId } = req.params;

    const staff = await ResellerStaff.findByIdAndUpdate(
      staffId,
      { firstName, lastName, phone, role, status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    res.status(200).json({
      message: '员工信息更新成功',
      data: staff
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 更新员工权限
exports.updateStaffPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const { staffId } = req.params;

    const staff = await ResellerStaff.findByIdAndUpdate(
      staffId,
      { permissions },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    res.status(200).json({
      message: '员工权限更新成功',
      data: staff
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 删除员工
exports.deleteStaff = async (req, res) => {
  try {
    const { staffId, resellerId } = req.params;

    const staff = await ResellerStaff.findByIdAndDelete(staffId);

    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    // 更新经销商的员工计数
    const reseller = await Reseller.findById(resellerId);
    if (reseller) {
      const staffCount = await ResellerStaff.countDocuments({ resellerId });
      reseller.staffCount = staffCount;
      await reseller.save();
    }

    res.status(200).json({ message: '员工删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取默认权限配置
function getDefaultPermissions(role) {
  const defaultPermissions = {
    canViewDevices: true,
    canEditDevices: false,
    canManageStaff: false,
    canViewReports: true,
    canManagePermissions: false
  };

  switch (role) {
    case 'technician':
      return defaultPermissions;
    case 'supervisor':
      return {
        ...defaultPermissions,
        canEditDevices: true,
        canViewReports: true
      };
    case 'manager':
      return {
        ...defaultPermissions,
        canEditDevices: true,
        canManageStaff: true,
        canViewReports: true,
        canManagePermissions: true
      };
    default:
      return defaultPermissions;
  }
}
