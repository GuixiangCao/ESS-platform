const express = require('express');
const router = express.Router();
const stationGatewayController = require('../controllers/stationGatewayController');
const { auth } = require('../middleware/auth');

// 所有路由都需要身份验证
router.use(auth);

// GET /api/station-gateways - 获取所有电站网关映射（支持搜索、过滤和分页）
router.get('/', stationGatewayController.getAllStationGateways);

// GET /api/station-gateways/search - 搜索电站
router.get('/search', stationGatewayController.searchStations);

// GET /api/station-gateways/statistics - 获取统计信息
router.get('/statistics', stationGatewayController.getStatistics);

// GET /api/station-gateways/station/:stationId - 根据电站 ID 获取网关信息
router.get('/station/:stationId', stationGatewayController.getByStationId);

// GET /api/station-gateways/gateway/:gatewayId - 根据网关 ID 获取电站信息
router.get('/gateway/:gatewayId', stationGatewayController.getByGatewayId);

// POST /api/station-gateways - 创建或更新单个电站网关映射
router.post('/', stationGatewayController.createOrUpdateStationGateway);

// POST /api/station-gateways/batch - 批量创建或更新电站网关映射
router.post('/batch', stationGatewayController.batchCreateOrUpdate);

// DELETE /api/station-gateways/:stationId - 删除电站网关映射（软删除）
router.delete('/:stationId', stationGatewayController.deleteStationGateway);

module.exports = router;
