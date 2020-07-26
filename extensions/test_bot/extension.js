var express = require('express');
var router = express.Router();
var ytdl = require('ytdl-core');
const yts = require( 'yt-search' );
var config = require('./package.json');
const path = require('path');
var channels = {};

module.exports = function(extData){
    var messageListener = extData.controller.messageListener;

    messageListener.on('newMessage', function(msg){
        if(msg.message_content == "!foo"){
            messageListener.emit('sendMessage', {
                sender: config.oc_config.disp_name,
                content: "bar!",
                channel: msg.channel_id
            })
        }
    });

    class channel{
        constructor(){
            this.queue = [];
            this.stream = extData.controller.createStream("mp3");
            this.isPlaying = false;
            this.nowPlaying = {};
        }

        play(data){
            var url = data.url;
            this.nowPlaying = data;
            this.isPlaying = true;
            var stream = ytdl(`${url}`, { filter: format => format.container === 'mp4' }) //mp4 for maximum compatibility
            extData.controller.setStream(stream, "mp4", this.stream).on('end', function(){
                if(this.queue.length != 0) {
                    this.play(this.queue.shift())
                } else {
                    this.isPlaying = false;
                }
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

    router.use(express.static(path.join(__dirname, './views/static')));

    router.get('/channel/:channelid', function(req, res){
        if(!(req.params.channelid in channels)){
            channels[req.params.channelid] = new channel();
        }
        res.render(path.join(__dirname, './views/channel'), {
            channel_id: req.params.channelid,
            config: config,
            channelData: channels[req.params.channelid]
        })
    });

    router.get('/stream/:channelid', function(req, res) {
        res.writeHead(200, {
              "Connection": "keep-alive"
            , "Content-Type": "application/x-mpegURL"
            , "Transfer-Encoding" : "chunked"        
        });
        if(req.params.channelid in channels){
            channels[req.params.channelid].stream.output.pipe(res);
        } else {
            channels[req.params.channelid] = new channel();
            channels[req.params.channelid].stream.output.pipe(res);
        }
    });

    router.post('/stream/:channelid/queue', function(req, res) {
        var opts = {};

        if(!ytdl.validateURL(req.body.vid_url)){
            opts.query = req.body.vid_url;
        } else {
            var id = ytdl.getVideoID(req.body.vid_url);
            opts.query = {videoId : id};
        }

        yts( req.body.vid_url, function ( err, r ) {
            if ( err ) throw err
            if(req.params.channelid in channels){
                channels[req.params.channelid].addURL(r.videos[0]);
            } else {
                channels[req.params.channelid] = new channel();
                channels[req.params.channelid].addURL(r.videos[0]);
            }
            res.sendStatus(200);
        });
    });

    extData.controller.createRoute(`/${config.name}`, router);
    
}