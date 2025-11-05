const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TableReservation = sequelize.define('TableReservation', {
  reservation_id: {
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
  contact_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duration_hours: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false
  },
  operator: {
    type: DataTypes.STRING(50),
    allowNull: false // 操作人员
  },
  status: {
    type: DataTypes.ENUM('active', 'arrived', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'active' // active:有效, arrived:已到店, cancelled:已取消, no_show:未到店
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'table_reservations',
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

module.exports = TableReservation;