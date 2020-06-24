var express = require('express');
var router = express.Router();
var passport = require('passport');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')();
var initializePassport = require('./passport-init.js');

module.exports = function (db, conf) {

    router.use(session({ secret: conf.secret, resave: true, saveUninitialized: true, cookie: { secure: true } }));
    initializePassport(passport, db);
    router.use("/", express.static('./views/admin/static'));
    router.use(passport.initialize());
    router.use(cookieParser);
    router.use(bodyParser.urlencoded({ extended: false }))
    router.use(passport.session());

    function checkAuth(req, res, next){
        if (req.isAuthenticated()){
            return next();
        };

        res.redirect('admin/login')
    }

    function checkNotAuth(req, res, next){
        if (!req.isAuthenticated()){
            return next();
        };

        res.redirect('/admin')
    }

    router.get("/", checkAuth, function (req, res, next) {
        res.render('admin/index', {
            conf: conf
        });
    });

    router.get("/login", checkNotAuth, function(req, res){
        res.render('admin/login')
    });

    router.post("/login", 
    passport.authenticate('local', {failureRedirect: "login"}), 
    function(req,res){
        res.redirect("/admin");
    });

    return router;
};