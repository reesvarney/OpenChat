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

  // TODO: EXTEND THE RECORD PROTOTPYE
  async function insertBefore({table, id, before}){
    if([undefined, null].includes(db.models[table].rawAttributes.position)){
      var item = await db.models[table].findByPk(id);
      var nextItem = await db.models[table].findByPk(before);
      var newPos = nextItem.position;
      var oldPos = item.position;

      if(oldPos > newPos){
        db.models[table].update({
          position: db.literal('field + 1')
        }, 
        {
          where: {
            id: {
              [Op.ne]: item.id
            },
            position: {
              [Op.gte]: newPos,
              [Op.lt]: oldPos
            }
          }
        });
      } else if(oldPos < newPos){
        db.models[table].update({
          position: db.literal('field - 1')
        }, 
        {
          where: {
            id: {
              [Op.ne]: item.id
            },
            position: {
              [Op.lte]: newPos,
              [Op.gt]: oldPos
            }
          }
        });
      } else {
        console.log('Insert Position: Invalid id constraints')
      }

      item.update({
        position: newPos
      });
    }
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
    var isError = false;
    (async()=>{
      await db.models.Channel.create({
        name: name,
        type: type
      }).catch(err =>{
        isError = true;
        res.status(400).send(err)
      })
      // TODO: Use socketio to update dynamically without redirect and disconnect users if voice channel
      if(!isError){res.redirect('/')};
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