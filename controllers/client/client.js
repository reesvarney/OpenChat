var express = require('express');
var router = express.Router();

module.exports = function({config, db}){
    router.use(express.static('./views/static'));

    router.get('/', function(req, res) {
        if (req.isAuthenticated()){
            res.render('client/index', {config: config, db: db});
        }else {
            res.redirect('/auth');
        };
    });
    
    return router;
}