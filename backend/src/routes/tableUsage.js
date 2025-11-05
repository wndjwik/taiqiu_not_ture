const express = require('express');
const router = express.Router();
const tableUsageController = require('../controllers/tableUsageController');
const auth = require('../config/auth'); // 假设已有的认证中间件

// 开台
router.post('/open', auth, tableUsageController.openTable);

// 结台
router.post('/close', auth, tableUsageController.closeTable);

// 获取开台记录
router.get('/', auth, tableUsageController.getTableUsages);

// 取消开台
router.put('/cancel/:usage_id', auth, tableUsageController.cancelTableUsage);

module.exports = router;