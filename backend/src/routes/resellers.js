const express = require('express');
const router = express.Router();
const resellerController = require('../controllers/resellerController');
const { auth } = require('../middleware/auth');

// 经销商管理路由
router.post('/', auth, resellerController.createReseller);
router.get('/', auth, resellerController.getAllResellers);
router.get('/:id', auth, resellerController.getResellerById);
router.put('/:id', auth, resellerController.updateReseller);
router.delete('/:id', auth, resellerController.deleteReseller);

// 层级管理路由
router.get('/tree/hierarchy', auth, resellerController.getResellerTree);
router.get('/:id/sub-resellers', auth, resellerController.getSubResellers);
router.get('/:id/ancestors', auth, resellerController.getResellerAncestors);
router.put('/:id/move', auth, resellerController.moveReseller);

// 设备分配路由
router.post('/:resellerId/assign-devices', auth, resellerController.assignDevices);
router.post('/:resellerId/unassign-devices', auth, resellerController.unassignDevices);

module.exports = router;
