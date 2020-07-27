$('#vid_form').submit(function(e){
    e.preventDefault();
    $.ajax({
        url: $('#vid_form').attr('action'),
        type: 'post',
        data: $('#vid_form').serialize(),
        success:function(){
            $("#queueURL").val('');
        }
    });
});

socket.on('queueChange', function(channel){
    if (channel == currentChannel){
        getExtensionChannel(channel, serverinfo.channels.extensions.find(({ uuid } )=> uuid == channel).handler);
    }
})