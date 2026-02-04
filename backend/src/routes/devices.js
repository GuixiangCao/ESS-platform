const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { auth } = require('../middleware/auth');

// 设备管理路由
router.post('/', auth, deviceController.createDevice);
router.get('/', auth, deviceController.getAllDevices);
router.get('/:id', auth, deviceController.getDeviceById);
router.put('/:id', auth, deviceController.updateDevice);
router.delete('/:id', auth, deviceController.deleteDevice);

// 分配设备
router.post('/:id/assign', auth, deviceController.assignDevice);

// 获取经销商的设备
router.get('/reseller/:resellerId/devices', auth, deviceController.getResellerDevices);

module.exports = router;
