var events = require('events');
var express = require('express');
var path = require('path');
var router = express.Router();
const { Converter } = require("ffmpeg-stream");
const { createReadStream } = require('fs');
const { dirname } = require('path');

module.exports = class {
    constructor(){
        this.messageListener = new events.EventEmitter();
        this.router = router;
    };

    //Creates empty, combiner stream, this allows different streams to be piped in without it killing the stream when they end
    createStream(fmt_out){
        var converter = new Converter();
        var stream = {};
        stream.isPlaying = false;
        stream.format = fmt_out;
        stream.input = converter.createInputStream({f: fmt_out});
        stream.output = converter.createOutputStream({f: fmt_out, end: false});
        //stop the connection from timing out by sending silent audio
        var silent_conv = new Converter();
        silent_conv.createOutputStream({f: fmt_out, end: false}).pipe(stream.input);
        setInterval(function(){ 
            if(!stream.isPlaying){
                var silent_in = silent_conv.createInputStream({f: "m4a"});
                createReadStream(path.join(__dirname, './silence.m4a')).pipe(silent_in);
            }
        }, 20000);
        converter.run();
        return stream;
    }

    //Converts a readable stream into realtime and pipes it into a combiner stream
    setStream(stream_in, fmt_in, stream_out){
        stream_out.isPlaying = true;
        var converter = new Converter();
        var realtime_in = converter.createInputStream({f: fmt_in, re: true});
        stream_in.pipe(realtime_in);
        converter.createOutputStream({f: stream_out.format}).pipe(stream_out.input, {end: false});
        setTimeout(function(){ converter.run()}, 4000); //add delay to try and remove some audio bugs on end
        realtime_in.on('end', function(){
            stream_out.isPlaying = false;
        })
        return realtime_in;
    }

    //Creates a new express route to the extension
    createRoute(path, new_router){
        router.use(path, new_router);
    }
}