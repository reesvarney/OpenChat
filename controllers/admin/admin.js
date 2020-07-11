var express = require('express');
var router = express.Router();
var passport = require('passport');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')();
var initializePassport = require('./passport-init.js');
const { v4: uuidv4 } = require('uuid');

Array.prototype.move = function (from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

function findChannel(ch_uuid){
    var data = {};
    var types = Object.keys(conf.server.channels);
    for(i = 0; i < types.length; i++){
        var results = conf.server.channels[types[i]].find(({ uuid } )=> uuid == ch_uuid);
        if( results != undefined){
            data.index = conf.server.channels[types[i]].findIndex(({ uuid } )=> uuid == ch_uuid);
            data.type = types[i];
        }
    }
    return data
}

module.exports = function (db, conf, fs) {
    router.use(session({ secret: conf.secret, resave: true, saveUninitialized: true, cookie: { secure: true } }));
    initializePassport(passport, db);
    router.use("/", express.static('./views/admin/static'));
    router.use(passport.initialize());
    router.use(cookieParser);
    router.use(bodyParser.urlencoded({ extended: false }));
    router.use(passport.session());

    function updateConf(res){
        fs.writeFile("./conf.json", JSON.stringify(conf, null, 2), function(err) {
            if(err) {
                res.sendStatus(500);
            }
            res.redirect(302, "/admin");
        }); 
    }

    function checkAuth(req, res, next){
        if (req.isAuthenticated()){
            return next();
        };

        res.redirect('/admin/login')
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

    router.get('/logout', checkAuth, function(req, res){
        req.logout();
        res.redirect('/admin/login');
    });

    router.get("/channel/template", checkAuth, function(req,res){
        res.render("admin/_channel", { 
        data : {
            channel_type: req.query.type,
            channel_name: "",
            new: true
        }
        });
    });

    router.delete("/channel/:uuid", checkAuth, function(req, res) {
        var index = conf.server.channels.findIndex(({ uuid } )=> uuid == req.params.uuid);
        var type = conf.server.channels[index].channel_type;
        conf.server.channels.splice(index, 1);
        updateConf(res);
        if(type == "text"){
            db.run(`DELETE FROM messages WHERE channel_id=?`, req.params.uuid, function(err) {
                if (err) {
                  return console.error(err.message);
                }
                console.log(`Message(s) deleted ${this.changes}`);
            });
        }
        res.redirect(302, "/admin");
    });

    router.post("/channel/:uuid/update", checkAuth, function(req,res){
        var name = req.body.name;
        var description = req.body.description;
        var channel = findChannel(req.params.uuid);
        conf.server.channels[channel.type][channel.index].channel_name = name;
        conf.server.channels[channel.type][channel.index].channel_description = description;
        updateConf(res);
    });

    router.post("/channel/new", checkAuth, function(req,res){
        var uuid = uuidv4();
        var name = req.body.name;
        var description = req.body.description;
        var type = req.body.type;
        var channel_data = {
            "channel_name" : name,
            "uuid" : uuid
        };
        if (description.length > 0){
            channel_data.channel_description = description;
        }
        conf.server.channels[type].push(channel_data);
        updateConf(res);
    });

    router.post("/server/update", checkAuth, function(req,res){
        conf.server.name = req.body.name;
        updateConf(res);
    })

    return router;
};