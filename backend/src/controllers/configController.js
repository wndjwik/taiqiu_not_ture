const Config = require('../models/Config');

// 获取配置项
exports.getConfig = async (req, res) => {
  try {
    const { config_key } = req.params;
    const config = await Config.findOne({ where: { config_key } });
    
    if (config) {
      res.json({ success: true, data: config });
    } else {
      res.status(404).json({ success: false, message: '配置项不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取配置失败', error: error.message });
  }
};

// 设置配置项
exports.setConfig = async (req, res) => {
  try {
    const { config_key, config_value, description } = req.body;
    
    if (!config_key) {
      return res.status(400).json({ success: false, message: '配置键不能为空' });
    }
    
    // 查找是否已存在该配置
    let config = await Config.findOne({ where: { config_key } });
    
    if (config) {
      // 更新现有配置
      await config.update({ config_value, description });
      res.json({ success: true, data: config, message: '配置更新成功' });
    } else {
      // 创建新配置
      config = await Config.create({ config_key, config_value, description });
      res.json({ success: true, data: config, message: '配置创建成功' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '设置配置失败', error: error.message });
  }
};

// 更新球桌布局时同时保存收银台位置
exports.updateTableLayoutWithCashier = async (req, res) => {
  try {
    const { tables_info, cashier_position } = req.body;
    
    // 验证球桌数据
    if (!tables_info || !Array.isArray(tables_info)) {
      return res.status(400).json({ success: false, message: '球桌数据格式错误' });
    }
    
    // 开始事务
    const sequelize = require('../config/sequelize');
    const Table = require('../models/Table');
    
    await sequelize.transaction(async (t) => {
      // 更新球桌布局
      for (const tableInfo of tables_info) {
        await Table.update(
          {
            position_x: tableInfo.position.x,
            position_y: tableInfo.position.y,
            rotation: tableInfo.rotation || 0,
            size_width: tableInfo.size.width,
            size_height: tableInfo.size.height
          },
          {
            where: { table_id: tableInfo.table_id },
            transaction: t
          }
        );
      }
      
      // 保存收银台位置
      if (cashier_position) {
        await Config.upsert(
          {
            config_key: 'cashier_position',
            config_value: JSON.stringify(cashier_position),
            description: '收银台位置配置'
          },
          {
            where: { config_key: 'cashier_position' },
            transaction: t
          }
        );
      }
    });
    
    res.json({ success: true, message: '布局更新成功，包括收银台位置' });
  } catch (error) {
    console.error('更新布局失败:', error);
    res.status(500).json({ success: false, message: '更新布局失败', error: error.message });
  }
};

// 获取收银台位置
exports.getCashierPosition = async (req, res) => {
  try {
    const config = await Config.findOne({ where: { config_key: 'cashier_position' } });
    
    if (config && config.config_value) {
      try {
        const position = JSON.parse(config.config_value);
        res.json({ success: true, data: position });
      } catch (parseError) {
        res.status(400).json({ success: false, message: '收银台位置数据格式错误' });
      }
    } else {
      // 返回默认位置
      res.json({ success: true, data: { x: 50, y: 50 } });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取收银台位置失败', error: error.message });
  }
};