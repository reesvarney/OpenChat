const ogs = require('open-graph-scraper');
var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./db/openchat.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    router.get('/channels/:channel', function(req, res){
        if(req.query.page == undefined){
            req.query.page = 0;
        }
        db.all(`SELECT * FROM messages WHERE channel_id=$channel_id ORDER BY message_date DESC LIMIT $query_start , 50`,
        {
            $channel_id: req.params.channel,
            $query_start: req.query.page * 50
        },
        function (err, result) {
            if (err) throw err;
            if(result.length == 0){
                result = null;
            }
            res.send(result);
        });
    });

    router.get('/ogp', function(req, res){
        ogs({ url: req.query.url }, (error, results, response) => {
            res.send(results);
        });
    });
});

module.exports = router;