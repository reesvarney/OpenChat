$( document ).ready(()=>{


  $(".edit_server_btn").on('click', function(){
    overlay.show('edit_server');
    $('#edit_server>form input[name="name"]').val(client.serverinfo.name);
  })

});