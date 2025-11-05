const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const auth = require('../config/auth'); // 假设已有的认证中间件

// 获取所有球桌
router.get('/', auth, tableController.getAllTables);

// 添加新球桌
router.post('/', auth, tableController.addTable);

// 更新球桌信息
router.put('/:table_id', auth, tableController.updateTable);

// 删除球桌
router.delete('/:table_id', auth, tableController.deleteTable);

// 更新球桌布局
router.post('/layout', auth, tableController.updateTableLayout);

// 获取球桌实时状态
router.get('/status', tableController.getTableStatus);

module.exports = router;