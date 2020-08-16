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

module.exports = function (db, conf, fs) {
    router.use(session({ secret: conf.secret, resave: true, saveUninitialized: true, cookie: { secure: true } }));
    initializePassport(passport, db);
    router.use("/", express.static('./views/admin/static'));
    router.use(passport.initialize());
    router.use(cookieParser);
    router.use(bodyParser.urlencoded({ extended: false }));
    router.use(passport.session());
    
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

    function updateConf(res){
        fs.writeFile("./conf.json", JSON.stringify(conf, null, 2), function(err) {
            if(res){
                if(err) {
                    res.sendStatus(500);
                }
                res.redirect(302, "/admin");
            }
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
        db.all("SELECT * FROM iplogs", {}, function(err, result){
            if (err) throw err;
            res.render('admin/index', {
                conf: conf,
                users: result
            });
        })

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
        var channel = findChannel(req.params.uuid);
        var index = channel.index;
        var type = channel.type;
        conf.server.channels[type].splice(index, 1);
        updateConf();
        if(type == "text"){
            db.run(`DELETE FROM messages WHERE channel_id=?`, req.params.uuid, function(err) {
                if (err) {
                  return console.error(err.message);
                }
                console.log(`Message(s) deleted ${this.changes}`);
            });
        }
        res.status(200).send();
    });

    router.post("/channel/:uuid/update", checkAuth, function(req,res){
        var name = req.body.name;
        var description = req.body.description;
        var channel = findChannel(req.params.uuid);
        var pos = req.body.position;
        if (pos != channel.index && pos >= 0 && pos < conf.server.channels[channel.type].length && pos % 1 == 0){
            conf.server.channels[channel.type].move(channel.index, pos)
            channel.index = pos;
        }
        conf.server.channels[channel.type][channel.index].channel_name = name;
        conf.server.channels[channel.type][channel.index].channel_description = description;
        updateConf(res);
    });

    router.post("/users/blacklist", checkAuth, function(req,res){
        var ip = req.body.ip;
        conf.blacklist.push(ip);
        updateConf(res);
    })

    router.delete("/users/blacklist", checkAuth, function(req,res){
        var ip = req.query.ip;
        var index = conf.blacklist.indexOf(ip);
        conf.blacklist.splice(index, 1);
        updateConf();
        res.status(200).send();
    })

    router.post("/channel/new", checkAuth, function(req,res){
        var uuid = uuidv4();
        var name = req.body.name;
        var type = req.body.type;
        var channel_data = {
            "channel_name" : name,
            "uuid" : uuid
        };
        if(type == "text"){
            var description = req.body.description;
            if (description.length > 0){
                channel_data.channel_description = description;
            }
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