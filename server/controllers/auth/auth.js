var express = require("express");
var router = express.Router();
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes} = require("sequelize");
var authMethods = [];

module.exports = function (controllerParams) {
  fs.readdir(path.join(__dirname, './methods'), (err, files) => {
    files.forEach((file)=>{
      var method = require(path.join(__dirname, './methods', file));
      controllerParams.passport.use(method.name, method.strategy(controllerParams));
      if("models" in method){
        controllerParams.addModels(method.models);
      };
      authMethods.push(method.name)
      router.use(`/${method.name}`, method.router(method.name, controllerParams));
    });
  });

  // TODO - Create page to select method. Methods should have a selectable attribute designating whether they show on this page
  router.get("/", controllerParams.expressFunctions.checkNotAuth, (req, res) => {
    if(authMethods.includes('anon')){
      res.redirect('auth/anon');
    } else {
      res.redirect(`auth/${authMethods[0]}`);
    }
  });

  router.use(express.static("./views/static"));

  return router;
};
