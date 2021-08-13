$( document ).ready(()=>{
  $("#new_role_button").on("click", (event)=>{
    $.ajax({
      async: true,
      type: 'POST',
      url: "/admin/role/create",
      data: {},
      timeout: 10000,
      success: ((result)=>{
        overlay.hide()
      })
    });
  });

  $(".edit_role_actions>.role_delete_btn").on('click', function(){
    console.log('deleting role...')
    var action = $(this).parents('form:first').attr('action');
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
});