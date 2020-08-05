function addToQueue(e){
    e.preventDefault();
    $.ajax({
        url: $('#vid_form').attr('action'),
        type: 'post',
        data: $('#vid_form').serialize(),
        success:function(){
            $("#queueURL").val('');
        }
    });
};

socket.on('queueChange', function(data){
    console.log("queue Change")
    if (data.id == currentChannel){
        getExtensionChannel(data.id, serverinfo.channels.extensions.find(({ uuid } )=> uuid == data.id).handler);
    }
    setMediaMetadata(data);
})