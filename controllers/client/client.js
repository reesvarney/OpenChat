var express = require('express');
var router = express.Router();

module.exports = function(conf){
    router.use(express.static('./views/client/static'));

    router.get('/', function(req, res) {
        res.render('client/index', {conf: conf});
    });
    
    return router;
}