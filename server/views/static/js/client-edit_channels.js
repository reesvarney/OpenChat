$( document ).ready(function() { 
  $('.channel-group>ul').each((group, el)=>{
    var type = $(el).attr('group-type');
    if(el.children.length > 0){
      new Sortable(el, {
        animation: 150,
        onUpdate: (evt)=>{
          $.ajax({
            async: true,
            type: 'POST',
            url: `/admin/channel/move/${$(evt.item).find('.channel')[0].id}`,
            data: {index: evt.newIndex, type: type},
            timeout: 10000,
            error: ((err)=>{
              console.log(err)
            })
          })
        }
      });
    }
  })

    $("#add_channel_btn").click(function () {
      overlay.show("add_channel");
    });

    $(".edit_channel_btn").on('click', function(){
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
          console.log('Channel Deleted');
          window.location.reload();
        })
      });
    })

    $(".role_edit_form").on( 'submit', function (e) {
      e.preventDefault();
      var data = {};
      $(this).serializeArray().forEach((perm)=>{
        if(!(perm.name in data && data[perm.name] == "true")){ 
          data[perm.name] = perm.value
        };
      });
      $.ajax({
        async: true,
        type: 'POST',
        url: this.action,
        data: data,
        timeout: 10000,
        success: ((result)=>{
          window.location.reload();
        })
      });
    });
    
    $("#edit_channel_actions>#channel_save_btn").on('click', function(){
      $('#edit_channel form').submit()
    })
});  