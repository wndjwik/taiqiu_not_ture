const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Config = sequelize.define('Config', {
  config_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  config_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  config_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  tableName: 'configs',
  timestamps: true
});

module.exports = Config;