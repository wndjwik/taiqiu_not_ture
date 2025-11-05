const Table = require('../models/Table');
const TableReservation = require('../models/TableReservation');
const sequelize = require('../config/sequelize');

// 创建预订
exports.createReservation = async (req, res) => {
  try {
    const { table_id, contact_name, contact_phone, start_time, end_time, operator, notes } = req.body;
    
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    // 验证时间
    if (startTime <= new Date()) {
      return res.status(400).json({ success: false, message: '预订开始时间不能早于当前时间' });
    }
    
    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    
    if (durationHours <= 0 || durationHours > 8) {
      return res.status(400).json({ success: false, message: '预订时长必须在0-8小时之间' });
    }
    
    await sequelize.transaction(async (t) => {
      // 检查球桌是否存在
      const table = await Table.findByPk(table_id, { transaction: t });
      if (!table) {
        throw new Error('球桌不存在');
      }
      
      // 检查时段冲突
      const conflict = await TableReservation.findOne({
        where: {
          table_id,
          status: 'active',
          [sequelize.Op.or]: [
            { 
              start_time: { [sequelize.Op.between]: [startTime, endTime] }
            },
            { 
              end_time: { [sequelize.Op.between]: [startTime, endTime] }
            },
            { 
              [sequelize.Op.and]: [
                { start_time: { [sequelize.Op.lte]: startTime } },
                { end_time: { [sequelize.Op.gte]: endTime } }
              ]
            }
          ]
        },
        transaction: t
      });
      
      if (conflict) {
        throw new Error('该时段已有预订');
      }
      
      // 创建预订
      const reservation = await TableReservation.create({
        table_id,
        table_no: table.table_no,
        contact_name,
        contact_phone,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHours,
        operator,
        status: 'active',
        notes
      }, { transaction: t });
      
      // 更新球桌状态
      await Table.update(
        { status: 'reserved' },
        { where: { table_id }, transaction: t }
      );
      
      res.json({ 
        success: true, 
        data: reservation, 
        message: '预订成功' 
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '预订失败', error: error.message });
  }
};

// 获取预订列表
exports.getReservations = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, table_no, contact_name, status, start_date, end_date } = req.query;
    
    const where = {};
    if (table_no) where.table_no = { [sequelize.Op.like]: `%${table_no}%` };
    if (contact_name) where.contact_name = { [sequelize.Op.like]: `%${contact_name}%` };
    if (status) where.status = status;
    if (start_date && end_date) {
      where.start_time = {
        [sequelize.Op.between]: [new Date(start_date), new Date(end_date + ' 23:59:59')]
      };
    }
    
    const offset = (page - 1) * pageSize;
    const { rows: records, count: total } = await TableReservation.findAndCountAll({
      where,
      order: [['start_time', 'DESC']],
      limit: parseInt(pageSize),
      offset
    });
    
    res.json({
      success: true,
      data: {
        records,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      },
      message: '获取预订记录成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取预订记录失败', error: error.message });
  }
};

// 取消预订
exports.cancelReservation = async (req, res) => {
  try {
    const { reservation_id } = req.params;
    
    await sequelize.transaction(async (t) => {
      const reservation = await TableReservation.findByPk(reservation_id, { transaction: t });
      if (!reservation) {
        throw new Error('预订记录不存在');
      }
      
      if (reservation.status !== 'active') {
        throw new Error('该预订已处理');
      }
      
      // 更新预订状态
      await TableReservation.update(
        { status: 'cancelled' },
        { where: { reservation_id }, transaction: t }
      );
      
      // 检查该球桌是否还有其他活跃预订
      const hasOtherReservations = await TableReservation.findOne({
        where: {
          table_id: reservation.table_id,
          reservation_id: { [sequelize.Op.ne]: reservation_id },
          status: 'active',
          start_time: { [sequelize.Op.lte]: new Date() },
          end_time: { [sequelize.Op.gte]: new Date() }
        },
        transaction: t
      });
      
      // 如果没有其他活跃预订，将球桌状态改为空闲
      if (!hasOtherReservations) {
        await Table.update(
          { status: 'idle' },
          { where: { table_id: reservation.table_id }, transaction: t }
        );
      }
      
      res.json({ 
        success: true, 
        message: '预订取消成功' 
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '取消预订失败', error: error.message });
  }
};

// 标记预订到店
exports.markArrived = async (req, res) => {
  try {
    const { reservation_id } = req.params;
    
    const reservation = await TableReservation.findByPk(reservation_id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预订记录不存在' });
    }
    
    if (reservation.status !== 'active') {
      return res.status(400).json({ success: false, message: '该预订已处理' });
    }
    
    await TableReservation.update(
      { status: 'arrived' },
      { where: { reservation_id } }
    );
    
    res.json({ 
      success: true, 
      message: '已标记为到店' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败', error: error.message });
  }
};

// 自动检查并处理超时未到的预订
exports.checkOverdueReservations = async () => {
  try {
    const now = new Date();
    const overdueTime = new Date(now.getTime() - 30 * 60 * 1000); // 30分钟前
    
    const reservations = await TableReservation.findAll({
      where: {
        status: 'active',
        start_time: { [sequelize.Op.lte]: overdueTime }
      }
    });
    
    for (const reservation of reservations) {
      await sequelize.transaction(async (t) => {
        // 更新预订状态为未到店
        await TableReservation.update(
          { status: 'no_show' },
          { where: { reservation_id: reservation.reservation_id }, transaction: t }
        );
        
        // 检查该球桌是否还有其他活跃预订
        const hasOtherReservations = await TableReservation.findOne({
          where: {
            table_id: reservation.table_id,
            reservation_id: { [sequelize.Op.ne]: reservation.reservation_id },
            status: 'active',
            start_time: { [sequelize.Op.lte]: now },
            end_time: { [sequelize.Op.gte]: now }
          },
          transaction: t
        });
        
        // 如果没有其他活跃预订，将球桌状态改为空闲
        if (!hasOtherReservations) {
          await Table.update(
            { status: 'idle' },
            { where: { table_id: reservation.table_id }, transaction: t }
          );
        }
      });
    }
    
    console.log(`自动处理了 ${reservations.length} 个超时未到的预订`);
  } catch (error) {
    console.error('检查超时预订失败:', error);
  }
};