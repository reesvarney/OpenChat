let express = require("express");
let router = express.Router();
let crypto = require("crypto");
let LocalStrategy = require("passport-local").Strategy;
const bcrypt = require('bcrypt');
let saltRounds = 10;

function preHash(string){
  return crypto.createHash("sha256").update(string).digest("hex");
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
          let salt = (result === null) ? crypto.randomBytes(128).toString('base64') : result.salt;
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
      // Generate and send salt for user to generate the password with, preventing the server from ever seeing it
      let salt = crypto.randomBytes(128).toString('base64');
      req.session.salt = salt;
      res.render('auth/email-pass/register', {
        salt: salt,
        failed: ("failed" in req.query) ? true : false
      });
    })

    router.post('/register', expressFunctions.checkNotAuth, function (req, res) {
      if (req.session.salt == req.body.salt) {
        bcrypt.hash(preHash(req.body.password), saltRounds, function(err, pass_hashed) {
          db.models.EmailPass.create({
            email: req.body.email,
            salt: req.body.salt,
            pass_hashed: pass_hashed
          }).catch((err)=>{
            res.redirect(`/auth/email-pass/register?failed`);
          }).then((authMethod) => {
            if(authMethod !== undefined){
              authMethod.createUser({
                name: req.body.username
              }).catch((err)=>{
                res.redirect(`/auth/email-pass/register?failed`);
                authMethod.destroy();
              }).then((user) => {
                if(user !== undefined){
                  res.redirect(`/auth/email-pass?email=${req.body.email}`)
                };
              })
            }
          });
        });
      };
    });

    return router;
  },
  strategy: ({db}) => {
    return new LocalStrategy(function (username, password, done) {
      db.models.EmailPass.findOne({
        where: {
          email: username,
        },
        include: db.models.User
      }).then(function (result) {
        if (result === null) return done(null, false);
        let prehashed = preHash(password);
        bcrypt.compare(prehashed, result.pass_hashed, function(err, isCorrect) {
          if(isCorrect !== true){
            return done(null, false);
          } else {
            return done(null, result.User);
          }
        });
      })
    })
  },
}