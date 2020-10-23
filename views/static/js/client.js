navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

var soundeffects = {},
  soundfiles = [
    "mute",
    "unmute",
    "connect",
    "mute_mic",
    "unmute_mic",
    "disconnect"
  ],
  scrollController,
  overlay = {
    show: function (div) {
      $("#overlay").show();
      $(`#overlay>*`).hide();
      $(`#overlay>#${div}`).show();
    },
    hide: function () {
      $("#overlay").hide();
    },
};

for(i = 0; i < soundfiles.length; i++){
  soundeffects[soundfiles[i]] = new Audio(`./audio/${soundfiles[i]}.mp3`);
  soundeffects[soundfiles[i]].loop = false;
};

class call{
  constructor(){
    this.constraints = {
      audio: {
          sampleRate: 64000,
          volume: 1.0,
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: true
      },
      video: false
    };
    this.connected = false;
    this.connection = null;
    navigator.getUserMedia(this.constraints, (ls)=>{
      this.stream = ls;
    }, function(err) {
      console.log('Failed to get local stream', err);
    });
  }

  // Allows alternate client objects to be specified. This probably won't be needed though unless somehow a single user should have multiple connections
  start(){
    this.connection = client.peer.call('server', this.stream);
    this.connection.on('stream', function(remoteStream) {
      $("#disconnect_button").show();
      $('#voice_channels li').removeClass("active");
      $('#voice_channels #' + client.voiceChannel.negotiating).parent().parent().addClass("active");
      client.audioOut.srcObject = remoteStream;
      client.voiceChannel.current = client.voiceChannel.negotiating;
      soundeffects.connect.play();
      this.connected = true;
    });
  }

  end(){
    client.socket.emit('leaveChannel');
    client.voiceChannel.current = client.voiceChannel.negotiating = null;
    $("#disconnect_button").hide();
    $('#voice_channels li').removeClass("active");
    soundeffects.disconnect.play();
    this.connected = false;
  }

}

var client = window.client = new class{
  constructor(){
    this.isStandalone = window.standalone || false;
    this.socket = io.connect();
    this.textChannel = null;
    this.voiceChannel = {
      current: null,
      negotiating: null
    };
    this.channels = {};
    this._init()
  }

  _init(){
    this._initSocket();
    this.call = new call;
    this._initDomListeners();
  }

  _initSocket(){
    if (!this.isStandalone){
      this.socket.on('disconnect', function(){
        window.location.reload();
      });
    } else {
      //send socket events to client, function provided by bridge
      registerSocket(this.socket)
    };

    //Emit user information, this may be updated with more data in the future.
    this.socket.emit('userInfo', {
      type: "client"
    });

    //When the server information has been sent
    this.socket.on('serverInfo', function(d){
      this.serverinfo = d;
      this.peer = new Peer(this.socket.id, {host: window.location.hostname, path: '/rtc', port: d.peerPort});
    }.bind(this));

    //Permission to join has been received
    this.socket.on('canJoin', function(d){
      if(d === true){
        this.call.start();
      } else {
        console.log("NEGOTIATION ERROR");
      }
    }.bind(this));

    //openchat related errors
    this.socket.on("ocerror", function(d){
      console.log("OPENCHAT ERROR: " + d);
    }.bind(this));

    //Change in users
    this.socket.on('usersChange', function(u){
      $('.user-list').empty();
      this.serverinfo.users = u;
      for(i = 0; i < Object.keys(u).length; i++){
        if(u[Object.keys(u)[i]].channel != null){
          $("<li><a></a></li>").text(u[Object.keys(u)[i]].name).appendTo(`#${u[Object.keys(u)[i]].channel}-users`);
        }
      }
    }.bind(this));

    this.socket.on("newMessage", (d)=>{
      if(d.channel_id == this.textChannel ){
        this.channels[d.channel_id].getMessages({"id": d.message_id});
      }
    });
  }

  _initDomListeners(){
    $( document ).ready(()=>{
      this.audioOut = ($(Object.assign(document.createElement("audio"), {autoplay: true})).appendTo('body'))[0];

      $("#text_channels li").each((i, el)=>{
        new textChannel(el, this);
      });

      $("#voice_channels li").each((i, el)=>{
        new voiceChannel(el, this);
      });

      $("#disconnect_button").on('click',()=>{
        this.call.end();
      });

      $("#mute_microphone").on('click',()=>{
        if(!this.call.stream.getAudioTracks()[0].enabled){
          $('#mute_microphone i').removeClass('fa-microphone-slash').addClass('fa-microphone');
          this.call.stream.getAudioTracks()[0].enabled = true;
          soundeffects.unmute_mic.play();
        } else {
          $('#mute_microphone i').removeClass('fa-microphone').addClass('fa-microphone-slash');
          this.call.stream.getAudioTracks()[0].enabled = false;
          soundeffects.mute_mic.play();
        }
      });
    
      $("#mute_audio").on('click',()=>{
          if(this.audioOut.muted == true){
            this.audioOut.muted = false;
            $('#mute_audio i').removeClass('fa-volume-mute').addClass('fa-volume-up');
            soundeffects.unmute.play();
          } else {
            this.audioOut.muted = true;
            $('#mute_audio i').removeClass('fa-volume-up').addClass('fa-volume-mute');
            soundeffects.mute.play();
          }
        });
    });
  }
};

