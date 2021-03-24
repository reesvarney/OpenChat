var express = require("express");
var router = express.Router();

module.exports = function ({ config, db, expressFunctions }) {
  router.use(express.static("./views/static"));

  router.get("/", expressFunctions.checkAuth, async(req, res)=>{
    var viewData = { config, db, req };

    // Customise data according to permissions
    if(req.user.permissions.permission_edit_roles){
      viewData["roles"] = await db.models.Role.findAll();
    } else {
      viewData["roles"] = {};
    };

    // Render the view
    res.render("client/index", viewData);
  });

  router.get("/channels/:id", expressFunctions.checkAuth, async(req, res)=>{
    var channel = await db.models.Channel.findByPk(req.params.id);
    if(channel === null){
      res.status(400).send("Channel does not exist");
    } else {
      var viewData = { req, data: channel};
      res.render(`client/_${channel.type}_channel`, viewData);
    }
  });

  return router;
};
