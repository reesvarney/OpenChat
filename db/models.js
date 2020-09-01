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
      belongsTo: "User"
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
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
        defaultValue: "New User"
      },
      pub_key: {
        type: DataTypes.STRING(512),
        allowNull: false,
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