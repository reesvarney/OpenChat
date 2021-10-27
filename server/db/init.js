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

// TODO: Switch to ts and expand documentation
/**
 * Adds a set of models into the database
 * @param {Object<db_model>} model_data - The database model to be added. There is not currently any documentation but models.js should contain a good enough example
 * @returns {Promise} Returns a promise which resolves to a sequelize object when the sync has completed. This is the same as `db` so will probably not be needed directly.
 */

function addModels(model_data){
  for (const [name, model] of Object.entries(model_data)) {
    sequelize.define(name, model.attributes, model.options);
  };
  
  for (const [name, model] of Object.entries(model_data)) {
    if("relations" in model){
      model.relations.forEach( (relationship) => {
        if (relationship.options === undefined){ relationship.options = {}}
        relations[relationship.relation](name, relationship.model, relationship.options);
      });
    };
  };

  return new Promise((resolve, reject) => {
    sequelize.sync({alter: {drop: false}}).then(() => {
      resolve(sequelize);
    });
  })
};

module.exports = {
  dbPromise: addModels(require("./models.js")),
  addModels
}