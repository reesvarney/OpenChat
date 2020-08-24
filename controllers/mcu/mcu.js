var path = require('path');
var express = require('express');
var router = express.Router();


module.exports = function({secret}){
    router.use((req, res, next) => {
        if (req.connection.localAddress === req.connection.remoteAddress){
            next();
        } else {
            res.status(400).send('MCU needs to be ran locally');
        }
    }, express.static('./views/static'));

    router.get('/', function(req, res) {
        res.render('mcu/index', {mcu_secret: secret});
    });

    return router;
};