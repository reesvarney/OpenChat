$( document ).ready(()=>{
    $("#add_channel_btn").click(function () {
      overlay.show("add_channel");
    });

    $("#channels").on('click', '.edit_channel_btn',function(){
      overlay.show('edit_channel');
      $('#edit_channel form').attr('action', `admin/channel/edit/${$(this).parent().find('.channel')[0].id}`)
      $('#edit_channel form input[name="name"]').val($(this).parent().find('.channel')[0].innerText)
    })

    $("#edit_channel_actions>#channel_delete_btn").on('click', function(){
      var action = $('#edit_channel form').attr('action');
      $.ajax({
        async: true,
        type: 'DELETE',
        url: action,
        data: {},
        timeout: 10000,
        success: ((result)=>{
          overlay.hide()
        })
      });
    })

    $("#edit_channel form").on( 'submit', function (e) {
      e.preventDefault();
      $.ajax({
        async: true,
        type: 'POST',
        url: this.action,
        data:  $(this).serialize(),
        timeout: 10000,
        success: ((result)=>{
          console.log(result)
          overlay.hide();
        })
      });
    });

    $("#add_channel form").on( 'submit', function (e) {
      e.preventDefault();
      $.ajax({
        async: true,
        type: 'POST',
        url: this.action,
        data:  $(this).serialize(),
        timeout: 10000,
        success: ((result)=>{
          overlay.hide()
        })
      });
    });
    
    $("#edit_channel_actions>#channel_save_btn").on('click', function(){
      $('#edit_channel form').submit();
    })
});  