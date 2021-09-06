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
      methodRouter.use(express.static("./views/assets/dist"));
      router.use(`/${method.name}`, methodRouter);
    });
  });

  // TODO - Create page to select method. Methods should have a selectable attribute designating whether they show on this page
  router.get("/", controllerParams.expressFunctions.checkNotAuth, (req, res) => {
    res.render('auth/index', {authMethods})
  });

  router.get('/logout', function(req, res){
    if(req.session.passport.user in controllerParams.temp_users){
      controllerParams.signallingServer.deleteUser(req.session.passport.user);
      delete controllerParams.temp_users[req.session.passport.user];
    }
    req.logout();
    res.redirect('/');
  });

  router.use(express.static("./views/assets/dist"));

  return router;
};