var path = require('path');
var express = require('express');
var router = express.Router();

router.use("/", express.static('./views/client',{index:"index.html",extensions:['html']}));

module.exports = router;