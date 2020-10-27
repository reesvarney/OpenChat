const { ipcRenderer, remote } = require("electron");
const {URL} = require('url');
var url = new URL(window.location.href);

//passthrough for socket events
global.registerSocket = (socket)=>{
    var onevent = socket.onevent;
    function sendSocketEvent(e, d){
        ipcRenderer.sendToHost('socket_event',{event: e, data: d});
    }

    ipcRenderer.on('socket_event', (e, d) => {
        socket.emit(d.event, d.data)
    })
    
    socket.onevent = function (packet) {
        var args = packet.data || [];
        onevent.call (this, packet);    // original call
        packet.data = ["*"].concat(args);
        onevent.call(this, packet);     // additional call to catch-all
    };

    socket.on('connect', (d)=>{
      sendSocketEvent('connect', d);
    });

    socket.on('disconnect', (d)=>{
      sendSocketEvent('disconnect', d);
    });

    socket.on("*",function(event,data) {
      sendSocketEvent(event, data);
    });

    socket.emit('updateInfo', {
      name: ipcRenderer.sendSync("getUserPrefs").name,
    })
}

global.standalone = true;

window.addEventListener('DOMContentLoaded', () => {
  const $ = require("jquery");

  function sendClientEvent(e, d={}){
    ipcRenderer.sendToHost('client_event',{event: e, data: d});
  }

  $("#logout_button").hide();

  $("#disconnect_button").on('click',()=>{
    sendClientEvent('disconnectCall');
  });

  $("#mute_microphone").on('click',()=>{
    if(!client.call.stream.getAudioTracks()[0].enabled){
      sendClientEvent('muteAllMic', false);
    } else {
      sendClientEvent('muteAllMic', true);
    }
  });

  $("#mute_audio").on('click',()=>{
    if(client.audioOut.muted == true){
      sendClientEvent('muteAllAudio', false);
    } else {
      sendClientEvent('muteAllAudio', true);
    }
  });

  var controls = {
    mic: $("#mute_microphone"),
    audio: $("#mute_audio"),
    disconnect: $("#disconnect_button")
  }

  ipcRenderer.on('client_event', (e, d) => {
    // d.event, d.data
    if(d.event === "setState"){
      $(d.data.selector)
    }
  })
});