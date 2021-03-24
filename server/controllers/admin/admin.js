var express = require('express');
var router = express.Router();
var fs = require('fs');
var {Op} = require('sequelize');

module.exports = function({
  db,
  config,
  expressFunctions,
  signallingServer
}) {

  function saveConf(){
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  }

  // TODO: EXTEND THE RECORD PROTOTPYE
  async function insertBefore({model, id, index, params}){
    if(![undefined, null].includes(db.models[model].rawAttributes.position)){
      var item = await db.models[model].findByPk(id);
      var records = await db.models[model].findAll({ where: ("where" in params) ? params.where : {}});

      if(index > records.length || index < 0 || index == item.position){
        return {success: false, error: "Invalid index"};
      }

      var newPos = index;
      var oldPos = item.position;

      if(oldPos > newPos){
        var where = {
          id: {
            [Op.ne]: item.id
          },
          position: {
            [Op.gte]: newPos,
            [Op.lt]: oldPos
          },
        };
        if('where' in params) {Object.assign(where, params.where)};
        db.models[model].update({
          position: db.literal('position + 1')
        }, 
        {
          where: where
        });
      } else if(oldPos < newPos){
        var where = {
          id: {
            [Op.ne]: item.id
          },
          position: {
            [Op.lte]: newPos,
            [Op.gt]: oldPos
          }
        };
        if('where' in params) {Object.assign(where, params.where)};
        db.models[model].update({
          position: db.literal('position - 1')
        }, 
        {
          where: where
        });
      }

      var result = await item.update({
        position: newPos
      });
      return {success: true, record: result};
    }
  }

  router.delete("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    db.models.Channel.destroy({
      where: {
        id: req.params.uuid
      }
    }).catch(err =>{
      res.status(400).send('ERROR: Sequelize error', err)
      return false;
    });;
    res.sendStatus(200);
    signallingServer.updateChannels();
  });

  router.post("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    var name = req.body.name;
    var description = req.body.description;

    db.models.Channel.findByPk(req.params.uuid).then((channel) => {
      channel.update({
        name: name
      });
      res.sendStatus(200);
      signallingServer.sendUpdate();
    });
  });

  router.post("/channel/move/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    var id = req.params.uuid;
    var index = req.body.index;
    (async()=>{
      var channel = await db.models.Channel.findByPk(id);
      var query = await insertBefore({model: "Channel", id: id, index: index, params: {where: {type: channel.type}}})
      if(query.success){
        res.status(200).send('success')
        signallingServer.updateChannels();
      } else {
        res.status(400).send(query.error)
      };
    })()
  });

  router.post("/channel/new", expressFunctions.checkAuth, expressFunctions.hasPermission('permission_edit_channels'), function (req, res) {
    var name = req.body.name;
    var type = req.body.type;
    var isError = false;
    (async()=>{
      var positionMax = await db.models.Channel.max('position', {where: {type: req.body.type}});
      var position = (typeof positionMax !== 'number' || isNaN(positionMax)) ? 0 : positionMax + 1;
      await db.models.Channel.create({
        name: name,
        type: type,
        position: position
      }).catch(err =>{
        isError = true;
        res.status(400).send(err)
      })
      // TODO: Use socketio to update dynamically without redirect and disconnect users if voice channel
      if(!isError){
        signallingServer.updateChannels();
        res.sendStatus(200);
      };
    })()

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