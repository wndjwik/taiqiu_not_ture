const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TableUsage = sequelize.define('TableUsage', {
  usage_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  table_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tables',
      key: 'table_id'
    }
  },
  table_no: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  member_id: {
    type: DataTypes.STRING(20),
    allowNull: true // 非会员可为空
  },
  member_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true // 未结台时为空
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true // 实际使用分钟数
  },
  billing_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true // 计费分钟数
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // 总费用
  },
  payment_method: {
    type: DataTypes.ENUM('member_card', 'cash', 'wechat', 'alipay'),
    allowNull: true // 支付方式
  },
  operator: {
    type: DataTypes.STRING(50),
    allowNull: false // 操作人员
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'active' // active:进行中, completed:已完成, cancelled:已取消
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'table_usages',
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

module.exports = TableUsage;