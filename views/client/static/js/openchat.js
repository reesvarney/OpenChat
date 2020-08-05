var serverinfo,
  client = {},
  currentChannel,
  new_channel = null,
  isConnected = false,
  audioOut = $('#call_out'),
  isMuted = false,
  peer,
  call,
  currentPage,
  audioOut,
  lastMessage,
  soundeffects = {},
  soundfiles = [
    "mute",
    "unmute",
    "connect",
    "mute_mic",
    "unmute_mic",
    "disconnect"
  ],
  scrollController,
  constraints = {
    audio: {
        sampleRate: 48000,
        volume: 1.0,
        noiseSuppression: false,
        echoCancellation: false,
        autoGainControl: true
    },
    video: false
  },
  socket,
  extensions_loaded = [],
  media_source = "",
  stream;

for(i = 0; i < soundfiles.length; i++){
  soundeffects[soundfiles[i]] = new Audio(`./audio/${soundfiles[i]}.mp3`);
  soundeffects[soundfiles[i]].loop = false;
};

navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia );

navigator.getUserMedia(constraints, function(localstream) {
  stream = localstream;
}, function(err) {
  console.log('Failed to get local stream', err);
});

function getMessages(channel_id, params){
  $.ajax({
    async: true,
    type: 'GET',
    url: `/messages/channels/${channel_id}`,
    data: params,
    timeout: 10000,
    success: ( function( result){
      if("page" in params && params.page == 0){
        $('.message-card').remove();
        $('#no_messages').remove();
      }

      var isNew;
      if("id" in params){
        isNew = true;
      } else {
        isNew = false;
      }

      var lastMessage = $("#messages>:last-child");

      if (!isNew){
        $('#messages').append(result);
      } else {
        $('#messages').prepend(result);
      }

      if($('#messages').children().length % 50 == 0){
        $("#load_messages").show();
      } else if("page" in params){
        $("#load_messages").hide();
      }

      if("page" in params && params.page == 0 || !("page" in params) && scrollController.doesScroll(200)) {
        scrollController.goToChild($("#messages>:first-child"));
      }else if("page" in params){
        scrollController.goToChild(lastMessage);
      } else {
        $("#new_message").show();
      }
    })
  });
};

//EXTENSION SUPPORT
function getExtensionChannel(uuid, handler){
  if(!extensions_loaded.includes(handler)){
    $.ajax({
      async: true,
      type: 'GET',
      url: `/extensions/${handler}/scripts`,
      timeout: 10000,
      success: ( function( result){
        $("head").append(result)
        extensions_loaded.push(handler);
      })
    });
  }

  $.ajax({
    async: true,
    type: 'GET',
    url: `/extensions/${handler}/channel/${uuid}`,
    timeout: 10000,
    success: ( function( result){
      $("#extension_content").html(result);
    })
  });
}

function setMediaMetadata(data){
  if (data.id == media_source){
    $("#media_thumbnail").attr('src', data.thumbnail)
    $("#media_title").text(data.title);
    $("#media_caption").text(data.caption);
  }
}

function playStream(url, data){
  if($('#player').attr("src") != url){
    $('#player').attr("src", url);
    media_source = data.id
  };
  setMediaMetadata(data);
  $("#media_player").show();
}

function stopStream(){
  $('#player').attr("src", "");
  $("#media_player").hide();
}

//SOCKET LISTENERS
function connectToServer(){
  socket = io.connect();

  socket.on('connect', function() {
    //connection established, begin auth
    socket.emit('userinfo', {
      type: 'client',
      name: client.name
    });
  });

  socket.on('disconnect', function(){
    console.log("disconnected")
    //window.location.reload();
  });

  socket.on("ocerror", function(data){
    console.log("OPENCHAT ERROR: " + data);
  })

  socket.on('serverInfo', function(server_info){
    serverinfo = server_info;
    peer = new Peer(socket.id, {host: window.location.hostname, path: '/rtc', port: server_info.peerPort});
  });

  socket.on('canJoin', function(canJoin){
    if(canJoin == true){
      call = peer.call('server', stream);
      call.on('stream', function(remoteStream) {
        isConnected = true;
        $("#disconnect_button").show();
        $('#voice_channels li').removeClass("active");
        $('#voice_channels #' + new_channel).parent().addClass("active");
        audioOut = document.querySelector('#call_out');
        audioOut.srcObject = remoteStream;
        soundeffects.connect.play();
      });
    } else {
      console.log("NEGOTIATION ERROR");
    }
  })

  socket.on('usersChange', function(users){
    $('.user-list').empty();
    serverinfo.users = users;
    for(i = 0; i < Object.keys(users).length; i++){
      if(users[Object.keys(users)[i]].channel != null){
        $("<li><a></a></li>").text(users[Object.keys(users)[i]].name).appendTo('#' + users[Object.keys(users)[i]].channel + "-users");
      }
    }
  })

  socket.on("newMessage", function(data){
    if(data.channel_id == currentChannel){
      getMessages(data.channel_id, {"id": data.message_id});
    }
  })
};

