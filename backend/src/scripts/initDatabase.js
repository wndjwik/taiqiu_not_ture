const path = require('path');
const sequelize = require('../config/database');

// 引入所有模型
const Member = require('../models/Member');
const RechargeRecord = require('../models/RechargeRecord');
const ConsumeRecord = require('../models/ConsumeRecord');
const Employee = require('../models/Employee');
const Table = require('../models/Table');
const TableUsage = require('../models/TableUsage');
const TableReservation = require('../models/TableReservation');

// 创建表结构的函数
async function createTables() {
  try {
    console.log('📊 开始创建数据库表...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 按顺序创建表（确保外键约束正常工作）
    console.log('🔄 创建会员表...');
    await Member.sync({ force: false });
    
    console.log('🔄 创建员工表...');
    await Employee.sync({ force: false });
    
    console.log('🔄 创建充值记录表...');
    await RechargeRecord.sync({ force: false });
    
    console.log('🔄 创建消费记录表...');
    await ConsumeRecord.sync({ force: false });
    
    console.log('🔄 创建球桌表...');
    await Table.sync({ force: false });
    
    console.log('🔄 创建球桌使用记录表...');
    await TableUsage.sync({ force: false });
    
    console.log('🔄 创建球桌预订表...');
    await TableReservation.sync({ force: false });
    
    console.log('✅ 所有数据库表创建成功！');
    
    // 添加一些默认球桌数据
    await addDefaultTables();
    
    console.log('✅ 数据库初始化完成！');
    console.log(`💾 数据库文件位置: ${path.join(__dirname, '../database.sqlite')}`);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 添加默认球桌数据
async function addDefaultTables() {
  try {
    const tableCount = await Table.count();
    if (tableCount === 0) {
      console.log('📋 添加默认球桌数据...');
      
      const defaultTables = [
        { table_no: 'A1', price_per_hour: 80.00, position_x: 100, position_y: 100, size_width: 100, size_height: 200 },
        { table_no: 'A2', price_per_hour: 80.00, position_x: 300, position_y: 100, size_width: 100, size_height: 200 },
        { table_no: 'B1', price_per_hour: 60.00, position_x: 100, position_y: 400, size_width: 100, size_height: 200 },
        { table_no: 'B2', price_per_hour: 60.00, position_x: 300, position_y: 400, size_width: 100, size_height: 200 },
        { table_no: 'VIP1', price_per_hour: 120.00, position_x: 500, position_y: 100, size_width: 100, size_height: 200 }
      ];
      
      await Table.bulkCreate(defaultTables);
      console.log(`✅ 成功添加 ${defaultTables.length} 张默认球桌`);
    } else {
      console.log(`ℹ️  球桌表已有 ${tableCount} 条记录，跳过默认数据添加`);
    }
  } catch (error) {
    console.error('❌ 添加默认球桌数据失败:', error);
  }
}

// 执行创建表
createTables();