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
            }
        }).then(function(result){
            if (result === null) return done(null, false);
            return done(null, result); 
        });
    });
    
    passport.use(new LocalStrategy(function(username, password, done) {
        var hash = crypto.createHash('sha256');
        hash.update(password);
        db.models.User.findOne({
            where: {
              name: username,
            }
        }).then(function(result){
            hash.update(result.private_salt);
            if (result === null && result.pass_hashed != hash.digest('hex')) return done(null, false);
            return done(null, result); 
        })

    }));
}

module.exports = initialize;