function joinChannel(channel_id){
  if(!(serverinfo.users[socket.id].channel == channel_id)){
    socket.emit('joinChannel', channel_id);
    new_channel = channel_id;
  } else {
    console.log('ALREADY CONNECTED');
  }

}

function leaveChannel(){
  socket.emit('leaveChannel');
};

//DOM Listeners
$( document ).ready(function() {
  scrollController = new smartScroll($('#channel_content'));

  $("#disconnect_button").click(function(){
    leaveChannel();
    $("#disconnect_button").hide();
    isConnected = false;
    $('#voice_channels li').removeClass("active");
    soundeffects.disconnect.play();
  });

  $("#load_messages a").click(function(){
    currentPage += 1
    getMessages(currentChannel, {"page": currentPage})
  });


  $("#voice_channels").on('click', '* .channel', function() {
    joinChannel($(this).attr("id"));
  })

  $("#text_channels").on('click', '* .channel', function() {
    var channel_id = $(this).attr("id");
    if(channel_id != currentChannel){
      $('#text_channels li').removeClass("active");
      $('#extensions_channels li').removeClass("active");
      $('#text_channels #' + channel_id).parent().addClass("active");
      currentPage = 0;
      currentChannel = channel_id;
      $("#extension_content").empty();
      $("#extension_content").hide();
      $("#message_input_area").show();
      $("#message_scroll").show();
      var channelData = serverinfo.channels.text.find(({ uuid } )=> uuid == channel_id);
      $("#channel_name").text(channelData.channel_name)
      $("#channel_description").text(channelData.channel_description)
      getMessages(channel_id, {"page" : 0});
    }
  })

  $("#extensions_channels").on('click', '* .channel', function() {
    var channel_id = $(this).attr("id");
    if(channel_id != currentChannel){
      $("#extension_content").empty();
      $('#text_channels li').removeClass("active");
      $('#extensions_channels li').removeClass("active");
      $('#extensions_channels #' + channel_id).parent().addClass("active");
      currentChannel = channel_id;
      $("#message_input_area").hide();
      $("#message_scroll").hide();
      $("#extension_content").show();
      var channelData = serverinfo.channels.extensions.find(({ uuid } )=> uuid == channel_id);
      $("#channel_name").text(channelData.channel_name)
      getExtensionChannel(channel_id, channelData.handler)
    }
  })

  $("#message_box").keypress(function (evt) {
    if(evt.keyCode == 13 && !evt.shiftKey) {
      evt.preventDefault();
      $("#message_input_area").submit();
    }
  });

  $("#message_input_area").submit(function(e) {
    e.preventDefault();
    var contents = $("#message_box").val();
    socket.emit("sendMessage", {
      channel: currentChannel,
      content: contents
    });
    $("#message_box").val("");
    scrollController.goToBottom(true);
  });

  $( "#connect_form" ).submit(function( event ) {
    event.preventDefault();
    client.name = $("#name_input").val();
    connectToServer();
    $("#connect_overlay").removeClass("active");
  });

  $("#nav-toggle").click(function(){
    $("nav").show();
  })

  $("#nav-close").click(function(){
    $("nav").hide();
  })

  $("#new_msg_btn").click(function(){
    scrollController.goToBottom(true);
    $("#new_message").toggleClass('hidden');
  })

  $("#new_msg_close").click(function(){
    $("#new_message").toggleClass('hidden');
  })

  $("#mute_microphone").click(function(){
    if(!stream.getAudioTracks()[0].enabled){
      $('#mute_microphone i').removeClass('fa-microphone-slash').addClass('fa-microphone');
      stream.getAudioTracks()[0].enabled = true;
      soundeffects.unmute_mic.play();
    } else {
      $('#mute_microphone i').removeClass('fa-microphone').addClass('fa-microphone-slash');
      stream.getAudioTracks()[0].enabled = false;
      soundeffects.mute_mic.play();
    }
  });

  $("#mute_audio").click(function(){
    if(audioOut.muted == true){
      audioOut.muted = false;
      $('#mute_audio i').removeClass('fa-volume-mute').addClass('fa-volume-up');
      soundeffects.unmute.play();
    } else {
      audioOut.muted = true;
      $('#mute_audio i').removeClass('fa-volume-up').addClass('fa-volume-mute');
      soundeffects.mute.play();
    }
  });

  $("#media_stop").click(function(){
    stopStream();
  });


  $("#player_volume").on('input', function() {
    var vol = (this.value / 10);
    $('#player').prop("volume", (this.value / 10));
    for(i = 0; i < soundfiles.length; i++){
      soundeffects[soundfiles[i]].volume = vol;
    };
  });

  $("#call_volume").on('input', function() {
    var vol = (this.value / 10);
    audioOut.volume = vol;
  });
});