var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var LocalStrategy = require("passport-local").Strategy;

function encrypt(pub_key, data) {
    return crypto.publicEncrypt(pub_key, Buffer.from(data, "utf-8"));
}

module.exports = {
  name: "pubkey",
  hidden: true,
  router: (name, {expressFunctions, passport})=>{
    router.get("/", expressFunctions.checkNotAuth, function (req, res) {
      var pub_key = req.query.public_key;
      req.session.authData = crypto.randomBytes(64);
      req.session.publicKey = pub_key;
      var enc_data = encrypt(pub_key, req.session.authData);
      res.send({ encoded_data: enc_data });
    });
  
    router.post("/",  passport.authenticate(name, { failureRedirect: "/auth" }), function (req, res) {
      res.send("success");
    });

    return router;
  },
  strategy: ({db, addModels})=>{
    return new LocalStrategy(
      {
        usernameField: "name",
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
          db.models.Pubkey.findOrCreate({
            where: {
              pub_key: publicKey,
            },
            include: db.models.User,
            defaults: {
              pub_key: publicKey,
            },
          }).then((result) => {
            if( !("User" in result[0]) || result[0].User === null){
              result[0].createUser({name: username}).then((user)=>{
                console.log(user);
                return done(null, user.dataValues);
              })
            } else {
              if (result[0].dataValues.name != username) {
                result[0].User.update({
                  name: username,
                }).then((user)=>{
                  return done(null, user.dataValues);
                });
              } else {
                return done(null, result[0].User.dataValues);
              }
            }
          });
        } else {
          return done(null, false);
        }
        req.session.authData = null;
      }
    )
  },
}

