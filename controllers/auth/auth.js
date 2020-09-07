var express = require("express");
var router = express.Router();
var crypto = require("crypto");

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth");
}

function checkNotAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

function encrypt(pub_key, data) {
  return crypto.publicEncrypt(
    {
      key: pub_key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(data)
  );
}

module.exports = function ({ db, passport }) {
  router.get("/", checkNotAuth, function (req, res) {
    var pub_key = req.query.public_key;
    req.session.authData = crypto.randomBytes(128);
    req.session.publicKey = pub_key;
    var enc_data = encrypt(Buffer.from(pub_key), req.session.authData);
    res.send({ encoded_data: enc_data });
  });

  router.post("/",  passport.authenticate("local", { failureRedirect: "/loginFailed" }), function (req, res) {
      res.redirect("/");
    }
  );

  router.post("/anon", (req, res) => {
    if (req.body.name !== undefined &&req.body.name.length >= 3 &&req.body.name.length <= 32) {
      req.session.name = req.body.name;
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  });

  return router;
};
