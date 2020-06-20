const ogs = require('open-graph-scraper');
var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
    ogs({ url: req.query.url }, (error, results, response) => {
        res.send(results);
    });
});
  

async function getOGP(url) {

}

module.exports = router;