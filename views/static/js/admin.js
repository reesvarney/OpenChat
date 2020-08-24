function addChannel(type){
    $.ajax({
        async: true,
        type: 'GET',
        url: "channel/template", 
        data: { "type": type },
        success: ( function( result ){
            $(`#${type}_channels`).append(result);
        })
    });
    $(`.add-channel`).hide();
    $(`.update-btn`).hide();
    $(`.delete-btn`).hide();
};

function cancelChannel(uuid){
    $(`#new_channel`).parent().remove();
    $(`.add-channel`).show();
    $(`.update-btn`).show();
    $(`.delete-btn`).show();
}

function deleteChannel(uuid){
    $.ajax({
        async: true,
        type: 'DELETE',
        url: `channel/${uuid}`, 
        success: ( function( result ){
            location.reload();
        })
    });
}

function removeFromBlacklist(ip){
    $.ajax({
        async: true,
        type: 'DELETE',
        url: `users/blacklist`,
        data: {ip: ip},
        success: ( function( result ){
            location.reload();
        })
    });
}