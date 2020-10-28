const { DataTypes, Sequelize } = require("sequelize");

module.exports = {
  RoleAssignment: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      }
    },
    relations: [],
    options: {},
  },

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
          len: [1, 32],
        },
      },
    },
    options: {},
    relations: [
      {
        relation: "belongsTo", 
        model: "Channel"
      },
      {
        relation: "belongsTo", 
        model: "User"
      }
    ],
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
          isIn: [["voice", "text", "custom"]],
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [3, 32],
        },
      },
    },
    options: {},
    relations: [
      {
        relation: "hasMany",
        model: "Message",
        options: {
          onDelete: 'CASCADE'
        }
      }
    ],
  },

  User: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "New User",
      }
    },
    options: {},
    relations: [
    {
      relation: "belongsToMany",
      model: "Role",
      options: {
        through: "RoleAssignment"
      },
    },
    ]
  },

  //Store permissions here. Some permissions have been added which may not need to be used however it will allow for less migrations to be needed in the future
  Role: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        defaultValue: "New Role",
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_join: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      permission_speak: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      permission_listen: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      permission_send_message: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      permission_move: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_ban: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_kick: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_mute: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_deafen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_delete_message: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_edit_channels: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      permission_edit_server: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    options: {},
    relations: [
      {
        relation: "belongsToMany",
        model: "User",
        options: {
          through: "RoleAssignment"
        },
      },
    ],
  },

  Pubkey: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      },
      pub_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      }
    },
    options: {},
    relations: [
      {
        relation: "belongsTo",
        model: "User"
      }
    ]
  },

  EmailPass: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      pass_hashed: {
        type: DataTypes.STRING,
        allowNull: false
      },
      salt: {
        type: DataTypes.STRING,
        allowNull: false
      },
      private_salt: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    options: {},
    relations: [
      {
        relation: "belongsTo",
        model: "User"
      }
    ]
  },
};
