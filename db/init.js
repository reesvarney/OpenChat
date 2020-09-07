const { Sequelize } = require("sequelize");
const model_data = require("./models.js");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./db/sqlite/db.sqlite",
  logging: false
});

const relations = {
  belongsTo: function (model, target, opts) {
    sequelize.models[model].belongsTo(sequelize.models[target], opts);
  },
  hasMany: function (model, target, opts) {
    sequelize.models[model].hasMany(sequelize.models[target], opts);
  },
  belongsToMany: function (model, target, opts) {
    sequelize.models[model].belongsToMany(sequelize.models[target], opts);
  },
  hasOne: function (model, target, opts) {
    sequelize.models[model].hasOne(sequelize.models[target], opts);
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
    if("relations" in model){
      model.relations.forEach( (relationship) => {
          relations[relationship.relation](name, relationship.model, relationship.options);
      });
    };
    sequelize.models[name].sync({alter: {drop: true}});
  })
};

status.resolve();


module.exports = sequelize;