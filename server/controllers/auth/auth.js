var express = require("express");
var router = express.Router();
const fs = require('fs');
const path = require('path');
var authMethods = [];

module.exports = function (controllerParams) {
  fs.readdir(path.join(__dirname, './methods'), (err, files) => {
    files.forEach((file) => {
      var method = require(path.join(__dirname, './methods', file));
      controllerParams.passport.use(method.name, method.strategy(controllerParams));
      if ("models" in method) {
        controllerParams.addModels(method.models);
      };
      if (!method.hidden) authMethods.push({
        path: method.name,
        name: method.displayName,
        icon: method.icon
      });
      var methodRouter = method.router(method.name, controllerParams);
      methodRouter.use(express.static("./views/static"));
      router.use(`/${method.name}`, methodRouter);
    });
  });

  // TODO - Create page to select method. Methods should have a selectable attribute designating whether they show on this page
  router.get("/", controllerParams.expressFunctions.checkNotAuth, (req, res) => {
    res.render('auth/index', {authMethods})
  });

  router.use(express.static("./views/static"));

  return router;
};