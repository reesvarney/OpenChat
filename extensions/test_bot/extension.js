
//CREATE THESE DYNAMICALLY, TESTING ONLY
var botName = "TestBot";
var channel = "test";

var ytdl = require('ytdl-core');

module.exports = function(extData){
    var messageListener = extData.controller.messageListener;
    messageListener.on('newMessage', function(msg){
        if(msg.message_content == "!foo"){
            messageListener.emit('sendMessage', {
                sender: botName,
                content: "bar!",
                channel: msg.channel_id
            })
        }
    });

    var queue = ["https://www.youtube.com/watch?v=9RTaIpVuTqE","https://www.youtube.com/watch?v=QrYyURSQPis"];
    function getNextStream(){
        if (queue.length != 0 ) {
            play(ytdl(queue.shift(), { filter: format => format.container === 'mp4' }));
        }
    }

    extData.controller.createStream(channel, "mp3");

    function play(stream){
        extData.controller.sendStream(stream, channel, "mp4").on('end', function(){
            getNextStream();
        });
    }

    getNextStream();
    
}