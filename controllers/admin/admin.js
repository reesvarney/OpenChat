var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');

Array.prototype.move = function (from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

module.exports = function ({db, conf}) {
    function hasPermission(perm){
        return function(req, res, next){
            if (req.isAuthenticated()){
                if(req.user.permissions[perm]){
                    return next();
                }
                res.redirect('/');
            };
    
            res.redirect('/admin/login')
        }
    };

    function checkAuth(req, res, next){
        if (req.isAuthenticated()){
            return next();
        };

        res.redirect('/admin/login')
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

    router.post("/channel/new", hasPermission('permission_edit_channels'), function(req,res){
        var name = req.body.name;
        var type = req.body.type;
        db.models.Channel.create({
            name : name,
            type: type
        }).then((result)=>{
            res.redirect('/')
        });
    });

    router.post("/server/update", checkAuth, function(req,res){
        conf.server.name = req.body.name;
        updateConf(res);
    })

    return router;
};