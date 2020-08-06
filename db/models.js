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
        validate: {
          isIn: [['voice', 'text', 'custom']]
        }
      },
      name: {
        type: DataTypes.STRING,
        validate: {
          len: [3, 32]
        }
      }
    },
    options: {},
    relations: {
      hasMany: "Message",
    }
  },

  User: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        unique: true,
      },
      name_hashed: {
        
      },
      pass_hashed: {

      },
      salt: {

      }
    },
    options: {},
    relations: {}
  },
};