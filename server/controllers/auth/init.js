function initialize(passport, db, temp_users) {
  passport.serializeUser(function (user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    if (id.startsWith("t::")) {
      if (temp_users[id] === undefined) return done(null, false);
      var all_permissions = db.models.Role.rawAttributes;
      // In future, check for default role
      temp_users[id]["permissions"] = Object.keys(all_permissions)
        .filter((field) => field.startsWith("permission"))
        .reduce((obj, key) => {
          obj[key] = all_permissions[key]["defaultValue"];
          return obj;
        }, {});
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

  //TODO - LOAD THESE DYNAMICALLY AS MODULES
  passport.use(
    "pubkey",
    require('./methods/pubkey.js').strategy({db})
  );

  passport.use(
    "anon",
    require('./methods/anon.js').strategy({temp_users})
  );
}

module.exports = initialize;
