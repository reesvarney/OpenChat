var botName = "TestBot";

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
    })
}