var express = require('express');
var router = express.Router();

module.exports = function(ext){
    router.get('/dl/:channel', function(req, res) {
        res.writeHead(200, {
              "Connection": "keep-alive"
            , "Content-Type": "application/x-mpegURL"             
        });

        if(ext.streams[req.params.channel]){
            ext.streams[req.params.channel].stream.pipe(res);
        };
    });
    
    return router;
}