const { DataTypes, Sequelize } = require("sequelize");

module.exports =  {
  Message: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        unique: true,
      },
      content: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 32],
        },
      }
    },
    options: {},
    relations: {
      belongsTo: "Channel",
    }
  },

  Channel: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        unique: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['voice', 'text', 'custom']]
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 32]
        }
      }
    },
    options: {},
    relations: {}
  },

  User: {
    attributes: {
      oauth: {
        type: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      }
    },
    options: {},
    relations: {
      hasMany: 'IpLog'
    }
  },

  IpLog: {
    attributes: {
      ip: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
      }
    },
    options: {},
    relations: {
      belongsTo: 'User'
    }
  }
};