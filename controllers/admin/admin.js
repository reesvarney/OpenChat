var path = require('path');
var express = require('express');
var router = express.Router();

router.use("/", express.static( './views/admin/static',{index:"index.html",extensions:['html']}));

module.exports = router;