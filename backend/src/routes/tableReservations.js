const express = require('express');
const router = express.Router();
const tableReservationController = require('../controllers/tableReservationController');
const auth = require('../config/auth'); // 假设已有的认证中间件

// 创建预订
router.post('/', auth, tableReservationController.createReservation);

// 获取预订列表
router.get('/', auth, tableReservationController.getReservations);

// 取消预订
router.put('/cancel/:reservation_id', auth, tableReservationController.cancelReservation);

// 标记预订到店
router.put('/arrived/:reservation_id', auth, tableReservationController.markArrived);

module.exports = router;