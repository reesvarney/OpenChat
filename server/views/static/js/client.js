navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var soundfiles = [
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
      UIkit.modal($(`#overlay>#${div}`), {container: false}).show();
    },
    hide: function () {
      UIkit.modal($(`#overlay>*`), {container: false}).hide();
    },
};

var soundeffects = new Proxy(soundfiles, {
  get(target, filename) {
    var audio = new Audio(`./audio/${filename}.mp3`);
    audio.loop = false;
    return audio
  }
})

class call{
  constructor(){
    if(window.standalone || false){
      this.constraints = bridge.constraints;
    } else {
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
    }
    this.connection = null;
    this.connected = false;
    navigator.getUserMedia(this.constraints, (ls)=>{
      this.stream = ls;
    }, function(err) {
      console.log('Failed to get local stream', err);
    });
  }

  start(){
    this.connection = client.peer.call('server', this.stream);
    this.connection.on('stream',(remoteStream)=>{
      this.connected = true;
      if(client.isStandalone){
        bridge.startCall()
      };
      $("#disconnect_button").show();
      $('#voice_channels li').removeClass("active");
      $('#voice_channels #' + client.voiceChannel.negotiating).parent().parent().addClass("active");
      client.audioOut.srcObject = remoteStream;
      client.voiceChannel.current = client.voiceChannel.negotiating;
      client.voiceChannel.negotiating = null;
      soundeffects.connect.play();
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
    this.socket = null;
    this.textChannel = null;
    this.voiceChannel = {
      current: null,
      negotiating: null
    };
    // channels stores the channel objects including DOM whilst serverinfo.channels is the raw data that was last received
    this.channels = {};
    this.serverinfo = null;
    this.call = new call();
    this._initDomListeners();
    this._initSocket();
  }

  _initSocket(){
    // I'll put this in the window as well as it seems to be throttled when I put it into the class, hopefully that'll fix it
    window.socket = this.socket = io.connect();
    this.socket.on("connect", ()=>{
      if (!this.isStandalone){
        this.socket.on('disconnect', function(){
          window.location.reload();
        });
      } else {
        //send socket events to client, function provided by bridge
        bridge.registerSocket(this.socket)
      };
  
      //Emit user information, this may be updated with more data in the future.
      this.socket.emit('clientInfo', {
        type: "client"
      });
  
      //When the server information has been sent
      this.socket.on('serverInfo',(d)=>{
        this.serverinfo = d;
        this.peer = new Peer(this.socket.id, {host: window.location.hostname, path: '/rtc'});
        (async()=>{
          await this._populateChannels(d);
          this._populateUsers(d);
        })()
      });
  
      //Permission to join has been received
      this.socket.on('canJoin', (d)=>{
        if(d === true){
          this.call.start();
        } else {
          console.log("NEGOTIATION ERROR");
        }
      });
  
      //openchat related errors
      this.socket.on("ocerror", (d)=>{
        console.log("OPENCHAT ERROR: " + d);
      });
  
      //Change in users
      this.socket.on('serverUpdate', (d)=>{
        if(this.serverinfo !== null){
          (async()=>{
            if(d.updateData.includes("channels")){
              await this._populateChannels(d);
            }
            if(d.updateData.includes("users")){
              this._populateUsers(d);
            }
            if(d.updateData.includes("name")){
              // change server name
            }
          })()
        };
      });
  
      this.socket.on("newMessage", (d)=>{
        if(d.channel_id == this.textChannel ){
          this.channels[d.channel_id].getMessages({"id": d.message_id});
        }
      });
    })
  };

  _populateUsers(d){
    $('.user-list').empty();
    $('.global-user-list ul').empty();
    this.serverinfo.users = d.users;
    console.log(d.users)
    for(const [userID, user] of Object.entries(d.users)){
      $("<li><a></a></li>").text(`${user.name} - ${user.status}`).appendTo(`.global-user-list ul${(user.temp) ? ".temp-users" : ".perm-users"}`);
      if(user.channel !== null){
        $("<li><div class='user'><a></a></div></li>").text(user.name).appendTo(`#${user.channel}-users`);
        if(user.socketID !== this.socket.id && user.channel === this.voiceChannel.current){
          // Play external join sound
        }
      } else {
        if(user.socketID == this.socket.id && this.call.connected && this.voiceChannel.negotiating === null){
          this.voiceChannel.current = this.voiceChannel.negotiating = null;
          $("#disconnect_button").hide();
          $('#voice_channels li').removeClass("active");
          soundeffects.disconnect.play();
          this.call.connected = false;
        }
      }
    }
  }

  _createCategory(channel_type){
    var category = $(`<div class="channel-group"><h4>${channel_type.toUpperCase()}</h4></div>`).appendTo('#channels');
    var categoryList = $(`<ul id="${channel_type}_channels" group-type="${channel_type}"></ul>`).appendTo(category);

    // Create sortable - this needs to be put into edit_channels file
    var type = categoryList.attr('group-type');
    if(categoryList.children.length > 0){
      new Sortable($(categoryList)[0], {
        animation: 150,
        onUpdate: (evt)=>{
          $.ajax({
            async: true,
            type: 'POST',
            url: `/admin/channel/move/${$(evt.item).find('.channel')[0].id}`,
            data: {index: evt.newIndex, type: type},
            timeout: 10000,
            error: ((err)=>{
              console.log(err)
            }),
            success: (()=>{
              evt.item.setAttribute("position", evt.newIndex);
            })
          })
        }
      });
    };
    return {category, categoryList}
  }

  async _populateChannels(d){
    if(this.serverinfo.channels !== d.channels){
      // Use to remove any channel categories that don't exist remotely
      for(const channel_type of Object.keys(this.serverinfo.channels)){
        if(d.channels[channel_type] === undefined){
          var localChannels = Object.values(this.channels).filter(({type}) => type === channel_type);
          for(const temp_channel of localChannels){
            $(temp_channel.el).remove();
            delete this.channels[temp_channel.id];
          };
          if($(`#${channel_type}_channels`) !== null){
            $(`#${channel_type}_channels`).parent(".channel-group").remove()
          };
        }
      }

      for(const [channel_type, channels] of Object.entries(d.channels)){        
        var localChannels = Object.values(this.channels).filter(({type}) => type === channel_type);

        if(Object.keys(this.channels).length === 0 || localChannels.length === 0 ){
          // No channels exist for this category, create it

          // Just in case theres the remnants from a category being deleted
          if($(`#${channel_type}_channels`) !== null){ $(`#${channel_type}_channels`).parent(".channel-group").remove()}

          // Create category elements
          var {categoryList} = this._createCategory(channel_type);

          // create the type if it doesn't exist
          if(this.serverinfo.channels[channel_type] === undefined){
            this.serverinfo.channels[channel_type] = [];
          };

          // Create channels for category
          for(const chnl of channels){
            if(!(chnl.id in this.serverinfo.channels[channel_type])){
              await this.addChannel(chnl, categoryList);
            };
          };

        } else {
          if(channels.length !== localChannels.length){
            // Need to add or remove channels from this category
            var localIds = localChannels.map(a => a.id);
            var remoteIds = channels.map(a => a.id);

            for(const localId of localIds){
              if(!remoteIds.includes(localId)){
                $(this.channels[localId].el).remove();
                delete this.channels[localId];
              };
            };

            for( const remoteId of remoteIds){
              if(!localIds.includes(remoteId)){
                var toAdd = channels.find(a => {return a.id === remoteId});
                var categoryList = $(`#${toAdd.type}_channels`);
                this.addChannel(toAdd, categoryList);
              };
            }; 
          }
          
          if(channels.sort((a, b) => (a.position > b.position) ? 1 : -1).map((a) => a.id) !== localChannels.sort((a, b) => (a.position > b.position) ? 1 : -1).map((a) => a.id) ){
            // Move channels         
            
          }
          
          if(channels.sort().map((a) => a.name).join(',') !== localChannels.sort().map((a) => a.name).join(',')){
            // Check channel names
          }
        }
      }
    };
  };

  async addChannel(d, categoryList){
    await $.ajax({
      async: true,
      type: 'GET',
      url: `/channels/${d.id}`,
      timeout: 10000,
      success: ((result)=>{
        var channel_el = $(result).appendTo(categoryList);
        new channelTypes[d.type](channel_el);
      })
    });
  };

  _initDomListeners(){
    $( document ).ready(()=>{
      this.audioOut = ($(Object.assign(document.createElement("audio"), {autoplay: true})).appendTo('body'))[0];
      if(this.isStandalone && "outputDevice" in bridge){
        this.audioOut.setSinkId(bridge.outputDevice);
      }

      // CALL CONTROLS
      if(!this.isStandalone){
        $("#disconnect_button").on('click',()=>{
          this.call.end();
        });
  
        $("#mute_microphone").on('click',()=>{
            this.muteMic(!this.call.stream.getAudioTracks()[0].enabled);
        });
      
        $("#mute_audio").on('click',()=>{
            this.muteAudio(!this.audioOut.muted);
        });
      }
    });
  }

  muteAudio(mute){
    if(mute){
      this.audioOut.muted = true;
      $('#mute_audio i').removeClass('fa-volume-up').addClass('fa-volume-mute');
      soundeffects.mute.play();
    } else {
      this.audioOut.muted = false;
      $('#mute_audio i').removeClass('fa-volume-mute').addClass('fa-volume-up');
      soundeffects.unmute.play();
    }
  };

  muteMic(mute){
    if(mute){
      $('#mute_microphone i').removeClass('fa-microphone-slash').addClass('fa-microphone');
      this.call.stream.getAudioTracks()[0].enabled = true;
      soundeffects.unmute_mic.play();
    }else {
      $('#mute_microphone i').removeClass('fa-microphone').addClass('fa-microphone-slash');
      this.call.stream.getAudioTracks()[0].enabled = false;
      soundeffects.mute_mic.play();
    } 
  }
};

class channel{
  constructor(el){
    this.el = el;
    this.id = $(el).find(".channel")[0].id;
    this.name = $(el).find(".channel")[0].innerText;
    this.type = null;
    client.channels[this.id] = this;
    this.position = $(el).index();
  }
}

class voiceChannel extends channel{
  constructor(el){
    super(el);
    this.type = "voice";
    $(this.el).on('click', '.channel', ()=> {
      this.joinChannel()
    });
  }

  joinChannel(){
    if(!(client.voiceChannel.current == this.id)){
      client.voiceChannel.negotiating = this.id;
      client.socket.emit('joinChannel', this.id);
    } else {
      console.log('ALREADY CONNECTED');
    }
  }
}

class textChannel extends channel{
  constructor(el){
    super(el);
    this.type = "text";
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
    
          if("page" in params && params.page == 0 || (!("page" in params) && scrollController.doesScroll(200))) {
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

var channelTypes = {
  voice: voiceChannel,
  text: textChannel
}

$( document ).ready(function() {
  client.darkMode = new class{
    constructor(){
      this.dark = false;
      this.darkScript = false;

      if(client.isStandalone){
        $('#toggleDark').hide();
        if(bridge.getDark()){
          this.setDark(true)
        }
      } else {
        this.dark = (localStorage.dark === "true") ? true : false;
        this.setDark(this.dark)
      }
    }
  
    loadDarkScript(val){
      var script = document.createElement('script');
      script.src = './js/darkreader.js';
      this.darkScript = document.head.appendChild(script);
      this.darkScript.onload = ()=>{
        if(val === 'toggle'){
          val = !this.dark;
        }
        this.setDark(val)
      }
    }
  
    setDark(val){
      if(this.darkScript === false){
        this.loadDarkScript(val)
      } else {
        if(val === 'toggle'){
          val = !this.dark;
        }
        if(val === true){
          DarkReader.enable();
        }else if(val === false && this.darkScript !== false){
          DarkReader.disable();
        }
      }
      this.dark = val;
      if(!client.isStandalone){localStorage.dark = this.dark};
    }
  }

  $("#toggleDark").on('click', function(){
    client.darkMode.setDark('toggle');
  });

  $("#nav-toggle").on('click',function(){
    $("nav").show();
  })

  $("#nav-close").on('click',function(){
    $("nav").hide();
  })

  $("#new_msg_btn").on('click',function(){
    scrollController.goToBottom(true);
    $("#new_message").hide();
  })

  $("#new_msg_close").on('click',function(){
    $("#new_message").hide();
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
        scrollController.goToBottom(true); 
        $("#message_box").val("");
      }),
      error: function (xhr, ajaxOptions, thrownError) {
        console.log(xhr, thrownError)
      }
    });
  });
  
  scrollController = new smartScroll($('#message_scroll'));
});