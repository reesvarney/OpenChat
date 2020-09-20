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

module.exports = function ({ passport }) {
  router.get("/pubkey", checkNotAuth, function (req, res) {
    
    var pub_key = req.query.public_key;
    req.session.authData = crypto.randomBytes(128);
    req.session.publicKey = pub_key;
    var enc_data = encrypt(Buffer.from(pub_key), req.session.authData);
    res.send({ encoded_data: enc_data });
  });

  router.post("/pubkey",  passport.authenticate("pub_key", { failureRedirect: "/auth" }), function (req, res) {
    res.send("success");
  });

  router.get("/anon", checkNotAuth, (req, res) => {
    res.render('auth/anon')
  });

  router.post("/anon", passport.authenticate("anon", { failureRedirect: "/auth/anon" }), (req, res) => {
    res.redirect('/');
  });

  router.use(express.static("./views/static"));

  return router;
};
