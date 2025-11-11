const path = require('path');
const { Sequelize } = require('sequelize');
const Table = require('./src/models/Table');
const TableUsage = require('./src/models/TableUsage');

// 连接数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: console.log, // 开启日志以便查看执行的SQL
});

// 主函数
async function main() {
  try {
    // 同步模型
    await sequelize.sync();
    console.log('数据库同步完成');
    
    // 1. 将所有球桌状态设置为idle
    const [updated] = await Table.update(
      { status: 'idle' },
      { where: { is_active: true } }
    );
    console.log(`已将 ${updated} 个球桌设置为空闲状态`);
    
    // 2. 获取所有球桌信息
    const tables = await Table.findAll({
      where: { is_active: true },
      order: [['table_no', 'ASC']]
    });
    
    console.log('\n球桌列表:');
    tables.forEach(table => {
      console.log(`桌号: ${table.table_no}, 状态: ${table.status}, 每小时价格: ${table.price_per_hour}`);
    });
    
    // 3. 更新所有进行中的使用记录，添加开始时间
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 一小时前
    
    const [updatedUsages] = await TableUsage.update(
      { start_time: oneHourAgo },
      { 
        where: { 
          status: 'active',
          start_time: null 
        }
      }
    );
    console.log(`\n已为 ${updatedUsages} 条进行中的使用记录添加了开始时间`);
    
    // 4. 显示当前活跃的使用记录
    const activeUsages = await TableUsage.findAll({
      where: { status: 'active' },
      limit: 5
    });
    
    if (activeUsages.length > 0) {
      console.log('\n活跃的使用记录:');
      activeUsages.forEach(usage => {
        console.log(`桌号: ${usage.table_no}, 会员: ${usage.member_name}, 开始时间: ${usage.start_time}`);
      });
    }
    
  } catch (error) {
    console.error('发生错误:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行主函数
main();