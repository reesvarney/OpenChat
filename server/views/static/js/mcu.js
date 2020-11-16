function main() {
  var socket = io.connect();
  var connected_users = {};

  const createEmptyAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, {
      enabled: false
    });
  };

  var emptyAudio = createEmptyAudioTrack();

  // SOCKET LISTENERS
  socket.on("connect", function () {
    socket.emit("userInfo", {
      type: "server",
      secret: server_secret,
    });
  });

  var peer;

  const audioOut = document.querySelector("audio");

  function updateStreams(currentChannel) {
    var channelUsers = [];

    for (a = 0; a < Object.keys(connected_users).length; a++) {
      if (connected_users[Object.keys(connected_users)[a]]["channelID"] ==currentChannel && connected_users[Object.keys(connected_users)[a]]["channelID"] != null) {
        channelUsers.push(Object.keys(connected_users)[a]);
      }
    }

    if (channelUsers.length > 1) {
      var x;

      for (x = 0; x < channelUsers.length; x++) {
        var currentid = channelUsers[x];
        peers_filtered = channelUsers.filter(function (value, index, arr) {
          return value != currentid;
        });

        var instreams = [];

        if (peers_filtered.length > 1) {
          var i;

          for (i = 0; i < peers_filtered.length; i++) {
            var currentUser = connected_users[peers_filtered[i]]["call"];
            if(currentUser !== undefined){ instreams[i] = currentUser["peerConnection"].getRemoteStreams()[0]};
          }

          //TODO STORE MIXER IN USER OBJECT SO IT CAN BE REMOVED
          if ("mixer" in connected_users[currentid]){
            connected_users[currentid]["mixer"].end();
          }
          connected_users[currentid]["mixer"] = new MultiStreamsMixer(
            instreams
          );
          var mix_stream = connected_users[currentid]["mixer"].getMixedStream();
          var mix_track = mix_stream.getAudioTracks()[0];
          audioOut.srcObject = instreams[0];
          if(connected_users[currentid]["call"] !== undefined){
            connected_users[currentid]["call"]["peerConnection"].getSenders()[0].replaceTrack(mix_track)
          };
        } else {
          if(connected_users[peers_filtered[0]]["call"] !== undefined){
            var currentUser = connected_users[peers_filtered[0]]["call"]["peerConnection"];
            var currentStream = currentUser.getRemoteStreams()[0];
            audioOut.srcObject = currentStream;
            if(connected_users[currentid]["call"] !== undefined){connected_users[currentid]["call"]["peerConnection"].getSenders()[0].replaceTrack(currentStream.getAudioTracks()[0])};
          }
        }
      }
    }
  };
  
  socket.on("serverInfo", function(data) {
    peer = new Peer("server", {
      host: "localhost",
      path: '/rtc',
      port: data.peerPort
    });

    peer.on("call", function (call) {
      var peerChannel = connected_users[call.peer]["channelID"];
      connected_users[call.peer].call = call;
      call.answer(new MediaStream([emptyAudio]));
  
      call.on("stream", function (remoteStream) {
        updateStreams(peerChannel);
        socket.emit("peerConnected", {
          user: call.peer,
          channel: connected_users[call.peer]["channelID"],
        });
      });
  
      call.on("error", function () {
        var old_channel = connected_users[call.peer]["channelID"];
        delete connected_users[call.peer];
        updateStreams(old_channel);
        socket.emit("callClosed", call.peer);
      });
    });

  })

  socket.on("setChannel", function (data) {
    if (data.user in connected_users) {
      var old_channel = connected_users[data.user]["channelID"];
      if ("call" in connected_users[data.user]){
        connected_users[data.user].call.close();
      }
      delete connected_users[data.user];
      updateStreams(old_channel);
      connected_users[data.user] = {};
      connected_users[data.user]["channelID"] = data.channel;
      socket.emit("callClosed", data.user);
      socket.emit("peerReady", data.user);
    } else {
      connected_users[data.user] = {};
      connected_users[data.user]["channelID"] = data.channel;
      socket.emit("peerReady", data.user);
    }
  });

  socket.on("closeCall", function (data) {
    if (data.user in connected_users){
      var old_channel = connected_users[data.user]["channelID"];
      if ("call" in connected_users[data.user]){
        if("mixer" in connected_users[data.user]){connected_users[data.user].mixer.end()};
        connected_users[data.user].call.close();
      }
      delete connected_users[data.user];
      updateStreams(old_channel);
      socket.emit("callClosed", data.user);
    }
  });
}