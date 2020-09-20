var LocalStrategy = require("passport-local").Strategy;
const { v4: uuidv4 } = require('uuid');

function validateUser(username){
  if (username !== undefined && username.length >= 3 && username.length <= 32){
    return true;
  } else {
    return false;
  }
}

function initialize(passport, db, temp_users) {
  passport.serializeUser(function (user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    if(id.startsWith("t::")){
      if (temp_users[id] === undefined) return done(null, false);
      var all_permissions = db.models.Role.rawAttributes;
      temp_users[id]["permissions"] = Object.keys(all_permissions).filter( field => field.startsWith('permission')).reduce((obj, key) => {obj[key] = all_permissions[key]['defaultValue']; return obj;}, {});
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

  passport.use(
    "pub_key",
    new LocalStrategy(
      {
        usernameField: "decrypted",
        passwordField: "decrypted",
        passReqToCallback: true,
      },
      function (req, username, password, done) {
        if (
          Buffer.from(JSON.parse(password).data).equals(
            Buffer.from(req.session.authData.data)
          )
        ) {
          var key_raw = req.session.publicKey;
          var publicKey = key_raw.replace(/(?:\r\n|\r|\n)/g, "");
          db.models.User.findOrCreate({
            where: {
              pub_key: publicKey,
            },
            defaults: {
              pub_key: publicKey,
            },
          }).then((result) => {
            return done(null, result[0].dataValues);
          });
        } else {
          return done(null, false);
        }
        req.session.authData = null; // I don't think this would actually be needed but I'll put it here just to be safe.
      }
    )
  );

  passport.use(
    "anon",
    new LocalStrategy(
      {
        usernameField: "name",
        passwordField: "name",
        passReqToCallback: true,
      },
      function (req, username, password, done) {
        var userID = `t::-${uuidv4()}`;
        var data = {
          id: userID,
          name: username
        };
        if (validateUser(username)){
          temp_users[userID] = data;
          return done(null, data);
        } else {
          return done(null, false);
        }
      }
    )
  );
}

module.exports = initialize;
