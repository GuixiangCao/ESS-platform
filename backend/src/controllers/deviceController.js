const Device = require('../models/Device');
const Reseller = require('../models/Reseller');

// 创建设备
exports.createDevice = async (req, res) => {
  try {
    const { name, code, type, description, specs, manufacturerId } = req.body;

    const existingDevice = await Device.findOne({ code });
    if (existingDevice) {
      return res.status(400).json({ message: '设备编码已存在' });
    }

    const device = new Device({
      name,
      code: code.toUpperCase(),
      type,
      description,
      specs,
      manufacturerId,
      status: 'available'
    });

    await device.save();

    res.status(201).json({
      message: '设备创建成功',
      data: device
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取所有设备
exports.getAllDevices = async (req, res) => {
  try {
    const { status, assignedReseller, page = 1, limit = 10, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (assignedReseller) query.assignedReseller = assignedReseller;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const devices = await Device.find(query)
      .populate('assignedReseller', 'name code')
      .populate('manufacturerId', 'username email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Device.countDocuments(query);

    res.status(200).json({
      data: devices,
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

// 获取设备详情
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id)
      .populate('assignedReseller', 'name code contactPerson contactPhone')
      .populate('manufacturerId', 'username email');

    if (!device) {
      return res.status(404).json({ message: '设备不存在' });
    }

    res.status(200).json({ data: device });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 更新设备信息
exports.updateDevice = async (req, res) => {
  try {
    const { name, type, description, specs, status } = req.body;

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { name, type, description, specs, status },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ message: '设备不存在' });
    }

    res.status(200).json({
      message: '设备信息更新成功',
      data: device
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 分配设备给经销商
exports.assignDevice = async (req, res) => {
  try {
    const { resellerId } = req.body;

    // 检查经销商是否存在
    const reseller = await Reseller.findById(resellerId);
    if (!reseller) {
      return res.status(404).json({ message: '经销商不存在' });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { assignedReseller: resellerId, status: 'assigned' },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: '设备不存在' });
    }

    // 更新经销商的设备计数
    const deviceCount = await Device.countDocuments({ assignedReseller: resellerId });
    reseller.deviceCount = deviceCount;
    await reseller.save();

    res.status(200).json({
      message: '设备分配成功',
      data: device
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 删除设备
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: '设备不存在' });
    }

    // 如果设备已分配，先取消分配
    if (device.assignedReseller) {
      const reseller = await Reseller.findById(device.assignedReseller);
      if (reseller) {
        reseller.deviceCount = Math.max(0, reseller.deviceCount - 1);
        await reseller.save();
      }
    }

    await Device.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: '设备删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 获取经销商的设备
exports.getResellerDevices = async (req, res) => {
  try {
    const { resellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const devices = await Device.find({ assignedReseller: resellerId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Device.countDocuments({ assignedReseller: resellerId });

    res.status(200).json({
      data: devices,
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
