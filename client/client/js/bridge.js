const {ipcRenderer,remote} = require("electron");
const { resolve } = require("path");
const {URL} = require('url');
var url = new URL(window.location.href);
var userPrefs = ipcRenderer.sendSync("getUserPrefs");

//passthrough for socket events
global.standalone = true;
async function findDevice(label){
  var devices = await navigator.mediaDevices.enumerateDevices();
  var found = devices.find(device => device.label == label);
  console.log(found)
  if(found !== undefined){
    return found.deviceId;
  } else {
    return 'default'
  }
}

(async()=>{
  global.bridge = {
    getDark: ()=>{
      return ipcRenderer.sendSync("getUserPrefs").darkMode;
    },
    registerSocket: (socket) => {
      var onevent = socket.onevent;
    
      function sendSocketEvent(e, d) {
        ipcRenderer.sendToHost('socket_event', {
          event: e,
          data: d
        });
      }
    
      ipcRenderer.on('socket_event', (e, d) => {
        socket.emit(d.event, d.data)
      })
    
      socket.onevent = function (packet) {
        var args = packet.data || [];
        onevent.call(this, packet); // original call
        packet.data = ["*"].concat(args);
        onevent.call(this, packet); // additional call to catch-all
      };
    
      socket.on('connect', (d) => {
        sendSocketEvent('connect', d);
      });
    
      socket.on('disconnect', (d) => {
        sendSocketEvent('disconnect', d);
      });
    
      socket.on("*", function (event, data) {
        sendSocketEvent(event, data);
      });
    
      socket.emit('updateInfo', {
        name: ipcRenderer.sendSync("getUserPrefs").name,
      })
    },
    outputDevice: await findDevice(userPrefs.audioOutput),
    constraints:{
      audio: {
        sampleRate: 64000,
        volume: 1.0,
        noiseSuppression: false,
        echoCancellation: false,
        autoGainControl: true,
        deviceId: {exact: await findDevice(userPrefs.audioSource)}
      },
      video: false
    }
  }
})()


window.addEventListener('DOMContentLoaded', () => {
  const $ = require("jquery");

  function sendClientEvent(e, d = {}) {
    ipcRenderer.sendToHost('client_event', {
      event: e,
      data: d
    });
  };

  global.bridge.startCall = ()=>{
    sendClientEvent('startCall', {source: url.href})
  }

  $("#logout_button").hide();

  $("#disconnect_button").on('click', () => {
    sendClientEvent('disconnectCall');
  });

  $("#mute_microphone").on('click', () => {
    if (client.call.stream.getAudioTracks()[0].enabled) {
      sendClientEvent('muteAllMic', false);
    } else {
      sendClientEvent('muteAllMic', true);
    }
  });

  $("#mute_audio").on('click', () => {
    if (client.audioOut.muted == true) {
      sendClientEvent('muteAllAudio', false);
    } else {
      sendClientEvent('muteAllAudio', true);
    }
  });

  ipcRenderer.on('client_event', (e, d) => {
    switch (d.event) {
      case "disconnectCall":
        if (client.call.connected) {
          client.call.end();
        }
        break;
      case "muteAllMic":
        client.muteMic(d.data);
        break;
      case "muteAllAudio":
        client.muteAudio(d.data);
        break;
      case "startCall":
        if(d.data.source !== url.href){
          if (client.call.connected){
            client.call.end();
          }
          $("#disconnect_call").show();
        }
        break;
      case "setDark":
        client.darkMode.setDark(d.data);
        break
      default:
        console.log("Unhandled client event:", d)
    }
  })
});