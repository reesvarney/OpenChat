var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var LocalStrategy = require("passport-local").Strategy;

function encrypt(pub_key, data) {
  return crypto.publicEncrypt(pub_key, Buffer.from(data, "utf-8"));
}

module.exports = {
  name: "email-pass",
  displayName: "Email/ Password Login",
  icon: "lock",
  hidden: false,
  router: (name, {
    expressFunctions,
    passport,
    db
  }) => {
    router.get('/', expressFunctions.checkNotAuth, function (req, res) {
      if ('email' in req.query && req.query.email.length != 0) {
        db.models.EmailPass.findOne({
          where: {
            email: req.query.email
          }
        }).then(function (result) {
          var salt = (result === null) ? crypto.randomBytes(128).toString('base64') : result.salt;
          res.render('auth/email-pass/login', {
            salt: salt,
            email: req.query.email,
            step: 2
          });
        });
      } else {
        res.render('auth/email-pass/login', {
          step: 1,
          failed: ("failed" in req.query) ? true : false
        });
      }
    });

    router.post('/', passport.authenticate(name, {
      failureRedirect: "/auth/email-pass?failed"
    }), function (req, res) {
      res.redirect("/");
    });

    router.get('/register', expressFunctions.checkNotAuth, function (req, res) {
      var salt = crypto.randomBytes(128).toString('base64');
      req.session.salt = salt;
      res.render('auth/email-pass/register', {
        salt: salt
      });
    })

    router.post('/register', expressFunctions.checkNotAuth, function (req, res) {
      if (req.session.salt == req.body.salt) {
        var private_salt = crypto.randomBytes(128).toString('base64');
        var hash = crypto.createHash('sha256');
        hash.update(req.body.password);
        hash.update(private_salt);
        var pass_hashed = hash.digest('hex');
        db.models.EmailPass.create({
          email: req.body.email,
          salt: req.body.salt,
          private_salt: private_salt,
          pass_hashed: pass_hashed
        }).then((authMethod) => {
          authMethod.createUser({
            name: req.body.username
          }).then((user) => {
            res.redirect(`/auth/email-pass?email=${req.body.email}`)
          })
        });
      };
    });

    return router;
  },
  strategy: ({
    db
  }) => {
    return new LocalStrategy(function (username, password, done) {
      var hash = crypto.createHash('sha256');
      hash.update(password);
      db.models.EmailPass.findOne({
        where: {
          email: username,
        },
        include: db.models.User
      }).then(function (result) {
        if (result === null) return done(null, false);
        hash.update(result.dataValues.private_salt);
        var pass_hashed = hash.digest('hex');
        if (result.dataValues.pass_hashed != pass_hashed) return done(null, false);
        return done(null, result.User.dataValues);
      })
    })
  },
}