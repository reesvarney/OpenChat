var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var LocalStrategy = require("passport-local").Strategy;

function encrypt(pub_key, data) {
    return crypto.publicEncrypt(pub_key, Buffer.from(data, "utf-8"));
}

module.exports = {
  name: "email-pass",
  router: (name, {expressFunctions, passport})=>{
    router.get('/', expressFunctions.checkNotAuth, function(req,res){
        if('username' in req.query && req.query.username.length != 0){
            db.models.User.findOne({
                where: {
                    name: req.query.username
                }
            }).then(function(result){
                var salt = (result === null) ? crypto.randomBytes(128).toString('base64') : result.salt;
                res.render('auth/login', {salt: salt, username: req.query.username, step: 2});
            });
        } else {
            res.render('auth/login', {step: 1, failed: ("failed" in req.query) ? true : false});
        }
    });

    router.post('/', passport.authenticate(name, {failureRedirect: "/auth"}), function(req,res){
        res.redirect("/");
    });

    router.get('/register', expressFunctions.checkNotAuth, function(req,res){
        var salt = crypto.randomBytes(128).toString('base64');
        req.session.salt = salt;
        res.render('auth/register', {salt: salt});
    })

    router.post('/register', expressFunctions.checkNotAuth, function(req,res){
        if( req.session.salt == req.body.salt){
            var private_salt = crypto.randomBytes(128).toString('base64');
            var hash = crypto.createHash('sha256');
            hash.update(req.body.password);
            hash.update(private_salt);
            db.models.User.create({name: req.body.username, salt: req.body.salt, private_salt: private_salt, pass_hashed: hash.digest('hex')});
            res.redirect('/auth/login')
        };
    });

    return router;
  },
  strategy: ({db})=>{
    return new LocalStrategy(function(username, password, done) {
      var hash = crypto.createHash('sha256');
      hash.update(password);
      db.models.EmailPass.findOne({
          where: {
            email: username,
          }
      }).then(function(result){
          hash.update(result.private_salt);
          if (result === null || result.pass_hashed != hash.digest('hex')) return done(null, false);
          return done(null, result); 
      })
  })
  },
}