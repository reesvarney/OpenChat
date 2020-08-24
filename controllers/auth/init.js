var LocalStrategy = require('passport-local').Strategy;

function initialize(passport, db){
    passport.serializeUser(function(user, done) {
        return done(null, user.id);
    });
        
    passport.deserializeUser(function(id, done) {
        var res = db.User.findOne({
            where: {
              id: id
            }
        });
        if (res === null) return done(null, false);
        return done(null, res); 
    });
    
    passport.use(new LocalStrategy(function (username, password, done) {
        var res = db.User.findOne({
            where: {
              name: username,
              pass_hashed: password
            }
        });
        if (res === null) return done(null, false);
        return done(null, res); 
    }));
}

module.exports = initialize;