$( document ).ready(function() {
    $("#overlay").on("click", function (e) {
      if (e.target !== this) return;
      overlay.hide();
    });
  
    $("#add_channel_btn").click(function () {
      overlay.show("add_channel");
    });

    $(".edit_channel_btn").on('click', function(){
      overlay.show('edit_channel');
      $('#edit_channel>form').attr('action', `admin/channel/${$(this).parent().find('.channel')[0].id}/edit`)
      $('#edit_channel>form input[name="name"]').val($(this).parent().find('.channel')[0].innerText)
    })

    $(".edit_server_btn").on('click', function(){
      overlay.show('edit_server');
      $('#edit_server>form input[name="name"]').val(client.serverinfo.name)
    })
});  