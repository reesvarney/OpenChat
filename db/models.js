const { DataTypes, Sequelize } = require("sequelize");

module.exports =  {
  Message: {
    attributes: {
      content: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 32],
        },
      },
    },
    options: {},
    relations: {
      belongsTo: "Channel",
    },
  },
  Channel: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        unique: true,
      },
    },
    options: {},
    relations: {
      hasMany: "Message",
    },
  },
};