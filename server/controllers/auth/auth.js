var express = require("express");
var router = express.Router();

module.exports = function (controllerParams) {
  //TODO - MAKE THIS DYNAMIC AND LOAD FROM MORE CENTRAL MODULES
  router.get("/", controllerParams.expressFunctions.checkNotAuth, (req, res) => {
    res.redirect('auth/anon');
  });

  router.use('/pubkey', require('./methods/pubkey.js').router(controllerParams));
  router.use('/anon', require('./methods/anon.js').router(controllerParams));

  router.use(express.static("./views/static"));

  return router;
};
