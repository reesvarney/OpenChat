var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');

function hashPassword(password, salt) {
    var hash = crypto.createHash('sha256');
    hash.update(password);
    hash.update(salt);
    return hash.digest('hex');
}

function initialize(passport, db){
    passport.serializeUser(function(user, done) {
        return done(null, user.user_id);
    });
        
    passport.deserializeUser(function(id, done) {
        db.get('SELECT user_id, username FROM users WHERE user_id = ?', id, function(err, row) {
            if (!row) return done(null, false);
            return done(null, row);
        });
    });
    
    passport.use(new LocalStrategy(function (username, password, done) {
        db.get('SELECT salt FROM users WHERE username = ?', username, function (err, row) {
            if (!row) return done(null, false);
            var hash = hashPassword(password, row.salt);
            db.get('SELECT username, user_id FROM users WHERE username = $username AND password = $hash', 
            {
                "$username": username,
                "$hash": hash
            }
            , function (err, row) {
                if (!row) {
                    return done(null, false)
                };
                return done(null, row);
            });
        });
    }));
}

module.exports = initialize;