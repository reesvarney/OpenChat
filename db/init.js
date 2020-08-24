const { Sequelize } = require("sequelize");
const model_data = require("./models.js");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./db/sqlite/db.sqlite",
  logging: false
});

const relations = {
  belongsTo: function (model, target) {
    sequelize.models[model].belongsTo(sequelize.models[target]);
  },
  hasMany: function (model, target) {
    sequelize.models[model].hasMany(sequelize.models[target]);
  },
  belongsToMany: function (model, target) {
    sequelize.models[model].belongsToMany(sequelize.models[target]);
  },
  hasOne: function (model, target) {
    sequelize.models[model].hasOne(sequelize.models[target]);
  },
};

var status = new class{
  constructor(){
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
    });
  }
};

for (const [name, model] of Object.entries(model_data)) {
  sequelize.define(name, model.attributes, model.options);
  status.promise.then(() => {
    for (const [relation, target] of Object.entries(model.relations)) {
      relations[relation](name, target);
    };
    sequelize.models[name].sync();
  })
};

status.resolve();


module.exports = sequelize;