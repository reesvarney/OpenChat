function initialize(passport, db, temp_users) {
  var defaultPermissions = Object.keys(db.models.Role.rawAttributes)
  .filter((field) => field.startsWith("permission"))
  .reduce((obj, key) => {
    obj[key] = db.models.Role.rawAttributes[key]["defaultValue"];
    return obj;
  }, {});

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
        var user = result.dataValues;
        var permissions = {};
        if(user.Roles.length === 0){
          permissions = defaultPermissions;
        }
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
        user.permissions = permissions;
        if (result === null) return done(null, false);
        return done(null, user);
      });
    }
  });
}

module.exports = initialize;
