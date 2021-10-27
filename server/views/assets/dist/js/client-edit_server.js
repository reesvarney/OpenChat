$( document ).ready(()=>{
  $(".edit_server_btn").on('click', function(){
    overlay.show('edit_server');
    $('#edit_server>form input[name="name"]').val(client.serverinfo.name);
  })

  $("form[action='admin/server/edit']").on("submit", (evt)=>{
    evt.preventDefault();
    let newData = {};
    let combinedTime = $(evt.currentTarget).find(".combined-time");
    let disabled = [];
    $(combinedTime).each((index, el)=>{
      let inputs = $(el).find("input");
      let combinedObj = {};
      for(const input of inputs){
        combinedObj[$(input).attr("name")] = $(input).val() || 0;
        $(input).prop("disabled", true);
        disabled.push(input);
      }
      newData[$(el).attr("name")] = combinedObj;
    });
    let formData = $(evt.currentTarget).serializeArray();
    for(const input of disabled){
      $(input).prop("disabled", false);
    }
    for(const input of formData){
      if(!(newData[input.name] === true && input.value === false)){
        newData[input.name] = input.value;
      }
    }
    console.log(newData);
    $.ajax({
      async: true,
      type: 'POST',
      url: `admin/server/edit`,
      data: newData,
      timeout: 10000
    });
  })

});