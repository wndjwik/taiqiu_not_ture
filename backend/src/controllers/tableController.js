const Table = require('../models/Table');
const TableUsage = require('../models/TableUsage');
const TableReservation = require('../models/TableReservation');
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');

// 获取所有球桌信息
exports.getAllTables = async (req, res) => {
  try {
    const tables = await Table.findAll();
    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取球桌信息失败', error: error.message });
  }
};

// 添加新球桌
exports.addTable = async (req, res) => {
  try {
    console.log('接收到添加球桌请求:', req.body);
    const { table_no, price_per_hour, position_x, position_y, rotation, size_width, size_height } = req.body;
    
    // 检查必要参数
    if (!table_no) {
      return res.status(400).json({ success: false, message: '桌号不能为空' });
    }
    
    // 检查桌号是否已存在
    console.log('检查桌号是否已存在:', table_no);
    const existingTable = await Table.findOne({ where: { table_no } });
    if (existingTable) {
      console.log('桌号已存在:', table_no);
      return res.status(400).json({ success: false, message: '该球桌编号已存在，请更换编号' });
    }
    
    // 准备创建球桌的数据
    const tableData = {
      table_no,
      price_per_hour: price_per_hour || 60.00,
      position_x: position_x || 200,
      position_y: position_y || 200,
      rotation: rotation || 0,
      size_width: size_width || 100,
      size_height: size_height || 200,
      status: 'idle',
      is_active: true
    };
    
    console.log('准备创建球桌:', tableData);
    const newTable = await Table.create(tableData);
    
    res.json({ success: true, data: newTable, message: '球桌添加成功' });
  } catch (error) {
    console.error('添加球桌时发生错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '添加球桌失败', error: error.message });
  }
};

// 更新球桌信息
exports.updateTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const updates = req.body;
    
    // 不允许通过此接口直接修改状态
    if (updates.status) {
      delete updates.status;
    }
    
    const [updated] = await Table.update(updates, {
      where: { table_id }
    });
    
    if (updated) {
      const updatedTable = await Table.findByPk(table_id);
      res.json({ success: true, data: updatedTable, message: '球桌信息更新成功' });
    } else {
      res.status(404).json({ success: false, message: '球桌不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '更新球桌信息失败', error: error.message });
  }
};

// 删除球桌（物理删除）
exports.deleteTable = async (req, res) => {
  try {
    console.log('接收到删除球桌请求:', req.params);
    const { table_id } = req.params;
    
    // 验证参数
    if (!table_id || isNaN(parseInt(table_id))) {
      return res.status(400).json({ success: false, message: '无效的球桌ID' });
    }
    
    // 检查球桌是否存在
    const table = await Table.findByPk(table_id);
    if (!table) {
      return res.status(404).json({ success: false, message: '球桌不存在' });
    }
    
    // 检查球桌是否在使用中或已预订
    try {
      const activeUsage = await TableUsage.findOne({
        where: { table_id, status: 'active' }
      });
      
      if (activeUsage) {
        console.log(`球桌${table_id}正在使用中，无法删除`);
        return res.status(400).json({ success: false, message: '该球桌正在使用中，无法删除' });
      }
    } catch (usageError) {
      console.error('检查球桌使用状态失败:', usageError);
      // 继续执行，不因为使用状态检查失败而中断
    }
    
    try {
      const activeReservation = await TableReservation.findOne({
        where: { table_id, status: 'active' }
      });
      
      if (activeReservation) {
        console.log(`球桌${table_id}已有预订，无法删除`);
        return res.status(400).json({ success: false, message: '该球桌已有预订，无法删除' });
      }
    } catch (reservationError) {
      console.error('检查球桌预订状态失败:', reservationError);
      // 继续执行，不因为预订状态检查失败而中断
    }
    
    // 物理删除球桌
    console.log(`正在执行球桌${table_id}的物理删除操作`);
    const deleted = await Table.destroy({
      where: { table_id }
    });
    
    if (deleted) {
      console.log(`球桌${table_id}删除成功`);
      res.json({ success: true, message: '球桌删除成功' });
    } else {
      console.log(`球桌${table_id}删除失败，可能不存在`);
      res.status(404).json({ success: false, message: '球桌不存在或删除失败' });
    }
  } catch (error) {
    console.error('删除球桌时发生错误:', error);
    res.status(500).json({ success: false, message: '删除球桌失败', error: error.message });
  }
};

// 更新球桌布局
exports.updateTableLayout = async (req, res) => {
  try {
    console.log('接收到更新球桌布局请求:', req.body);
    const { tables_info } = req.body;
    
    if (!tables_info || !Array.isArray(tables_info)) {
      console.error('布局数据格式错误:', req.body);
      return res.status(400).json({ success: false, message: '布局数据格式错误' });
    }
    
    await sequelize.transaction(async (t) => {
      for (const tableInfo of tables_info) {
        console.log('更新球桌布局:', tableInfo.table_id, tableInfo.position, tableInfo.size);
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
    });
    
    console.log('布局更新成功');
    res.json({ success: true, message: '布局更新成功' });
  } catch (error) {
    console.error('更新布局失败:', error);
    res.status(500).json({ success: false, message: '更新布局失败', error: error.message });
  }
};

// 获取球桌实时状态
exports.getTableStatus = async (req, res) => {
  try {
    // 获取所有球桌
    const tables = await Table.findAll();
    
    // 获取当前使用中的球桌
    const activeUsages = await TableUsage.findAll({
      where: { status: 'active' },
      attributes: ['table_id', 'usage_id', 'member_id', 'member_name', 'start_time']
    });
    
    // 获取当前有效的预订
    const now = new Date();
    const activeReservations = await TableReservation.findAll({
      where: {
        status: 'active',
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      attributes: ['table_id', 'contact_name', 'contact_phone', 'start_time', 'end_time']
    });
    
    // 整合数据
    const tableStatusList = tables.map(table => {
      const statusInfo = {
        table_id: table.table_id,
        table_no: table.table_no,
        status: table.status,
        position: { x: table.position_x, y: table.position_y },
        rotation: table.rotation,
        size: { width: table.size_width, height: table.size_height }
      };
      
      // 添加使用信息
      const usage = activeUsages.find(u => u.table_id === table.table_id);
      if (usage) {
        statusInfo.usage_info = {
          usage_id: usage.usage_id,
          member_id: usage.member_id,
          member_name: usage.member_name,
          start_time: usage.start_time
        };
      }
      
      // 添加预订信息
      const reservation = activeReservations.find(r => r.table_id === table.table_id);
      if (reservation) {
        statusInfo.reservation_info = {
          contact_name: reservation.contact_name,
          contact_phone: reservation.contact_phone,
          start_time: reservation.start_time,
          end_time: reservation.end_time
        };
      }
      
      return statusInfo;
    });
    
    res.json({ success: true, data: tableStatusList });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取球桌状态失败', error: error.message });
  }
};