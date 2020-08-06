"use strict";
const { Sequelize } = require("sequelize");
const model_data = require("./models.js");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./db.sqlite",
});

var models = {};

const relations = {
  belongsTo: function (model, target) {
    models[model].belongsTo(models[target]);
  },
  hasMany: function (model, target) {
    models[model].hasMany(models[target]);
  },
  belongsToMany: function (model, target) {
    models[model].belongsToMany(models[target]);
  },
  hasOne: function (model, target) {
    models[model].hasOne(models[target]);
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
  models[name] = sequelize.define(name, model.attributes, model.options);
  status.promise.then(() => {
    for (const [relation, target] of Object.entries(model.relations)) {
      relations[relation](name, target);
    };
  })
};

status.resolve();

module.exports = models;