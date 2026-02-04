const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const chargingStrategyController = require('../controllers/chargingStrategyController');

// 所有路由都需要认证
router.use(auth);

// 获取所有充放电策略（分页、过滤、排序）
router.get('/', chargingStrategyController.getAllStrategies);

// 获取统计信息
router.get('/statistics', chargingStrategyController.getStatistics);

// 获取每日充放电时长统计
router.get('/daily-stats', chargingStrategyController.getDailyChargingStats);

// 根据电站 ID 获取策略
router.get('/station/:stationId', chargingStrategyController.getByStationId);

// 根据网关 ID 获取策略
router.get('/gateway/:gatewayId', chargingStrategyController.getByGatewayId);

// 获取指定电站和日期的策略
router.get('/station/:stationId/date/:date', chargingStrategyController.getByDate);

// 创建或更新充放电策略
router.post('/', chargingStrategyController.createOrUpdateStrategy);

// 批量创建或更新充放电策略
router.post('/batch', chargingStrategyController.batchCreateOrUpdate);

// 删除充放电策略（软删除）
router.delete('/:id', chargingStrategyController.deleteStrategy);

module.exports = router;
