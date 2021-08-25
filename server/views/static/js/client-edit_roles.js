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
          // notification with confirm
        }
      })
    });
  },
  updateRoleSettings: ()=>{
    $.ajax({
      async: true,
      type: "GET",
      url: "/settings/roles",
      timeout: 10000,
      success: (result)=>{
        var current = $("#edit_roles .uk-open");
        var open = [];
        if(current.length > 0){
          open.push(current.find(".role_edit_form").attr("action"));
        }
        $("#edit_roles").html(result);
        for(const action of open){
          $(`form[action="${action}"]`).closest("li").addClass("uk-open");
        }
      }
    })
    
  }
}

$( document ).ready(()=>{
  $(document).on('submit', ".role_edit_form", function (e) {
    e.preventDefault();
    var data = {};
    var disabledfields = $(this).find('[disabled]');
    disabledfields.prop('disabled', false);
    $(this).serializeArray().forEach((perm)=>{
      if(!(perm.name in data && data[perm.name] == "true")){ 
        data[perm.name] = perm.value
      };
    });
    disabledfields.prop('disabled', true);
    $.ajax({
      async: true,
      type: 'POST',
      url: this.action,
      data: data,
      timeout: 10000,
      success: ((result)=>{
      })
    });
  });

  $("#new_role_button").on("click", (event)=>{
    $.ajax({
      async: true,
      type: 'POST',
      url: "/admin/role/create",
      data: {},
      timeout: 10000
    });
  });

  $(".edit_role_actions>.role_delete_btn").on('click', function(){
    var action = $(this).parents('form:first').attr('action');
    $.ajax({
      async: true,
      type: 'DELETE',
      url: action,
      data: {},
      timeout: 10000
    });
  })
});