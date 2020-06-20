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

var soundfiles = ["connect", "disconnect", "mute", "unmute", "mute_mic", "unmute_mic"];
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
var hostname = window.location.hostname;
function connectToServer(){

  var socket = io.connect(`http://${hostname}:8080`);
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
    peer = new Peer(socket.id, {host: hostname, port: 9000, path: '/rtc'});
  });

  socket.on('usersChange', function(users){
    $('.user-list').empty();
    serverinfo.users = users;
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
      var source = document.getElementById("ChatMessage").innerHTML;
      var template = Handlebars.compile(source);
      for( i = 0; i < messages.length; i++){
        var date = moment.utc(messages[i].message_date);
        var data = {
          "messageSender" : messages[i].sender_name,
          "messageContent" : messages[i].message_content,
          "messageDate" : date.format('MMMM Do YYYY, h:mm a'),
          "messageID" : `message-${i}`
        };
        var result = $($.parseHTML(anchorme({
          input: template(data),
          options : {
            attributes: {
              class: "found-link"
            }
          }
        })));
        $('#messages').append(result);
        if ($(result).find(".found-link").length != 0){
          var ogp_url = $(result).find(".found-link")[0].href;
          console.log(ogp_url)
          $.get( "/ogp", { "url": `${ogp_url}` }).done( function( result ){
            var ogSource = document.getElementById("OGPCard").innerHTML;
            var ogTemplate = Handlebars.compile(ogSource);
            var ogData = {
              "ogpImageURL" : result.ogImage.url,
              "ogpURL" : result.ogUrl,
              "ogpTitle" : result.ogTitle,
              "ogpSiteName": result.ogSiteName,
              "ogpDesc" : result.ogDescription
            };
            $(`#message-${i - 1} .ogp-area`).empty();
            $(`#message-${i - 1} .ogp-area`).append(ogTemplate(ogData));
          });
        }
      }
    }
  });

  socket.on("OGPData", function(ogp){
    console.log('reesults:', ogp);
  })

  function getMessages(channel_id, page){
    socket.emit("getMessages", {
      channel_id : channel_id,
      page : page
     });
     $('#messages').empty();
     $('#text_channels li').removeClass("active");
     $('#text_channels #' + channel_id).parent().addClass("active");
     $("#message_input_area *").each( function( index ){
      $(this).prop('disabled', false);
     });
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
    $("#disconnect_button").click(function(){
      leaveChannel();
      $("#disconnect_button").hide();
      isConnected = false;
      $('#voice_channels li').removeClass("active");
      soundeffects.disconnect.play();
    });

    $("#voice_channels").on('click', '* .channel', function() {
      joinChannel($(this).attr("id"));
    })

    $("#text_channels").on('click', '* .channel', function() {
      getMessages($(this).attr("id"), 0);
    })

  });

  $("#message_box").keypress(function (evt) {
    if(evt.keyCode == 13 && !evt.shiftKey) {
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
  });
};

$( document ).ready(function() {
  $( "#connect_form" ).submit(function( event ) {
    event.preventDefault();
    client.name = $("#name_input").val();
    connectToServer();
    $("#connect_overlay").removeClass("active");
  });

  $("#mute_microphone").click(function(){
    if(isMuted){
      isMuted = false;
      $('#mute_microphone svg').attr('data-icon', 'microphone');
      stream.getAudioTracks()[0].enabled = true;
      soundeffects.unmute_mic.play();
    } else {
      isMuted = true;
      $('#mute_microphone svg').attr('data-icon', 'microphone-slash');
      stream.getAudioTracks()[0].enabled = false;
      soundeffects.mute_mic.play();
    }
  });

  $("#mute_audio").click(function(){
    var audioOut = document.querySelector('audio');
    if(audioOut.muted == true){
      audioOut.muted = false;
      $('#mute_audio svg').attr('data-icon', 'volume-up');
      soundeffects.unmute.play();
      isMuted = false;
      $('#mute_microphone svg').attr('data-icon', 'microphone');
      stream.getAudioTracks()[0].enabled = true;
    } else {
      audioOut.muted = true;
      $('#mute_audio svg').attr('data-icon', 'volume-mute');
      soundeffects.mute.play();
      isMuted = true;
      $('#mute_microphone svg').attr('data-icon', 'microphone-slash');
      stream.getAudioTracks()[0].enabled = false;
    }
  });
});
