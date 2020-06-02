//TEMP, REPLACE WITH SOME KIND OF DETECTION E.G. FOR ELECTRON APPS
var hosted = true;

var serverinfo;
var destination = {};
var client = {};
var isConnected = false;
var isMuted = false;
navigator.getUserMedia = (
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia
);
var currentText;
var constraints = {
    audio: {
        sampleRate: 64000,
        volume: 1.0,
        noiseSuppression: false,
        echoCancellation: false
    },
    video: false
};

var soundfiles = ["connect", "disconnect", "mute", "unmute"];
var soundeffects = {};

for(i = 0; i < soundfiles.length; i++){
  soundeffects[soundfiles[i]] = new Audio(`./audio/${soundfiles[i]}.mp3`);
  soundeffects[soundfiles[i]].loop = false;
};

navigator.getUserMedia(constraints, function(localstream) {
  stream = localstream;
}, function(err) {
  console.log('Failed to get local stream', err);
});

var stream;
var peer;
var call;
var new_channel = null;

destination.port = "8080"

function connectToServer(){

  var socket = io.connect("http://" + destination.ip + ":" + destination.port);
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

  socket.on('canJoin', function(canJoin){
    if(canJoin == true){
      call = peer.call('server', stream);

      call.on('stream', function(remoteStream) {
        isConnected = true;
        $("#call-controls").show();
        $('#voice_channels a').removeClass("is-active");
        $('#voice_channels #' + new_channel).addClass("is-active");
        var audioOut = document.querySelector('audio');
        audioOut.srcObject = remoteStream;
        soundeffects.connect.play();
      });
    } else {
      console.log("NEGOTIATION ERROR");
    }
  })

  //openchat related errors
  socket.on("ocerror", function(data){
    console.log("OPENCHAT ERROR: " + data);
  })

  socket.on('serverInfo', function(server_info){
    console.log(server_info);
    $("#server_title").text(server_info.name);
    $("#text_channels").empty();
    $("#voice_channels").empty();
    serverinfo = server_info;
    for(i = 0; i < server_info.channels.length; i++){
      addChannel(server_info.channels[i].channel_type, server_info.channels[i].channel_name, i)
    };
    peer = new Peer(socket.id, {host: destination.ip, port: 9000, path: '/rtc'});
  });

  socket.on('usersChange', function(users){
    $('.user-list').empty();
    serverinfo.users = users;
    console.log(users);
    for(i = 0; i < Object.keys(users).length; i++){
      if(users[Object.keys(users)[i]].channel != null){
        $('#' + users[Object.keys(users)[i]].channel + "-users").append("<li><a>" + users[Object.keys(users)[i]].name + "</a></li>");
      }
    }
  })

  socket.on("messages", function(messages){
    if(messages == null){
      console.log("No more messages to display");
    } else {
      console.log(messages);
      var source = document.getElementById("ChatMessage").innerHTML;
      var template = Handlebars.compile(source);
      for( i = 0; i < messages.length; i++){
        var date = moment.utc(messages[i].message_date);
        var data = {
          "messageSender" : messages[i].sender_name,
          "messageContent" : messages[i].message_content,
          "messageDate" : date.format('MMMM Do YYYY, h:mm a')
        };
        var result = template(data);
        $('#message_area').append(result);
      }
    }
  });


  function getMessages(channel_id, page){
    socket.emit("getMessages", {
      channel_id : channel_id,
      page : page
     });
     $('#message_area').empty();
     $('#text_channels a').removeClass("is-active");
     $('#text_channels #' + channel_id).addClass("is-active");
     $("#messageInput").prop('disabled', false);
     currentText = channel_id;
  };
  
  socket.on("newMessage", function(channel){
    if(channel == currentText){
      getMessages(channel, 0);
    }
  })

  //displays channels to user
  function addChannel(type, name, id){
    if(type == "text"){
      var source = document.getElementById("TextChannel").innerHTML;
      var template = Handlebars.compile(source);
      var data = {
        "channelName" : name,
        "channelID" : id
      };
      var result = template(data);
      $('#text_channels').append(result);
    } else if(type == "voice"){
      var source = document.getElementById("VoiceChannel").innerHTML;
      var template = Handlebars.compile(source);
      var data = {
        "channelName" : name,
        "channelID" : id
      };
      var result = template(data);
      $('#voice_channels').append(result);
    } else {
      console.log("ERROR: Unrecognised Channel Type")
    }
  }

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
    $("#disconnect-button").click(function(){
      leaveChannel();
      $("#call-controls").hide();
      isConnected = false;
      $('#voice_channels a').removeClass("is-active");
      soundeffects.disconnect.play();
    });

    $("#voice_channels").on('click', '* .channel', function() {
      joinChannel($(this).attr("id"));
    })

    $("#text_channels").on('click', '* .channel', function() {
      getMessages($(this).attr("id"), 0);
    })
  });

  $("#messageForm").submit(function(e) {
    e.preventDefault();
    var contents = $("#messageInput").val();
    socket.emit("sendMessage", {
      channel: currentText,
      content: contents
    });
    $("#messageInput").val("");
  });
};

$( document ).ready(function() {
  if(hosted == true){
    $("#ip_input").val(window.location.hostname);
    $("#ip_input").prop("disabled", true );
  }

  $("#addserver").click(function() {
    $(".modal").addClass("is-active");
  });

  $("#modal-close").click(function() {
     $(".modal").removeClass("is-active");
  });

  $("#connectbutton").click(function() {
     client.name = $("#name_input").val();
     destination.ip = $("#ip_input").val();
     connectToServer();
     $(".modal").removeClass("is-active");
  });

  $("#mute-button").click(function(){
    if(isMuted){
      isMuted = false;
      $('#mute-button svg').attr('data-icon', 'microphone');
      stream.getAudioTracks()[0].enabled = true;
      soundeffects.unmute.play();
    } else {
      isMuted = true;
      $('#mute-button svg').attr('data-icon', 'microphone-slash');
      stream.getAudioTracks()[0].enabled = false;
      soundeffects.mute.play();
    }
  });

  $("#mute-audio-button").click(function(){
    var audioOut = document.querySelector('audio');
    if(audioOut.muted == true){
      audioOut.muted = false;
      $('#mute-audio-button svg').attr('data-icon', 'volume-up');
    } else {
      audioOut.muted = true;
      $('#mute-audio-button svg').attr('data-icon', 'volume-mute');
    }
  });
});
