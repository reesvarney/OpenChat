var events = require('events');
var express = require('express');
var path = require('path');
var router = express.Router();
const { Converter } = require("ffmpeg-stream");
const { createReadStream } = require('fs');
var io;

var OCstream = class {
    //Creates empty, combiner stream, this allows different streams to be piped in without it killing the stream when they end
    constructor(fmt_out){
        var converter = new Converter();
        this.isPlaying = false;
        this.format = fmt_out;
        this.input = converter.createInputStream({f: fmt_out});
        this.output = converter.createOutputStream({f: fmt_out, end: false});
        converter.run();

        //stop the connection from timing out by sending silent audio
        setInterval(function(){ 
            if(!this.isPlaying){
                console.log('send silence')
                this.setStream(createReadStream(path.join(__dirname, './silence.m4a')), "m4a");
            }
        }.bind(this), 20000);
    }

    //Converts a readable stream into realtime and pipes it into a combiner stream
    setStream(stream_in, fmt_in){
        this.isPlaying = true;
        var converter = new Converter();
        var realtime_in = converter.createInputStream({f: fmt_in, re: true});
        stream_in.pipe(realtime_in);
        converter.createOutputStream({f: this.format}).pipe(this.input, {end: false});
        setTimeout(function(){ converter.run()}, 2000); //add delay to try and remove some audio bugs on end
        realtime_in.on('end', function(){
            this.isPlaying = false;
        }.bind(this))
        return realtime_in;
    }
}

var room = class {
    constructor(name){
        this.socket = io.to(`/extensions/${name}`)
    }
}

module.exports = class {
    constructor(extension_data){
        this.messageListener = new events.EventEmitter();
        this.router = router;
        this.stream = OCstream;
        this.data = {
            server_config: extension_data.server_config
        };
        io = extension_data.io;
        this.room = room;
        this.extensions = {};
    };

    sendMessage(data, sender){
        var content = data.content;
        var channel = data.channel;
        this.messageListener.emit('sendMessage', {
            sender: this.extensions[sender].oc_config.disp_name,
            content: content,
            channel: channel
        });
    }
    //Creates a new express route to the extension
    createRoute(path, new_router){
        router.use(path, new_router);
    }
}