const { Sequelize } = require("sequelize");
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

function addTable(model_data){
  for (const [name, model] of Object.entries(model_data)) {
    var tmodel = sequelize.define(name, model.attributes, model.options);
  };
  
  for (const [name, model] of Object.entries(model_data)) {
    if("relations" in model){
      model.relations.forEach( (relationship) => {
        if (relationship.options === undefined){ relationship.options = {}}
        relations[relationship.relation](name, relationship.model, relationship.options);
      });
    };
  };
}

addTable(require("./models.js"));

module.exports = {
  dbPromise: new Promise((resolve, reject) => {
    sequelize.sync({alter: {drop: false}}).then(() => {
      resolve(sequelize);
    });
  }),
  addTable: addTable
}

console.log('Database ✔');