var express = require("express");
var router = express.Router();

module.exports = function ({ config, db }) {
  router.use(express.static("./views/static"));

  router.get("/", function (req, res) {
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
          });
          channelArray.forEach(function (channel) {
            channels[type].push(channel.dataValues);
          });
        };
        res.render("client/index", { config, db, req, channels });
      })();
    });
  });

  return router;
};
