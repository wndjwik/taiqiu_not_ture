const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Table = sequelize.define('Table', {
  table_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  table_no: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('idle', 'using', 'reserved'),
    allowNull: false,
    defaultValue: 'idle' // idle:空闲, using:使用中, reserved:已预订
  },
  price_per_hour: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 60.00
  },
  position_x: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  position_y: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rotation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0 // 0, 90, 180, 270
  },
  size_width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100
  },
  size_height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 200
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'tables',
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

module.exports = Table;