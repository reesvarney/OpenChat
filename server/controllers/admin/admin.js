var express = require('express');
var router = express.Router();
var fs = require('fs');
const { emitKeypressEvents } = require('readline');
var {Op} = require('sequelize');

module.exports = function({
  db,
  config,
  expressFunctions,
  signallingServer,
  authFunctions
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

  router.delete("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_channels'), function (req, res) {
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

  router.post("/channel/edit/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_channels'), function (req, res) {
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

  router.post("/channel/move/:uuid", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_channels'), function (req, res) {
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

  router.post("/channel/new", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_channels'), function (req, res) {
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

  router.post("/server/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_server'), function (req, res) {
    config.name = req.body.name;
    saveConf();
    res.redirect('/');
  })

  router.post("/role/create", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_roles'), async(req,res)=>{
    var roleNum = await db.models.Role.count();
    await authFunctions.createRole(`Role #${roleNum}`);
    signallingServer.updateRoles();
    res.status(200).send('SUCCESS');
  });

  router.post("/role/:uuid/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_roles'), async(req,res)=>{
    var role = await db.models.Role.findByPk(req.params.uuid, {
      include: [
        {          
          model: db.models.PermissionSet,
          include: [{model:db.models.PermissionValue}]
        },
        {
          model: db.models.User
        }
      ]
    });
    if(role === null){
      res.status(400).send('ERROR: Role does not exist');
    } else {
      // Update permissionValues for role
      for(const key of Object.keys(req.body)){
        var permission = role.PermissionSet.PermissionValues.find(el => key === el.PermissionId);
        if(permission !== undefined){
          await permission.update({
            value: req.body[key]
          });
        } else if(key === "name"){
          role.update({name: req.body[key]})
        };
      };
      res.status(200).send('SUCCESS');
      signallingServer.updateRoles();

      for(const user of role.Users){
        authFunctions.updateUserPerms(user.id);
      }
    };
  });

  router.delete("/role/:uuid/edit", expressFunctions.checkAuth, expressFunctions.hasPermission('edit_roles'), async(req,res)=>{
    var users = (await db.models.Role.findByPk(req.params.uuid, {
      include: db.models.User
    })).Users;
    await db.models.Role.destroy({
      where: {
        id: req.params.uuid
      }
    }).catch(err =>{
      res.status(400).send('ERROR: Sequelize error', err)
      return false;
    });;
    for(const user of users){
      authFunctions.updateUserPerms(user.id);
    }
    res.sendStatus(200);
    signallingServer.updateRoles();
  });

  router.post("/user/:uuid/roles/set", expressFunctions.checkAuth, expressFunctions.hasPermission("edit_roles"), async(req,res)=>{
    // need to make sure this gets updated for other clients, probs easiest just to get them to re-request the menu to begin with though this will end up closing any kind of dropdowns etc
    var user = await db.models.User.findByPk(req.params.uuid, {include: db.models.Role});
    var changes = req.body;
    if(user !== null){
      for(const [roleid, rolevalue] of Object.entries(changes)){
        if(user.Roles.map(a=>a.id).includes(roleid)){
          if([false, "false"].includes(rolevalue)){
            // remove role
            var oldRole = user.Roles.find(a=>a.id === roleid);
            if(!["owner", "all"].includes(oldRole.name)){
              await user.removeRole(oldRole)
            }
          }
        } else {
          var newRole = await db.models.Role.findByPk(roleid);
          // add role (if exists)
          if(newRole !== null){
            if(!["owner", "all"].includes(newRole.name)){
              await user.addRole(newRole)
            }
          }
        }
      }
    }
    res.sendStatus(200);
  });

  return router;
};