var events = require('events');
var express = require('express');
var path = require('path');
var router = express.Router();
const { Converter } = require("ffmpeg-stream");
const { createReadStream } = require('fs');
const { dirname } = require('path');

var OCstream = class {
    //Creates empty, combiner stream, this allows different streams to be piped in without it killing the stream when they end
    constructor(fmt_out){
        var converter = new Converter();
        this.isPlaying = false;
        this.format = fmt_out;
        this.input = converter.createInputStream({f: fmt_out});
        this.output = converter.createOutputStream({f: fmt_out, end: false});

        //stop the connection from timing out by sending silent audio
        setInterval(function(){ 
            if(!this.isPlaying){
                var silent_conv = new Converter();
                silent_conv.createOutputStream({f: fmt_out, end: false}).pipe(this.input);
                var silent_in = silent_conv.createInputStream({f: "m4a"});
                createReadStream(path.join(__dirname, './silence.m4a')).pipe(silent_in);
                silent_conv.run();
            }
        }.bind(this), 20000);
        converter.run();
    }

    //Converts a readable stream into realtime and pipes it into a combiner stream
    setStream(stream_in, fmt_in){
        this.isPlaying = true;
        var converter = new Converter();
        var realtime_in = converter.createInputStream({f: fmt_in, re: true});
        stream_in.pipe(realtime_in);
        converter.createOutputStream({f: this.format}).pipe(this.input, {end: false});
        setTimeout(function(){ converter.run()}, 4000); //add delay to try and remove some audio bugs on end
        realtime_in.on('end', function(){
            this.isPlaying = false;
        }.bind(this))
        return realtime_in;
    }
}

module.exports = class {
    constructor(){
        this.messageListener = new events.EventEmitter();
        this.router = router;
        this.stream = OCstream;
    };

    //Creates a new express route to the extension
    createRoute(path, new_router){
        router.use(path, new_router);
    }
}