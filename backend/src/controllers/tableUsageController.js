const Table = require('../models/Table');
const TableUsage = require('../models/TableUsage');
const TableReservation = require('../models/TableReservation');
const ConsumeRecord = require('../models/ConsumeRecord');
const Member = require('../models/Member');
const sequelize = require('../config/sequelize');

// 开台
exports.openTable = async (req, res) => {
  try {
    const { table_id, member_id, member_name, operator, notes } = req.body;
    
    // 开始事务
    await sequelize.transaction(async (t) => {
      // 检查球桌状态
      const table = await Table.findByPk(table_id, { transaction: t });
      if (!table) {
        throw new Error('球桌不存在');
      }
      
      if (table.status !== 'idle') {
        throw new Error('球桌当前不可用');
      }
      
      // 创建开台记录
      const tableUsage = await TableUsage.create({
        table_id,
        table_no: table.table_no,
        member_id,
        member_name,
        start_time: new Date(),
        operator,
        status: 'active',
        notes
      }, { transaction: t });
      
      // 更新球桌状态
      await Table.update(
        { status: 'using' },
        { where: { table_id }, transaction: t }
      );
      
      // 如果有预订，更新预订状态
      const reservation = await TableReservation.findOne({
        where: {
          table_id,
          status: 'active',
          start_time: { [sequelize.Op.lte]: new Date() },
          end_time: { [sequelize.Op.gte]: new Date() }
        },
        transaction: t
      });
      
      if (reservation) {
        await TableReservation.update(
          { status: 'arrived' },
          { where: { reservation_id: reservation.reservation_id }, transaction: t }
        );
      }
      
      res.json({ 
        success: true, 
        data: tableUsage, 
        message: `成功开台：${table.table_no}` 
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '开台失败', error: error.message });
  }
};

// 结台
exports.closeTable = async (req, res) => {
  try {
    const { usage_id, duration_minutes, payment_method, operator } = req.body;
    
    await sequelize.transaction(async (t) => {
      // 获取开台记录
      const tableUsage = await TableUsage.findByPk(usage_id, { transaction: t });
      if (!tableUsage) {
        throw new Error('开台记录不存在');
      }
      
      if (tableUsage.status !== 'active') {
        throw new Error('该开台记录已处理');
      }
      
      // 获取球桌信息
      const table = await Table.findByPk(tableUsage.table_id, { transaction: t });
      if (!table) {
        throw new Error('球桌信息不存在');
      }
      
      // 计算时长
      const now = new Date();
      const start = new Date(tableUsage.start_time);
      const actualMinutes = Math.floor((now - start) / (1000 * 60));
      const billingMinutes = duration_minutes || Math.ceil(actualMinutes / 60) * 60; // 不足1小时按1小时计费
      
      // 计算费用
      const hours = billingMinutes / 60;
      const totalAmount = table.price_per_hour * hours;
      
      // 更新开台记录
      await TableUsage.update(
        {
          end_time: now,
          duration_minutes: actualMinutes,
          billing_minutes,
          total_amount: totalAmount,
          payment_method,
          status: 'completed'
        },
        { where: { usage_id }, transaction: t }
      );
      
      // 更新球桌状态
      await Table.update(
        { status: 'idle' },
        { where: { table_id: table.table_id }, transaction: t }
      );
      
      // 如果是会员消费，生成消费记录并扣减余额
      if (tableUsage.member_id) {
        // 生成消费记录
        await ConsumeRecord.create({
          member_id: tableUsage.member_id,
          member_name: tableUsage.member_name,
          amount: totalAmount,
          operator
        }, { transaction: t });
        
        // 如果是会员卡支付，扣减余额
        if (payment_method === 'member_card') {
          await Member.decrement(
            { balance: totalAmount },
            { where: { member_id: tableUsage.member_id }, transaction: t }
          );
        }
      }
      
      res.json({ 
        success: true, 
        data: {
          usage_id,
          table_no: table.table_no,
          member_name: tableUsage.member_name,
          start_time: tableUsage.start_time,
          end_time: now,
          duration_minutes: actualMinutes,
          billing_minutes,
          total_amount: totalAmount,
          payment_method
        }, 
        message: `成功结台：${table.table_no}` 
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '结台失败', error: error.message });
  }
};

// 获取开台记录
exports.getTableUsages = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, table_no, member_name, status, start_date, end_date } = req.query;
    
    const where = {};
    if (table_no) where.table_no = { [sequelize.Op.like]: `%${table_no}%` };
    if (member_name) where.member_name = { [sequelize.Op.like]: `%${member_name}%` };
    if (status) where.status = status;
    if (start_date && end_date) {
      where.start_time = {
        [sequelize.Op.between]: [new Date(start_date), new Date(end_date + ' 23:59:59')]
      };
    }
    
    const offset = (page - 1) * pageSize;
    const { rows: records, count: total } = await TableUsage.findAndCountAll({
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
      message: '获取开台记录成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取开台记录失败', error: error.message });
  }
};

// 取消开台
exports.cancelTableUsage = async (req, res) => {
  try {
    const { usage_id } = req.params;
    
    await sequelize.transaction(async (t) => {
      const tableUsage = await TableUsage.findByPk(usage_id, { transaction: t });
      if (!tableUsage) {
        throw new Error('开台记录不存在');
      }
      
      if (tableUsage.status !== 'active') {
        throw new Error('该开台记录已处理');
      }
      
      // 更新开台记录状态
      await TableUsage.update(
        { status: 'cancelled', end_time: new Date() },
        { where: { usage_id }, transaction: t }
      );
      
      // 更新球桌状态
      await Table.update(
        { status: 'idle' },
        { where: { table_id: tableUsage.table_id }, transaction: t }
      );
      
      res.json({ 
        success: true, 
        message: '成功取消开台' 
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '取消开台失败', error: error.message });
  }
};