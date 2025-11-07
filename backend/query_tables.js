const Table = require('./src/models/Table');

async function queryTables() {
  try {
    console.log('正在查询球桌数据...');
    
    // 查询所有球桌
    const tables = await Table.findAll({
      attributes: ['table_id', 'table_no', 'status', 'position_x', 'position_y', 'size_width', 'size_height', 'rotation'],
      order: [['table_id', 'ASC']]
    });
    
    console.log(`\n共找到 ${tables.length} 张球桌：`);
    console.log('='.repeat(80));
    console.log('ID  |  桌号  |  状态  |  位置X  |  位置Y  |  宽度  |  高度  |  旋转角度');
    console.log('='.repeat(80));
    
    let missingDataCount = 0;
    const missingDataTables = [];
    
    tables.forEach(table => {
      const tableData = table.toJSON();
      const hasMissingData = tableData.position_x === null || tableData.position_y === null || 
                           tableData.size_width === null || tableData.size_height === null;
      
      if (hasMissingData) {
        missingDataCount++;
        missingDataTables.push(tableData);
      }
      
      console.log(`${String(tableData.table_id).padEnd(3)} | ` +
                  `${String(tableData.table_no).padEnd(5)} | ` +
                  `${String(tableData.status).padEnd(5)} | ` +
                  `${String(tableData.position_x || 'null').padEnd(7)} | ` +
                  `${String(tableData.position_y || 'null').padEnd(7)} | ` +
                  `${String(tableData.size_width || 'null').padEnd(6)} | ` +
                  `${String(tableData.size_height || 'null').padEnd(6)} | ` +
                  `${String(tableData.rotation || 0)}`);
    });
    
    console.log('='.repeat(80));
    
    if (missingDataCount > 0) {
      console.log(`\n⚠️  警告：发现 ${missingDataCount} 张球桌缺少位置或大小数据：`);
      console.log('缺少数据的球桌：', missingDataTables.map(t => t.table_no).join(', '));
    } else {
      console.log('\n✅ 所有球桌数据完整！');
    }
    
  } catch (error) {
    console.error('查询球桌数据失败:', error.message);
  } finally {
    process.exit();
  }
}

queryTables();
