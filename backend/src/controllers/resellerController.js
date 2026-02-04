const Reseller = require('../models/Reseller');
const Device = require('../models/Device');
const ResellerStaff = require('../models/ResellerStaff');

// 创建经销商
exports.createReseller = async (req, res) => {
  try {
    const { name, code, description, contactPerson, contactPhone, contactEmail, address, adminId, parentResellerId } = req.body;

    // 检查经销商是否已存在
    const existingReseller = await Reseller.findOne({ $or: [{ name }, { code }] });
    if (existingReseller) {
      return res.status(400).json({ message: '经销商名称或代码已存在' });
    }

    // 如果有父经销商，验证父经销商是否存在
    if (parentResellerId) {
      const parentReseller = await Reseller.findById(parentResellerId);
      if (!parentReseller) {
        return res.status(404).json({ message: '父经销商不存在' });
      }
    }

    // 如果没有提供 adminId，使用当前用户的ID或创建临时ID
    const effectiveAdminId = adminId || req.user?.id || '000000000000000000000000';

    const reseller = new Reseller({
      name,
      code: code.toUpperCase(),
      description,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      adminId: effectiveAdminId,
      parentResellerId: parentResellerId || null
    });

    await reseller.save();

    // 更新父经销商的子经销商计数
    if (parentResellerId) {
      await Reseller.findByIdAndUpdate(parentResellerId, {
        $inc: { subResellerCount: 1 }
      });
    }

    res.status(201).json({
      message: '经销商创建成功',
      data: reseller
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取所有经销商
exports.getAllResellers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const resellers = await Reseller.find(query)
      .populate('adminId', 'username email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Reseller.countDocuments(query);

    res.status(200).json({
      data: resellers,
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

// 获取经销商详情
exports.getResellerById = async (req, res) => {
  try {
    const reseller = await Reseller.findById(req.params.id)
      .populate('adminId', 'username email phone');

    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    // 获取该经销商的设备和员工信息
    const devices = await Device.find({ assignedReseller: req.params.id });
    const staff = await ResellerStaff.find({ resellerId: req.params.id }, '-password');

    res.status(200).json({
      data: {
        ...reseller.toObject(),
        devices: devices.length,
        staff: staff.length,
        staffList: staff
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 更新经销商信息
exports.updateReseller = async (req, res) => {
  try {
    const { name, description, contactPerson, contactPhone, contactEmail, address, status } = req.body;

    const reseller = await Reseller.findByIdAndUpdate(
      req.params.id,
      { name, description, contactPerson, contactPhone, contactEmail, address, status },
      { new: true, runValidators: true }
    );

    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    res.status(200).json({
      message: '经销商信息更新成功',
      data: reseller
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 删除经销商
exports.deleteReseller = async (req, res) => {
  try {
    const reseller = await Reseller.findById(req.params.id);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    // 检查是否有子经销商
    const subResellerCount = await Reseller.countDocuments({ parentResellerId: req.params.id });
    if (subResellerCount > 0) {
      return res.status(400).json({
        message: '该经销商存在下级经销商，无法删除',
        details: { subResellerCount }
      });
    }

    // 检查是否有关联的设备和员工
    const deviceCount = await Device.countDocuments({ assignedReseller: req.params.id });
    const staffCount = await ResellerStaff.countDocuments({ resellerId: req.params.id });

    if (deviceCount > 0 || staffCount > 0) {
      return res.status(400).json({
        message: '该经销商存在关联的设备或员工，无法删除',
        details: { deviceCount, staffCount }
      });
    }

    // 更新父经销商的子经销商计数
    if (reseller.parentResellerId) {
      await Reseller.findByIdAndUpdate(reseller.parentResellerId, {
        $inc: { subResellerCount: -1 }
      });
    }

    await Reseller.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: '经销商删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 分配设备给经销商
exports.assignDevices = async (req, res) => {
  try {
    const { resellerId } = req.params;
    const { deviceIds, userId } = req.body;

    // 检查经销商是否存在
    const reseller = await Reseller.findById(resellerId);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    // 构建分配路径（包含祖先经销商）
    const ancestors = await reseller.getAncestors();
    const assignmentPath = [...ancestors.map(a => a._id), resellerId];

    // 更新设备的分配
    const devices = await Device.find({ _id: { $in: deviceIds } });

    for (const device of devices) {
      device.assignedReseller = resellerId;
      device.status = 'assigned';
      device.assignmentPath = assignmentPath;

      // 添加到分配历史
      device.assignmentHistory.push({
        resellerId,
        assignedAt: new Date(),
        assignedBy: userId
      });

      await device.save();
    }

    // 更新经销商的设备计数
    const deviceCount = await Device.countDocuments({ assignedReseller: resellerId });
    reseller.deviceCount = deviceCount;
    await reseller.save();

    res.status(200).json({
      message: '设备分配成功',
      data: { assignedCount: devices.length }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 取消分配设备
exports.unassignDevices = async (req, res) => {
  try {
    const { resellerId } = req.params;
    const { deviceIds } = req.body;

    // 更新设备状态
    const result = await Device.updateMany(
      { _id: { $in: deviceIds }, assignedReseller: resellerId },
      { assignedReseller: null, status: 'available' }
    );

    // 更新经销商的设备计数
    const reseller = await Reseller.findById(resellerId);
    if (reseller) {
      const deviceCount = await Device.countDocuments({ assignedReseller: resellerId });
      reseller.deviceCount = deviceCount;
      await reseller.save();
    }

    res.status(200).json({
      message: '设备取消分配成功',
      data: { unassignedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取经销商层级树
exports.getResellerTree = async (req, res) => {
  try {
    const { parentId } = req.query;
    const tree = await Reseller.buildTree(parentId || null);

    res.status(200).json({
      data: tree
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取经销商的子经销商
exports.getSubResellers = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDescendants } = req.query;

    const reseller = await Reseller.findById(id);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    let subResellers;
    if (includeDescendants === 'true') {
      subResellers = await reseller.getDescendants();
    } else {
      subResellers = await reseller.getChildren();
    }

    res.status(200).json({
      data: subResellers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取经销商的祖先路径
exports.getResellerAncestors = async (req, res) => {
  try {
    const { id } = req.params;

    const reseller = await Reseller.findById(id);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    const ancestors = await reseller.getAncestors();

    res.status(200).json({
      data: ancestors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 移动经销商到新的父级
exports.moveReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const { newParentId } = req.body;

    const reseller = await Reseller.findById(id);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    // 验证新父级
    if (newParentId) {
      const newParent = await Reseller.findById(newParentId);
      if (!newParent) {
        return res.status(404).json({ message: '新的父经销商不存在' });
      }

      // 防止循环引用：检查新父级是否是当前经销商的后代
      const descendants = await reseller.getDescendants();
      const descendantIds = descendants.map(d => d._id.toString());
      if (descendantIds.includes(newParentId)) {
        return res.status(400).json({ message: '不能将经销商移动到其后代下' });
      }
    }

    const oldParentId = reseller.parentResellerId;

    // 更新旧父级的子经销商计数
    if (oldParentId) {
      await Reseller.findByIdAndUpdate(oldParentId, {
        $inc: { subResellerCount: -1 }
      });
    }

    // 更新新父级的子经销商计数
    if (newParentId) {
      await Reseller.findByIdAndUpdate(newParentId, {
        $inc: { subResellerCount: 1 }
      });
    }

    // 更新经销商的父级
    reseller.parentResellerId = newParentId || null;
    await reseller.save();

    // 更新所有后代的层级信息
    const descendants = await reseller.getDescendants();
    for (const descendant of descendants) {
      await descendant.save();
    }

    res.status(200).json({
      message: '经销商移动成功',
      data: reseller
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

