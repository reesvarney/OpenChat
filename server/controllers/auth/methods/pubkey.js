var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var LocalStrategy = require("passport-local").Strategy;

function encrypt(pub_key, data) {
    return crypto.publicEncrypt(pub_key, Buffer.from(data, "utf-8"));
}

module.exports = {
  name: "pubkey",
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
  strategy: ({db})=>{
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
          db.models.User.findOrCreate({
            where: {
              pub_key: publicKey,
            },
            defaults: {
              name: username,
              pub_key: publicKey,
            },
          }).then((result) => {
            if (result[0].dataValues.name != username) {
              result[0].update({
                name: username,
              });
            }
            return done(null, result[0].dataValues);
          });
        } else {
          return done(null, false);
        }
        req.session.authData = null;
      }
    )
  }
}

