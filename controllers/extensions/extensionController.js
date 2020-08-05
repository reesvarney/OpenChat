var events = require('events');
var express = require('express');
var path = require('path');
var extensions_router = express.Router();
const { Converter } = require("ffmpeg-stream");
const { createReadStream } = require('fs');
var io;
var extension_data;
var messageListener = new events.EventEmitter();

var empty_stream_meta = {
    name: "",
    source: ""
}

/**
 * Creates a combiner stream, this allows different streams to be piped in without it killing the stream when they end
 * @param {object} data The constructor data for the stream
 * @param {string} data.channel The id of the channel
 * @param {string} data.fmt_out The ffmpeg supported format to output to clients
 */
var OCstream = class {
    constructor(data){
        var converter = new Converter();
        this.isPlaying = false;
        this.format = data.fmt_out;
        this.metadata = empty_stream_meta;
        this.socket = io.to(`/extensions/${data.channel}`)
        this.input = converter.createInputStream({f: data.fmt_out});
        this.output = converter.createOutputStream({f: data.fmt_out, end: false});
        converter.run();

        //stop the connection from timing out by sending silent audio every 30 seconds
        setInterval(function(){ 
            if(!this.isPlaying){
                this.setStream(createReadStream(path.join(__dirname, './silence.m4a')), "m4a");
            }
        }.bind(this), 30000);
    };

    /**
     * Converts a readable stream into realtime and pipes it into the combiner stream
     * @param {object} data The data object containing information for the stream
     * @param {ReadableStream} data.stream The input stream
     * @param {string} data.format The format of the input stream
     * @param {object} data.metadata The metadata to be displayed in the player
     * @param {string} data.metadata.name The title of the media
     * @param {string} data.metadata.source The source of the media e.g. song artist
     * @returns {ReadableStream} Stream of the realtime output
     */
    set(data){
        this.isPlaying = true;

        var converter = new Converter();
        var realtime_in = converter.createInputStream({f: data.format, re: true});

        data.stream.pipe(realtime_in);
        converter.createOutputStream({f: this.format}).pipe(this.input, {end: false});

        setTimeout(function(){
            converter.run(); //add delay to try and remove some audio bugs on end of previous stream
            this.metadata = data.metadata;
            this.socket.emit('mediaChange', this.metadata);
        }.bind(this), 5000);

        realtime_in.on('end', function(){
            this.isPlaying = false;
            this.metadata = empty_stream_meta;
            this.socket.emit('mediaChange', this.metadata);
        }.bind(this));

        return realtime_in;
    };
}

/**
 * Initialises an extension
 * @param {object} data Object of the package.json for the extension
 */

var extension = class {
    constructor(data){
        this = {
            config: data,
            router: express.Router(),
            data: extension_data,
            messages: messageListener,
            stream: OCstream
        };

        // If the extension provides a channel function
        if(data.oc_config.channelSupported){
            this.channels = [];
            this.createChannel = function(req){};
            this.channelController = function(req, res){};
            this.router.get('/channel/:channelid', function(req, res){
                if(!channels.includes(req.params.channelid)){
                    this.createChannel(req.params.channelid);
                    this.channels.push(req.params.channelid);
                }
                this.channelController(req, res);
            }.bind(this));
        };
        
        //start the extension script
        require(`./extensions/${data.name}`)(this);

        extensions_router.use(data.name, this.router);
    }

    /**
     * Send a message to a specific channel
     * @param {object} msg_data Message params
     * @param {string} msg_data.content The content of the message
     * @param {string} msg_data.channel The channel id to send the message to
     */
    sendMessage(msg_data){
        this.messageListener.emit('send', {
            sender: this.data.oc_config.disp_name,
            content: msg_data.content,
            channel: msg_data.channel
        });
    };

    /**
     * Sets the directory for serving static files
     * @param {string} dir The directory under /extensions/EXTENSION_NAME/
     */
    setStatic(dir){
        this.router.use(express.static(path.join(`./extensions/${this.data.name}`, dir)));
    }
}

/**
 * Creates extension controller which bridges between the core openchat scripts and any extensions
 * @param {object} data This should contain any data for the extensions to access
 */
module.exports = class {
    constructor(data){
        extension_data = data;
        this.extension = extension;
        this.extensions = {};
        this.messageListener = messageListener;
    };
}