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