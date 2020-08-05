var express = require('express');
var router = express.Router();
var ytdl = require('ytdl-core');
const yts = require( 'yt-search' );
var config = require('./package.json');
const path = require('path');
var channels = {};

module.exports = function(extension){  
    //SOCKET

    class channel{
        constructor(channel_id){
            this.queue = [];
            this.stream = new extController.stream({
                channel: channel_id,
                format: "mp3"
            });
            this.isPlaying = false;
            this.nowPlaying = {};
            this.id = channel_id;
        }

        play(data){
            var url = data.url;
            this.nowPlaying = data;
            this.isPlaying = true;
            var ytstream = ytdl(`${url}`, { filter: 'audioonly', highWaterMark: 4096}); //Increase buffer to hopefully resolve error 416
            stream.on('info', function(info, format){
                this.stream.setStream({
                    stream: ytstream,
                    format: format.container,
                    metdata: {
                        name: "",
                        source: ""
                    }
                }).on('end', function(){
                    if(this.queue.length != 0) {
                        this.play(this.queue.shift())
                    } else {
                        this.isPlaying = false;
                    }
                }.bind(this));
            }.bind(this));
        };

        addURL(data){
            if(this.isPlaying){
                this.queue.push(data);
            } else {
                this.play(data);
            }
        }
    };

    //EXPRESS ROUTER

    router.use(express.static(path.join(__dirname, './views/static')));



    router.post('/stream/:channelid/queue', function(req, res) {
        var opts = {};

        if(!ytdl.validateURL(req.body.vid_url)){
            opts.query = req.body.vid_url;
        } else {
            var id = ytdl.getVideoID(req.body.vid_url);
            opts.query = {videoId : id};
        }

        yts( opts, function ( err, r ) {
            if ( err ) throw err
            if(req.params.channelid in channels){
                channels[req.params.channelid].addURL(r.videos[0]);
            } else {
                channels[req.params.channelid] = new channel(req.params.channelid);
                channels[req.params.channelid].addURL(r.videos[0]);
            }
            res.sendStatus(200);
        });
    });

    extController.createRoute(`/${config.name}`, router);
    
}