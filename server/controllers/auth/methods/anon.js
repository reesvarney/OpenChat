let express = require("express");
let router = express.Router();
let LocalStrategy = require("passport-local").Strategy;
const { v4: uuidv4 } = require("uuid");
function validateName(username){
  if (username !== undefined && username.length >= 2 && username.length <= 32) {
      return true;
  } else {
      return false;
  }
};

module.exports = {
  name: "anon",
  displayName: "Anonymous Login",
  icon: "user-secret",
  hidden: false,
  router: (name, {expressFunctions, passport})=>{
    router.get("/", expressFunctions.checkNotAuth, (req, res) => {
      res.render('auth/anon/login');
    });

    router.post("/", passport.authenticate(name, { failureRedirect: "/auth/anon?failed" }), (req, res) => {
      res.redirect('/');
    });

    return router;
  },

  strategy: ({temp_users})=>{
    return new LocalStrategy(
    {
      usernameField: "name",
      passwordField: "name",
      passReqToCallback: true,
    },
    function (req, username, password, done) {
      let userID = `t::-${uuidv4()}`;
      let data = {
        id: userID,
        name: username,
      };
      if (validateName(username)) {
        temp_users[userID] = data;
        return done(null, data);
      } else {
        return done(null, false);
      }
    }
    )
  }
}