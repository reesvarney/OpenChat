var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');

function initialize(passport, db){
    passport.serializeUser(function(user, done) {
        console.log(user.id)
        return done(null, user.id);
    });
        
    passport.deserializeUser(function(id, done) {
        db.models.User.findOne({
            where: {
              id: id
            }
        }).then(function(result){
            if (result === null) return done(null, false);
            return done(null, result.dataValues); 
        });
    });

    passport.use(new LocalStrategy({
        usernameField: 'decrypted',
        passwordField: 'decrypted',
        passReqToCallback: true
        },function(req, username, password, done) {
        if(Buffer.from(JSON.parse(password).data).equals(Buffer.from(req.session.authData.data))){
            db.models.User.findOrCreate({
                where: {
                    pub_key: req.session.publicKey
                },
                defaults: {//object containing fields and values to apply
                    pub_key: req.session.publicKey
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