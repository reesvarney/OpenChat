var express = require('express');
var router = express.Router();

module.exports = function({config, db}){
    router.use(express.static('./views/static'));

    router.get('/', function(req, res) {
        res.render('client/index', {config: config, db: db});
    });
    
    return router;
}