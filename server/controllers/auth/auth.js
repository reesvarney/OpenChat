var express = require("express");
var router = express.Router();
const fs = require('fs');
const path = require('path');
var authMethods = [];

module.exports = function (controllerParams) {
  fs.readdir(path.join(__dirname, './methods'), (err, files) => {
    files.forEach((file)=>{
      var method = require(path.join(__dirname, './methods', file));

      // Eventually I would like this to be modular. In case there are duplicate names, we just set the name to a different value.
      function checkName(name, i=1){
        if(authMethods.includes(name)){
          method.name = `${name}-${i}`;
          checkName(method.name, i+1);
        } else {
          authMethods.push(name)
        }
      }
      checkName(method.name);

      controllerParams.passport.use(method.name, method.strategy(controllerParams));
      router.use(`/${method.name}`, method.router(method.name, controllerParams));
    });
  });

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
