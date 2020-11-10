var express = require('express');
var router = express.Router();
var fs = require('fs');

module.exports = function({
  db,
  config,
  expressFunctions
}) {

  function saveConf(){
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  }

  router.delete("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    db.models.Channel.destroy({
      where: {
        id: req.params.uuid
      }
    });
    res.status(200).send();
  });

  router.post("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    var name = req.body.name;
    var description = req.body.description;

    db.models.Channel.findByPk(req.params.uuid).then((channel) => {
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

  router.post("/server/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_server'), function (req, res) {
    config.name = req.body.name;
    saveConf();
    res.redirect('/');
  })

  router.post("/role/:uuid/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_roles'), function(req,res){
    (async()=>{
      var role = await db.models.Role.findByPk(req.params.uuid);
      if(role === null){
        res.status(400).send('ERROR: Role does not exist');
      } else {
        Object.keys(req.body).forEach((perm)=>{
          if(!(perm in role.dataValues)){
            res.status(400).send('ERROR: Invalid Key')
            return false;
          }
        });
        await role.update(req.body).catch(err =>{
          res.status(400).send('ERROR: Sequelize error', err)
          return false;
        });
        res.status(200).send('SUCCESS');
      }
    })()
  });

  return router;
};