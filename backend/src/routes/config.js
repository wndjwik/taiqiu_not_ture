const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// 获取单个配置项
router.get('/:config_key', configController.getConfig);

// 设置配置项
router.post('/', configController.setConfig);

// 获取收银台位置
router.get('/cashier/position', configController.getCashierPosition);

// 更新球桌布局（包含收银台位置）
router.post('/table-layout', configController.updateTableLayoutWithCashier);

module.exports = router;