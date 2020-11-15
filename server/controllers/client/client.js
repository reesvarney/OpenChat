var express = require("express");
var router = express.Router();

module.exports = function ({ config, db, expressFunctions }) {
  router.use(express.static("./views/static"));

  router.get("/", expressFunctions.checkAuth, function (req, res) {
    var channels = {};
    db.models.Channel.aggregate("type", "DISTINCT", { plain: false }).then((result) => {
      (async () => {
        for(const type_obj of result){
          var type = type_obj.DISTINCT;
          channels[type] = [];
          var channelArray = await db.models.Channel.findAll({
            where: {
              type: type,
            },
            order: [
              ['position', 'ASC']
            ]
          });
          channelArray.forEach(function (channel) {
            channels[type].push(channel.dataValues);
          });
        };
        var viewData = { config, db, req, channels };
        if(req.user.permissions.permission_edit_roles){
          viewData["roles"] = await db.models.Role.findAll();
        } else {
          viewData["roles"] = {};
        }
        res.render("client/index", viewData);
      })();
    });
  });

  return router;
};
