var events = require('events');
const { Converter } = require("ffmpeg-stream");

module.exports = class {
    constructor(){
        this.messageListener = new events.EventEmitter();
        this.streams = {};
    };

    createStream(channel, fmt_out){
        this.streams[channel] = {};
        var converter = new Converter();
        this.streams[channel].format = fmt_out;
        this.streams[channel].input = converter.createInputStream({f: fmt_out});
        this.streams[channel].stream = converter.createOutputStream({f: fmt_out, end: false});
        converter.run();
    }

    sendStream(stream, channel, fmt_in){
        var temp_converter = new Converter();
        var temp_in = temp_converter.createInputStream({f: fmt_in, re: true});
        temp_converter.createOutputStream({f: this.streams[channel].format}).pipe(this.streams[channel].input, {end: false});
        stream.pipe(temp_in);
        setTimeout(function(){ temp_converter.run() }, 3000); // give streams some time to buffer
        return temp_in;
    }

}