class channel{
  constructor(el){
    this.el = el;
    this.id = $(el).find(".channel")[0].id;
    this.name = $(el).find(".channel")[0].innerText;
    client.channels[this.id] = this;
  }
}

class voiceChannel extends channel{
  constructor(el){
    super(el)
    $(this.el).on('click', '.channel', ()=> {
      this.joinChannel()
    });
  }

  joinChannel(){
    if(!(client.voiceChannel.current == this.id)){
      client.socket.emit('joinChannel', this.id);
      client.voiceChannel.negotiating = this.id;
    } else {
      console.log('ALREADY CONNECTED');
    }
  }
}

class textChannel extends channel{
  constructor(el){
    super(el);
    $(this.el).on('click', '.channel', ()=> {
      if(this.id != client.textChannel){
        $("#text_channels li").removeClass("active");
        $(this.el).addClass("active");
        this.page = 0;
        client.textChannel = this.id;
        $("#message_input_area *").each( function( index ){
          $(this).prop('disabled', false);
        });
        this.getMessages({page: this.page});
        $("#channel_name").text(this.name)
      }
    });
  };

  getMessages(params){
    $.ajax({
      async: true,
      type: 'GET',
      url: `/messages/${this.id}`,
      data: params,
      timeout: 10000,
      success: ((result)=>{
        //Check that the channel is still active
        if(this.id == client.textChannel){
          if("page" in params && params.page == 0){
            $('.message-card').remove();
            $('#no_messages').remove();
          }
    
          this.lastMessage = $("#messages>:last-child");
  
          if (!("id" in params)){
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
            scrollController.goToChild(this.lastMessage);
          } else {
            $("#new_message").show();
          }
        }
      })
    });
  };
}

$( document ).ready(function() {
  $("#overlay").on("click", function (e) {
    if (e.target !== this) return;
    overlay.hide();
  });

  $("#nav-toggle").on('click',function(){
    $("nav").show();
  })

  $("#nav-close").on('click',function(){
    $("nav").hide();
  })

  $("#new_msg_btn").on('click',function(){
    scrollController.goToBottom(true);
    $("#new_message").toggleClass('hidden');
  })

  $("#new_msg_close").on('click',function(){
    $("#new_message").toggleClass('hidden');
  })

  $("#load_messages a").on('click',function(){
    var channel = client.channels[client.textChannel];
    channel.page += 1;
    channel.getMessages({"page": channel.page})
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
    $.ajax({
      async: true,
      type: 'POST',
      url: `/messages/${client.textChannel}`,
      data: {contents: contents},
      timeout: 10000,
      success: ( function( result){ 
        $("#message_box").val("");
      })
    });
    scrollController.goToBottom(true);
  });

  scrollController = new smartScroll($('#message_scroll'));
});