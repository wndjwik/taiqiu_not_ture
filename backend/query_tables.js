const sequelize = require('./src/config/sequelize');
const Table = require('./src/models/Table');
const TableUsage = require('./src/models/TableUsage');
const TableReservation = require('./src/models/TableReservation');
const Member = require('./src/models/Member');
const ConsumeRecord = require('./src/models/ConsumeRecord');
const Employee = require('./src/models/Employee');

async function queryAllTables() {
  try {
    console.log('🔍 正在查询数据库所有表结构和数据...\n');
    
    // 获取所有模型信息
    const models = [
      { name: '球桌表 (tables)', model: Table },
      { name: '球桌使用记录表 (table_usages)', model: TableUsage },
      { name: '球桌预订表 (table_reservations)', model: TableReservation },
      { name: '会员表 (members)', model: Member },
      { name: '消费记录表 (consume_records)', model: ConsumeRecord },
      { name: '员工表 (employees)', model: Employee }
    ];
    
    for (const { name, model } of models) {
      try {
        console.log('='.repeat(80));
        console.log(`📊 ${name}`);
        console.log('='.repeat(80));
        
        // 查询表数据
        const data = await model.findAll();
        console.log(`共 ${data.length} 条记录`);
        
        if (data.length > 0) {
          // 获取字段名
          const firstRecord = data[0].toJSON();
          const fields = Object.keys(firstRecord);
          console.log('\n字段列表:');
          console.log(fields.join(', '));
          
          // 显示前5条记录作为示例
          console.log('\n前5条记录示例:');
          data.slice(0, 5).forEach((record, index) => {
            console.log(`\n第 ${index + 1} 条:`);
            const recordData = record.toJSON();
            Object.entries(recordData).forEach(([key, value]) => {
              console.log(`  ${key}: ${JSON.stringify(value)}`);
            });
          });
        }
        
        console.log('');
      } catch (err) {
        console.log(`❌ 查询 ${name} 失败: ${err.message}\n`);
      }
    }
    
    console.log('='.repeat(80));
    console.log('✅ 数据库表查询完成！');
    
  } catch (error) {
    console.error('❌ 查询数据库失败:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

queryAllTables();
