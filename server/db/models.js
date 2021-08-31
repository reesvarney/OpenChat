const { DataTypes, Sequelize } = require("sequelize");

module.exports = {
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
          len: [1, 2000],
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
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    options: {},
    relations: [
      {
        relation: "hasMany",
        model: "Message",
        options: {
          onDelete: 'CASCADE',
          hooks: true
        }
      },
      {
        relation: "belongsTo",
        model: "Category"
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

  RoleAssignment: {
    attributes: {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      }
    },
    relations: [],
    options: {},
  },

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
      }
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
      {
        relation: "belongsTo",
        model: "PermissionSet",
        options: {
          onDelete: 'CASCADE',
          hooks: true
        }
      }
    ],
  },

  Permission: {
    attributes: {
      id: {
        type: DataTypes.STRING,
        unique: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
        defaultValue: "Permission"
      },
      defaultValue: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        unique: false,
        defaultValue: "Permission"
      },
    },
    relations: [
      {
        relation: "hasMany",
        model: "PermissionValue",
        options: {
          onDelete: 'CASCADE',
          hooks: true
        }
      }
    ],
    options: {
      createdAt: false,
      updatedAt: false
    }
  },

  PermissionValue: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true,
      },
      value: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        unique: false
      }
    },
    relations: [
      {
        relation: "belongsTo",
        model: "Permission"
      },
      {
        relation: "belongsTo",
        model: "PermissionSet"
      }
    ],
    options: {
      createdAt: false
    }
  },

  PermissionSet: {
    attributes: {
      id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        primaryKey: true
      }
    },
    relations: [
      {
        relation: "hasMany",
        model: "PermissionValue",
        options: {
          onDelete: 'CASCADE',
          hooks: true
        }
      },
      {
        relation: "hasMany",
        model: "Role"
      }
    ],
    options: {
      createdAt: false,
      updatedAt: false
    }
  },

  Pubkey: {
    attributes: {
      id: {
        type: DataTypes.UUID,
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

  Category: {
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
        unique: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      }
    },
    options: {},
    relations: [
      {
        relation: "hasMany",
        model: "Channel",
        options: {
          onDelete: 'CASCADE',
          hooks: true
        }
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
