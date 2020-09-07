var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');

function initialize(passport, db){
    passport.serializeUser(function(user, done) {
        return done(null, user.id);
    });
        
    passport.deserializeUser(function(id, done) {
        db.models.User.findOne({
            where: {
              id: id
            },
            include: [
                db.models.Role,
            ]
        }).then(function(result){
            var user = result.dataValues;
            var permissions = {}
            user.Roles.some((data) => {
                var role = data.dataValues;
                if (role.isAdmin){
                    for (const [key, value] of Object.entries(role)) {
                        if(~key.indexOf("permission")){permissions[key] = true};
                    };
                    return true;
                } else {
                    for (const [key, value] of Object.entries(role)) {
                        if(~key.indexOf("permission")){permissions[key] = (value) ? true : false;}
                    };
                    return false;
                };
            });
            user.permissions = permissions;
            if (result === null) return done(null, false);
            return done(null, user); 
        });
    });

    passport.use(new LocalStrategy({
        usernameField: 'decrypted',
        passwordField: 'decrypted',
        passReqToCallback: true
        },function(req, username, password, done) {
        if(Buffer.from(JSON.parse(password).data).equals(Buffer.from(req.session.authData.data))){
            var key_raw = req.session.publicKey
            var publicKey = key_raw.replace(/(?:\r\n|\r|\n)/g, "");
            db.models.User.findOrCreate({
                where: {
                    pub_key: publicKey
                },
                defaults: {
                    pub_key: publicKey
                }
            }).then((result) => {
                return done(null, result[0].dataValues);
            });
        } else {
            return done(null, false);
        }
        req.session.authData = null;  // I don't think this would actually be needed but I'll put it here just to be safe.
    }));
}

module.exports = initialize;