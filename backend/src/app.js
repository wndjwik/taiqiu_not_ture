require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入路由
const membersRoutes = require('./routes/members');
const rechargeRoutes = require('./routes/recharge');
const consumeRoutes = require('./routes/consume');
const dataRoutes = require('./routes/data');
const employeeRoutes = require('./routes/employees');
const tableRoutes = require('./routes/tables');
const tableUsageRoutes = require('./routes/tableUsage');
const tableReservationRoutes = require('./routes/tableReservations');
const configRoutes = require('./routes/config');

// 导入控制器
const employeeController = require('./controllers/employeeController');

// 导入服务
const backupService = require('./services/backupService');
const scheduleService = require('./services/scheduleService');

// 导入模型（用于数据库同步）
const Member = require('./models/Member');
const RechargeRecord = require('./models/RechargeRecord');
const ConsumeRecord = require('./models/ConsumeRecord');
const Employee = require('./models/Employee');
const Table = require('./models/Table');
const TableUsage = require('./models/TableUsage');
const TableReservation = require('./models/TableReservation');
const Config = require('./models/Config');

const app = express();
const PORT = process.env.PORT || 3001;

// 动态端口处理
function getAvailablePort(startPort = 3001) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    
    const tryPort = (port) => {
      // 确保端口号在有效范围内
      if (port < 0 || port > 65535) {
        reject(new Error(`端口号超出范围: ${port}`));
        return;
      }
      
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // 端口被占用，尝试下一个端口
          if (port < 3010) {
            tryPort(port + 1);
          } else {
            reject(new Error('没有找到可用的端口'));
          }
        } else {
          reject(err);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(port);
      });
      
      server.listen(port);
    };
    
    tryPort(startPort);
  });
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 使用路由
app.use('/api/members', membersRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/consume', consumeRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/table-usage', tableUsageRoutes);
app.use('/api/reservations', tableReservationRoutes);
app.use('/api/config', configRoutes);

// 认证路由（使用员工路由中的登录接口，路径为/api/employees/login）

// 根路径接口
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '台球厅会员管理系统后端服务',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      members: '/api/members',
      recharge: '/api/recharge',
      consume: '/api/consume',
      employees: '/api/employees',
      tables: '/api/tables',
      table_usage: '/api/table-usage',
      reservations: '/api/reservations',
      data: {
          stats: '/api/data/stats',
          backup: '/api/data/backup',
          restore: '/api/data/restore'
        }
    }
  });
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '台球厅会员管理系统后端服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 初始化数据库
const initializeDatabase = async () => {
  try {
    // 同步数据库（创建表）
    await Member.sync({ force: false }); // force: false 表示如果表已存在则不删除重建
    await RechargeRecord.sync({ force: false });
    await ConsumeRecord.sync({ force: false });
    await Employee.sync({ force: false });
    await Table.sync({ force: false }); // 使用force: false以保证数据安全
    await TableUsage.sync({ force: false }); // 恢复为安全模式
    await TableReservation.sync({ force: false });
    await Config.sync({ force: false }); // 同步Config模型创建配置表
    
    console.log('✅ 数据库表同步完成');
    
    // 插入一些测试数据（可选）
    await insertSampleData();
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
};

// 插入示例数据 - 已移除，系统将从空数据库开始
const insertSampleData = async () => {
  console.log('系统将从空数据库开始运行，不插入示例数据');
};

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库
    await initializeDatabase();
    
    // 获取可用端口
    const availablePort = await getAvailablePort(PORT);
    
    // 初始化服务
    backupService.init();
    scheduleService.init();
    
    // 启动服务器
    app.listen(availablePort, () => {
      console.log(`🚀 服务器启动成功！`);
      console.log(`📍 服务地址: http://localhost:${availablePort}`);
      console.log(`📊 API文档: http://localhost:${availablePort}/api/health`);
      console.log(`💾 数据库文件: ${path.join(__dirname, '../database.sqlite')}`);
      
      // 将端口信息写入文件，供Electron应用读取
      const fs = require('fs');
      const portFile = path.join(__dirname, '../port.txt');
      fs.writeFileSync(portFile, availablePort.toString());
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();