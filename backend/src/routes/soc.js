const express = require('express');
const router = express.Router();
const socController = require('../controllers/socController');
const socDataController = require('../controllers/socDataController');
const { auth } = require('../middleware/auth');

// 所有路由都需要认证
router.use(auth);

// 获取电站在指定日期的所有设备SOC数据
router.get('/station/:stationId/daily', socController.getStationSocData);

// 获取单个设备在指定日期范围的SOC数据
router.get('/device/:deviceId', socController.getDeviceSocData);

// 获取设备在特定时刻的SOC值
router.get('/device/:deviceId/at-time', socController.getDeviceSocAtTime);

// SOC跳变修正路由
router.post('/correct-jumps', socDataController.correctJumps);
router.get('/check-correction/:stationId', socDataController.checkNeedCorrection);
router.get('/corrected/:stationId/:date', socDataController.getCorrectedSOCData);

module.exports = router;
