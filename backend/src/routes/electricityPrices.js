const express = require('express');
const router = express.Router();
const electricityPriceController = require('../controllers/electricityPriceController');
const { auth } = require('../middleware/auth');

// 所有路由都需要身份验证
router.use(auth);

// GET /api/electricity-prices - 获取电价列表（支持过滤和分页）
router.get('/', electricityPriceController.getAllPrices);

// GET /api/electricity-prices/options - 获取可用选项
router.get('/options', electricityPriceController.getAvailableOptions);

// GET /api/electricity-prices/stats - 获取电价统计
router.get('/stats', electricityPriceController.getPriceStats);

// GET /api/electricity-prices/by-date - 根据日期查询电价
router.get('/by-date', electricityPriceController.getPriceByDate);

// GET /api/electricity-prices/at-time - 获取特定时刻的电价
router.get('/at-time', electricityPriceController.getPriceAtTime);

// GET /api/electricity-prices/daily-curve - 获取全天电价曲线
router.get('/daily-curve', electricityPriceController.getDailyPriceCurve);

// GET /api/electricity-prices/:id - 获取单个电价记录
router.get('/:id', electricityPriceController.getPriceById);

module.exports = router;
