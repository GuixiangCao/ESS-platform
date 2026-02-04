const express = require('express');
const router = express.Router();
const socDataController = require('../controllers/socDataController');
const { authenticateToken } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authenticateToken);

// POST /api/soc/correct-jumps - 触发SOC跳变修正
router.post('/correct-jumps', socDataController.correctJumps);

// GET /api/soc/check-correction/:stationId - 检查是否需要跳变修正
router.get('/check-correction/:stationId', socDataController.checkNeedCorrection);

// GET /api/soc/corrected/:stationId/:date - 获取修正后的SOC数据
router.get('/corrected/:stationId/:date', socDataController.getCorrectedSOCData);

module.exports = router;
