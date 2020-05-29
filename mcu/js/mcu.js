function main() {
  var socket = io('http://localhost:8080');
  var ee = new EventEmitter();
  var connected_users = {};

  const createEmptyAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
  };

  var emptyAudio = createEmptyAudioTrack();

  // SOCKET LISTENERS
  socket.on('connect', function() {
    socket.emit('userinfo', {
      type: 'server',
      secret: server_secret
    });
  });

  var peer = new Peer('server', {host: 'localhost', port: 9000, path: '/rtc'});

  const audioOut = document.querySelector('audio');

  function updateStreams(currentChannel){
    console.log(connected_users);
    var channelUsers = [];

    for ( a = 0; a < Object.keys(connected_users).length; a++){
      if((connected_users[Object.keys(connected_users)[a]]["channelID"] == currentChannel) && (connected_users[Object.keys(connected_users)[a]]["channelID"] != null)){
        channelUsers.push(Object.keys(connected_users)[a]);
      }
    }

    if(channelUsers.length > 1){
      var x;

      for(x=0; x < channelUsers.length; x++){
        var currentid = channelUsers[x];
        peers_filtered = channelUsers.filter(function(value, index, arr){return value != currentid});

        var instreams = [];

        if(peers_filtered.length > 1){
          var i;

          for(i = 0; i < peers_filtered.length; i++){
            var currentUser = connected_users[peers_filtered[i]]["call"]
            instreams[i] = currentUser['peerConnection'].getRemoteStreams()[0];
          }

          var mix = new MultiStreamsMixer(instreams);
          var mix_stream = mix.getMixedStream();
          var mix_track = mix_stream.getAudioTracks()[0];
          audioOut.srcObject = instreams[0];
          connected_users[currentid]['call']['peerConnection'].getSenders()[0].replaceTrack(mix_track);

        } else {
          var currentUser = connected_users[peers_filtered[0]]["call"]['peerConnection'];
          var currentStream = currentUser.getRemoteStreams()[0];
          audioOut.srcObject = currentStream;
          connected_users[currentid]["call"]['peerConnection'].getSenders()[0].replaceTrack(currentStream.getAudioTracks()[0]);
        }
      }
    };
  };

  peer.on('call', function(call) {
    var peerChannel = connected_users[call.peer]['channelID'];
    connected_users[call.peer].call = call;
    call.answer(new MediaStream([emptyAudio]));

    call.on('stream', function(remoteStream) {
      updateStreams(peerChannel);
      socket.emit('peerConnected', {
        user: call.peer,
      channel:  connected_users[call.peer]['channelID']
    });
    });

    call.on('error', function() {
      var old_channel = connected_users[call.peer]['channelID'];
      delete connected_users[call.peer];
      updateStreams(old_channel);
      socket.emit("callClosed", call.peer);
    });
  });

  socket.on("setChannel", function(data){
    if(connected_users[data.user] != undefined){
      var old_channel = connected_users[data.user]['channelID'];
      connected_users[data.user].call.close();
      delete connected_users[data.user];
      updateStreams(old_channel);
      connected_users[data.user] = {};
      connected_users[data.user]['channelID'] = data.channel;
      socket.emit("callClosed", data.user);
      socket.emit('peerReady', data.user);
    } else {
      connected_users[data.user] = {};
      connected_users[data.user]['channelID'] = data.channel;
      socket.emit('peerReady', data.user);
    }
  });

  socket.on("closeCall", function(data){
    var old_channel = connected_users[data.user]['channelID'];
    connected_users[data.user].call.close();
    delete connected_users[data.user];
    updateStreams(old_channel);
    socket.emit("callClosed", data.user);
  });
};