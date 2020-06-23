var path = require('path');
var express = require('express');
var router = express.Router();

router.use((req, res, next) => {
    if (req.connection.localAddress === req.connection.remoteAddress){
        next();
    } else {
        res.status(400).send('MCU needs to be ran locally');
    }
}, express.static('./views/mcu/static' ,{index:"mcu.html",extensions:['html']}));

module.exports = router;