const sequelize = require('../config/database');
const Table = require('../models/Table');
const TableReservation = require('../models/TableReservation');
const TableUsage = require('../models/TableUsage');

// 查询表信息的函数
async function checkTables() {
  try {
    console.log('🔍 开始检查数据库表...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 检查球桌表
    console.log('\n📋 球桌表 (tables) 信息：');
    const tables = await Table.findAll();
    console.log(`   记录数量: ${tables.length}`);
    
    if (tables.length > 0) {
      console.log('   球桌数据:');
      tables.forEach(table => {
        console.log(`   - 桌号: ${table.table_no}, 价格: ¥${table.price_per_hour}/小时, 状态: ${table.status}, 位置: (${table.position_x}, ${table.position_y})`);
      });
    }
    
    // 检查表结构
    console.log('\n🏗️  表结构验证：');
    console.log('   - tables表: ✅ 已创建');
    
    // 检查球桌使用记录表
    const usageCount = await TableUsage.count();
    console.log(`   - table_usages表: ✅ 已创建 (${usageCount} 条记录)`);
    
    // 检查球桌预订表
    const reservationCount = await TableReservation.count();
    console.log(`   - table_reservations表: ✅ 已创建 (${reservationCount} 条记录)`);
    
    console.log('\n✅ 所有球桌相关表检查完成！');
    
  } catch (error) {
    console.error('❌ 检查数据库表失败:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 执行检查
checkTables();