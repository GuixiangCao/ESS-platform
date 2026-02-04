const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { auth } = require('../middleware/auth');

// 员工管理路由
router.post('/:resellerId/staff', auth, staffController.addStaff);
router.get('/:resellerId/staff', auth, staffController.getResellerStaff);
router.get('/:resellerId/staff/:staffId', auth, staffController.getStaffById);
router.put('/:resellerId/staff/:staffId', auth, staffController.updateStaff);
router.put('/:resellerId/staff/:staffId/permissions', auth, staffController.updateStaffPermissions);
router.delete('/:resellerId/staff/:staffId', auth, staffController.deleteStaff);

module.exports = router;
