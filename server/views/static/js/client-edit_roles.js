window.roleFunctions = {
  createRoleChangeListener: ()=>{
    $("#user-interact-roles").on('change.rolechange', function(evt){
      var roledata = {};
      for(const v of Object.values($(this).serializeArray())){
        roledata[v.name] = (roledata[v.name] !== true && ["true", true].includes(v.value)) ? true : false;
      };
      $.ajax({
        async: true,
        type: "POST",
        url: $(this).attr('action'),
        data: roledata,
        timeout: 10000,
        success: (result)=>{
          console.log('done',result)
        }
      })
    });
  }
}

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