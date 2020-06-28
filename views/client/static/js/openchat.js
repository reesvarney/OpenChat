var serverinfo,
  destination = {},
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

function getOGP(ogp_url, messageID){
  $.ajax({
    async: true,
    type: 'GET',
    url: "/messages/ogp", 
    data: { "url": `${ogp_url}` },
    success: ( function( result ){
      var ogSource = document.getElementById("OGPCard").innerHTML;
      var ogTemplate = Handlebars.compile(ogSource);
      if ("ogTitle" in result){
        var ogpImageURL = "";
        if ("ogImage" in result && "url" in result.ogImage) {
          ogpImageURL = result.ogImage.url
          if (result.ogImage.url.startsWith("/")){
            ogpImageURL = (result.requestUrl || result.ogUrl) + result.ogImage.url;
          }
        }
        var ogpSiteName = "";
        if ("ogSiteName" in result){
          ogpSiteName = `${result.ogSiteName} - `;
        }
        
        var ogData = {
          "ogpImageURL" : ogpImageURL,
          "ogpURL" : result.ogUrl || result.requestUrl,
          "ogpTitle" : result.ogTitle,
          "ogpSiteName": ogpSiteName,
          "ogpDesc" : result.ogDescription
        };
        $(`#${messageID} .ogp-area`).empty();
        $(`#${messageID} .ogp-area`).append(ogTemplate(ogData));
      }
    })
  });
};

function getMessages(channel_id, page){
  $.ajax({
    async: true,
    type: 'GET',
    url: `/messages/channels/${channel_id}`, 
    data: { "page": `${page}` },
    timeout: 10000,
    success: ( function( messages ){
      var tempLastMessage;
      if(page == 0){
        $('.message-card').remove();
      }
      if(messages.length == 50){
        $("#load_messages").show();
      } else {
        $("#load_messages").hide();
      }
      if(messages.length == 0){
      } else {
        console.log(messages)
        var source = document.getElementById("ChatMessage").innerHTML;
        var template = Handlebars.compile(source);
        for( i = 0; i < messages.length; i++){
          var currentMessage = i + (page * 50);
          var messageID = `message-${currentMessage}`
          var date = moment.utc(messages[i].message_date);
          var data = {
            "messageSender" : messages[i].sender_name,
            "messageContent" : messages[i].message_content,
            "messageDate" : date.format('MMMM Do YYYY, h:mm a'),
            "messageID" : messageID
          };
  
          var result = $($.parseHTML(anchorme({
            input: template(data),
            options : {
              attributes: {
                class: "found-link",
                target: "_blank"
              }
            }
          })));
  
          $('#messages').append(result);
          if ($(result).find(".found-link").length != 0){
            var ogp_url = $(result).find(".found-link")[0].href;
            getOGP(ogp_url, messageID)
          };
          tempLastMessage = currentMessage;
        };
      };
      window.location.href = `#message-${lastMessage}`
      lastMessage = tempLastMessage;
    })
  });
};

function connectToServer(){
  var socket = io.connect();
  $("#addserver").hide();
  
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
        $('#' + users[Object.keys(users)[i]].channel + "-users").append("<li><a>" + users[Object.keys(users)[i]].name + "</a></li>");
      }
    }
  })
  
  socket.on("newMessage", function(channel){
    if(channel == currentText){
      getMessages(channel, 0);
    }
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


  //DOM LISTENERS
  $( document ).ready(function() {
    $("#disconnect_button").click(function(){
      leaveChannel();
      $("#disconnect_button").hide();
      isConnected = false;
      $('#voice_channels li').removeClass("active");
      soundeffects.disconnect.play();
    });

    $("#load_messages a").click(function(){
      currentPage += 1
      getMessages(currentText, currentPage)
    });


    $("#voice_channels").on('click', '* .channel', function() {
      joinChannel($(this).attr("id"));
    })

    $("#text_channels").on('click', '* .channel', function() {
      var channel_id = $(this).attr("id");
      $('#text_channels li').removeClass("active");
      $('#text_channels #' + channel_id).parent().addClass("active");
      lastMessage = 0;
      currentPage = 0;
      currentText = channel_id;
      $("#message_input_area *").each( function( index ){
        $(this).prop('disabled', false);
      });
      getMessages(channel_id, 0);
    })

  });

  $("#message_box").keypress(function (evt) {
    if(evt.keyCode == 13 && !evt.shiftKey) {
      evt.preventDefault();
      $("#message_input_area").submit();
    }
  });

  $("#message_input_area").submit(function(e) {
    e.preventDefault();
    var contents = $("#message_box").val();
    lastMessage = 0;
    socket.emit("sendMessage", {
      channel: currentText,
      content: contents
    });
    $("#message_box").val("");
  });
};

function muteAudio(toggleStatus){
  if(toggleStatus){
    audioOut.muted = true;
    $('#mute_audio i').removeClass('fa-volume-up').addClass('fa-volume-mute');

    //IF MIC NOT MUTE
    if(stream.getAudioTracks()[0].enabled){
      muteMic(true);
      isMuted = false;
    }
    soundeffects.mute.play();
  } else {
    audioOut.muted = false;
    $('#mute_audio i').removeClass('fa-volume-mute').addClass('fa-volume-up');
    soundeffects.unmute.play();

    //IF MIC PREVIOUS NOT MUTE
    if(!isMuted){
      muteMic(false);
    }
  }
}

function muteMic(toggleStatus){
  if(toggleStatus){
    $('#mute_microphone i').removeClass('fa-microphone').addClass('fa-microphone-slash');
    stream.getAudioTracks()[0].enabled = false;
  } else {
    $('#mute_microphone i').removeClass('fa-microphone-slash').addClass('fa-microphone');
    stream.getAudioTracks()[0].enabled = true;

    // IF AUDIO MUTE
    if(audioOut.muted){
      muteAudio(false);
    } else {
      soundeffects.unmute_mic.play();
    }
  }
};

$( document ).ready(function() {
  $("#mute_microphone").click(function(){
    if(!stream.getAudioTracks()[0].enabled){
      muteMic(false);
      isMuted = false;
    } else {
      muteMic(true);
      isMuted = true;
      soundeffects.mute_mic.play();
    }
  });

  $("#mute_audio").click(function(){
    if(audioOut.muted == true){
      muteAudio(false);
    } else {
      muteAudio(true);
    }
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
});