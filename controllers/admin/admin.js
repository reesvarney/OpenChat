var express = require('express');
var router = express.Router();

module.exports = function ({
  db,
  conf,
  expressFunctions
}) {

  router.delete("/channel/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    db.models.Channel.destroy({
      where: {
        id: req.params.uuid
      }
    });
    res.status(200).send();
  });

  router.post("/channel/:uuid/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    console.log(req.body, req.params)
    var name = req.body.name;
    var description = req.body.description;

    db.models.Channel.findByPk(req.params.uuid).then((channel) => {
      console.log(channel)
      channel.update({
        name: name
      });
      res.redirect('/');
    });
  });

  router.post("/channel/new", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    var name = req.body.name;
    var type = req.body.type;
    db.models.Channel.create({
      name: name,
      type: type
    }).then((result) => {
      res.redirect('/');
    });
  });

  router.post("/server", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_server'), function (req, res) {
    conf.server.name = req.body.name;
  })

  return router;
};