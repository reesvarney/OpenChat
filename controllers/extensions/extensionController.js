var events = require('events');
var express = require('express');
var router = express.Router();
const { Converter } = require("ffmpeg-stream");

module.exports = class {
    constructor(){
        this.messageListener = new events.EventEmitter();
        this.router = router;
    };

    //Creates empty, combiner stream, this allows different streams to be piped in without it killing the stream when they end
    createStream(fmt_out){
        var converter = new Converter();
        var stream = {};
        stream.format = fmt_out;
        stream.input = converter.createInputStream({f: fmt_out});
        stream.output = converter.createOutputStream({f: fmt_out, end: false});
        converter.run();
        return stream;
    }

    //Converts a readable stream into realtime and pipes it into a combiner stream
    setStream(stream_in, fmt_in, stream_out){
        var converter = new Converter();
        var realtime_in = converter.createInputStream({f: fmt_in, re: true});
        stream_in.pipe(realtime_in);
        converter.createOutputStream({f: stream_out.format}).pipe(stream_out.input, {end: false});
        converter.run();
        return realtime_in;
    }

    //Creates a new express route to the extension
    createRoute(path, new_router){
        router.use(path, new_router);
    }
}