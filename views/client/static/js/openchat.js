var serverinfo,
  client = {},
  new_channel = null,
  isConnected = false,
  audioOut = $('#call_out'),
  isMuted = false,
  peer,
  call,
  currentText,
  currentPage,
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
        sampleRate: 64000,
        volume: 1.0,
        noiseSuppression: false,
        echoCancellation: false,
        autoGainControl: true
    },
    video: false
  },
  stream;

for(i = 0; i < soundfiles.length; i++){
  soundeffects[soundfiles[i]] = new Audio(`./audio/${soundfiles[i]}.mp3`);
  soundeffects[soundfiles[i]].loop = false;
};

navigator.getUserMedia = (
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia
);

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

      if("page" in params && params.page == 0) {
        scrollController.goToChild($("#messages>:first-child"));
      }else if("page" in params){
        scrollController.goToChild(lastMessage);
      }
    })
  });
};

function connectToServer(){
  var socket = io.connect();

  // SOCKET LISTENERS
  socket.on('connect', function() {
    //connection established, begin auth
    socket.emit('userinfo', {
      type: 'client',
      name: client.name
    });
  });

  socket.on('disconnect', function(){
    window.location.reload();
  });

  //openchat related errors
  socket.on("ocerror", function(data){
    console.log("OPENCHAT ERROR: " + data);
  })

  socket.on('serverInfo', function(server_info){
    serverinfo = server_info;
    console.log(serverinfo)
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
        var audioOut = document.querySelector('audio');
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
    getMessages(data.channel_id, {"id": data.message_id});
  })

  //start channel joining process
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

  scrollController = new smartScroll($('#message_scroll'));

  $("#disconnect_button").click(function(){
    leaveChannel();
    $("#disconnect_button").hide();
    isConnected = false;
    $('#voice_channels li').removeClass("active");
    soundeffects.disconnect.play();
  });

  $("#load_messages a").click(function(){
    currentPage += 1
    getMessages(currentText, {"page": currentPage})
  });


  $("#voice_channels").on('click', '* .channel', function() {
    joinChannel($(this).attr("id"));
  })

  $("#text_channels").on('click', '* .channel', function() {
    var channel_id = $(this).attr("id");
    if(channel_id != currentText){
      $('#text_channels li').removeClass("active");
      $('#text_channels #' + channel_id).parent().addClass("active");
      currentPage = 0;
      currentText = channel_id;
      $("#message_input_area *").each( function( index ){
        $(this).prop('disabled', false);
      });
      var channelData = serverinfo.channels.text.find(({ uuid } )=> uuid == channel_id);
      $("#channel_name").text(channelData.channel_name)
      $("#channel_description").text(channelData.channel_description)
      getMessages(channel_id, {"page" : 0});
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
      channel: currentText,
      content: contents
    });
    $("#message_box").val("");
    scrollController.goToBottom(true);
  });
};

$( document ).ready(function() {
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
});

$( document ).ready(function() {
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
});