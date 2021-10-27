let express = require("express");
let router = express.Router();

module.exports = function ({ config, db, expressFunctions, temp_users }) {
  router.use(express.static("./views/assets/dist"));

  router.get("/", expressFunctions.checkAuth, async(req, res)=>{
    let viewData = { config, db, req };

    // Customise data according to permissions
    if(req.user.permissions.global.edit_roles){
      viewData["roles"] = await db.models.Role.findAll({
        include: [{
          model: db.models.PermissionSet,
          include: [{
            model:db.models.PermissionValue,
            include: db.models.Permission
          }]
        }]
      });
    } else {
      viewData["roles"] = {};
    };

    // Render the view
    res.render("client/index", viewData);
  });

  router.get("/users/:id/interact", expressFunctions.checkAuth, async(req,res)=>{
    if(req.params.id in temp_users){
      user = temp_users[req.params.id]
      user.temp = true;
    } else {
      user = await db.models.User.findByPk(req.params.id);
      user.temp = false;
    }

    if(user === null){
      res.sendStatus(400);
    } else {
      let roles = null;
      if(user.temp !== true && req.user.permissions.global.edit_roles){
        roles = (await db.models.Role.findAll()).map((a)=>{
          return {
          name: a.name, 
          id: a.id, 
          value: false
          }
        });
        let userRoles = await user.getRoles();
        for(const role of userRoles){
          roles[roles.findIndex(b=> b.id === role.id)].value = true;
        };
      }
  
      res.render("client/_user_interact", {req, user, roles});
    }
  });

  router.get("/channels/:id", expressFunctions.checkAuth, async(req, res)=>{
    let channel = await db.models.Channel.findByPk(req.params.id);
    if(channel === null){
      res.status(400).send("Channel does not exist");
    } else {
      let viewData = { req, data: channel};
      res.render(`client/_channel`, viewData);
    }
  });

  return router;
};
