function initialize(passport, db, temp_users) {
  db.models.Role.findOrCreate({
    where: {
        name: "default"
    },
    defaults: {
        name: "default"
    }
  }).then((defaultPermissions) =>{
    passport.serializeUser(function (user, done) {
      return done(null, user.id);
    });
  
    passport.deserializeUser(function (id, done) {
      // Check if the id starts with `t::` which is used to denote temporary users. Else they are a normal user
      if (id.startsWith("t::")) {
        if (temp_users[id] === undefined) return done(null, false);
        // In future, check for default role
        temp_users[id]["permissions"] = defaultPermissions;
        temp_users[id]["permissions"].permission_send_message = false;
        return done(null, temp_users[id]);
      } else {
        db.models.User.findOne({
          where: {
            id: id,
          },
          include: [db.models.Role],
        }).then(function (result) {
          if (result === null) return done(null, false);
          var user = result.dataValues;
          var permissions = {};
          if(user.Roles.length === 0){
            result.addRole(defaultPermissions[0]).catch(err=>{console.log('Unique constraint exists')})
            for (const [key, value] of Object.entries(defaultPermissions[0].dataValues)) {
              if (~key.indexOf("permission")) {
                permissions[key] = value ? true : false;
              }
            }
          } else {
            user.Roles.some((data) => {
              var role = data.dataValues;
              if (role.isAdmin) {
                for (const [key, value] of Object.entries(role)) {
                  if (~key.indexOf("permission")) {
                    permissions[key] = true;
                  }
                }
                return true;
              } else {
                for (const [key, value] of Object.entries(role)) {
                  if (~key.indexOf("permission")) {
                    permissions[key] = value ? true : false;
                  }
                }
                return false;
              }
            });
          }
          user.permissions = permissions;
          return done(null, user);
        });
      }
    });
  });

}

module.exports = initialize;
