
  // SOCKET LISTENERS
  const mcu = new class{
    constructor(){
      this.users = {};
      this.channels = {};
      this.peer = null;
      this.socket = null;
      this.initSockets();
    }

    initSockets(){
      this.socket = null; // Just to make sure the listeners are removed
      this.socket = io.connect();

      this.socket.on("connect", ()=>{
        console.log('Connected to websocket')
        this.socket.emit("clientInfo", {
          type: "mcu",
          secret: server_secret
        });
        
        this.peer = new Peer("server", {
          host: "localhost",
          path: '/rtc'
        });

        this.peer.on("call", (call)=>{
          let result = Object.assign({}, ...Object.entries(this.users).map(([a,b]) => ({ [b.socket_id]: a })));
          if(call.peer in result){
            this.users[result[call.peer]].setCall(call);
          } else {
            // Error - need to tell the server to resend the user data
            this.socket.emit("mcu_error", {"type": "user_not_exists", "data":  call.peer})
          }
        });
      });
      
      this.socket.on("serverInfo", (data)=>{
        this.syncToServer(data);
      });
      
      this.socket.on("serverUpdate", (data)=>{
        this.syncToServer(data);
      })
    
      this.socket.on("setChannel", (data)=>{
        if(data.user in this.users){
          // If user exists set their channel
          this.users[data.user].setChannel(data.channel)
        } else {
          // Error - need to tell the server to resend the user data
          this.socket.emit("mcu_error", {"type": "user_not_exists", "data": data.user})
        }
      });
    
      this.socket.on("closeCall", (data)=>{
        if(data.user in this.users){
          this.users[data.user].closeCall();
        } else {
          this.socket.emit("callClosed", data.user)
        }
      });

      this.socket.on("disconnect", ()=>{
        console.log("Lost connection")
        // this.initSockets();
        // Had issues with double responses to socket events when re-initiating the connection.
        // This should basically do the same thing but without risking any old data getting muddled up
        window.location.reload(); 
      });
    }

    syncToServer(data){     
      // Add any new users

      if("users" in data){
        for(const [userID, user] of Object.entries(data.users)){
          if(!(userID in this.users) && user.status === "online" ){
            // Create the new user object, can set constraints etc in here
            user.id = userID;
            this.users[userID] = new client(user, {});
          }
          if(user.status === "online") this.users[userID].socket_id = user.socketID;
        };
    
        // Remove any disconnected users
        for(const user of Object.values(this.users)){
          if(!(user.id in data.users) || data.users[user.id].status === "offline"){
            this.users[user.id].closeCall();
            delete this.users[user.id];
          }
        }  
      }

      if("channels" in data){
        // Create channels if they don't exist
        if(data.channels.voice === undefined){
          data.channels["voice"] = [];
        };

        for(const vc of data.channels.voice){
          if(!(vc.id in this.channels)){
            this.channels[vc.id] = new channel(vc);
          }
        };
    
        // Remove any channels that have been deleted
        for(const vc in this.channels){
          let found = false;
          for(const serverChannel of data.channels.voice){
            if(vc === serverChannel.id){
              found = true;
            }
          };
    
          if(!found){
            this.channels[vc].getUsers().forEach(userID=>{
              this.users[userID].closeCall();
            });
            this.channels[vc].remove();
            delete this.channels[vc];
          }
        };
      }
    }
  }


  class client{
    constructor(data, constraints={}){
      // Set constraints such as muted users and other stuff
      // Then use in update streams
      this.id = data.id;
      this.constraints = constraints;
      this.call = null;
      this.mixer = null;
      this.channel = null;
      this.socket_id = data.socketID;
    }
  
    setCall(call){
      this.call = call;
      this.call.answer(new MediaStream([createEmptyAudioTrack()]));
  
      this.call.on("stream", ()=>{
        if(this.channel !== null && mcu.channels[this.channel] !== undefined){
          // Update the streams for the user's channel
          mcu.channels[this.channel].updateStreams();
    
          // Tell the server that they have connected
          mcu.socket.emit("peerConnected", {
            user: this.id,
            channel: this.channel,
          });
        }
      });
  
      this.call.on("error", ()=>{
        this.closeCall();
      });
    };
  
    closeCall(){
      // Remove user from old channel if there is any
      if(this.channel !== null){
      // Update the old channel
        if(mcu.channels[this.channel] !== undefined){
          mcu.channels[this.channel].updateStreams();
        };
  
        // Close the call if it exists
        if (this.call !== null){
          this.call.close();
        };
  
        // Get rid of the mixer if it exists
        if(this.mixer !== null){
          this.mixer.end();
          this.mixer = null;
        }
  
        // Set the channel value to null
        this.channel = null;
  
        // Tell the server that the call has been closed
        mcu.socket.emit("callClosed", this.id);
      };
    };
  
    setChannel(channelID){
      // Close any existing calls first
      this.closeCall();
  
      // Set the channel to the new ID
      this.channel = channelID;
  
      // Tell the server that it is ready
      mcu.socket.emit("peerReady", this.id);
    }
  }
  
  class channel{
    constructor({id}){
      this.id = id;
      // Keeping this here just in case the audio element is needed
      let audio = document.createElement("AUDIO");
      audio.controls = true;
      audio.autoplay = true;
      audio.muted = true;
      this.audioOut = document.body.appendChild(audio);
    }
  
    getUsers(){
      let connectedUsers = [];
      for(const user of Object.values(mcu.users)){
        if(user.channel === this.id){
          connectedUsers.push(user.id);
        }
      };
      return connectedUsers
    }
  
    updateStreams(){
      let connectedUsers = this.getUsers();
  
      // Iterate through each connected user
      connectedUsers.forEach(currentID => {
        // check that the current user's call exists
        if(mcu.users[currentID]["call"] !== null){
  
          // End the existing mixer if it already exists
          if (mcu.users[currentID].mixer !== null ){
            mcu.users[currentID].mixer.end();
            mcu.users[currentID].mixer = null;
          }
  
          // Duplicate the user array minus the current user, check that the user's call exists
          // TODO: Should also do checks for user constraints in here as well
          let peers_filtered = connectedUsers.filter((value, index, arr)=>{
            return (value !== currentID && mcu.users[value].call !== null);
          });
  
          if (peers_filtered.length > 1) {
            // If more than one other user, combine streams
  
            // Array to contain any streams that need to be combined by the stream mixer
            let inStreams = [];
  
            // Add remote stream to inStreams
            for (i = 0; i < peers_filtered.length; i++) {
              inStreams[i] = mcu.users[peers_filtered[i]]["call"]["peerConnection"].getRemoteStreams()[0];
            }
  
            // Mix the inStreams together with MSM
            mcu.users[currentID]["mixer"] = new MultiStreamsMixer(inStreams);
    
            // Get the mixed streams/ tracks
            let mix_stream = mcu.users[currentid]["mixer"].getMixedStream();
            let mix_track = mix_stream.getAudioTracks()[0];
  
            // seems that it needs to be played through/ loaded into an audio element to work? not too sure but i think it needs this to work
            this.audioOut.srcObject = instreams[0];
  
            // Set the output track to the mixed audio
            mcu.users[currentID]["call"]["peerConnection"].getSenders()[0].replaceTrack(mix_track)
  
          } else if(peers_filtered.length === 1) {
            // Else just forward the incoming streams
  
            // Get peer stream
            let currentStream = mcu.users[peers_filtered[0]]["call"]["peerConnection"].getRemoteStreams()[0];
            
            // See above ^13
            this.audioOut.srcObject = currentStream;
  
            // Replace the track with other user's
            mcu.users[currentID]["call"]["peerConnection"].getSenders()[0].replaceTrack(currentStream.getAudioTracks()[0]);
          
          } else {
            // No other users
  
            // Replace output with empty audio track
            mcu.users[currentID]["call"]["peerConnection"].getSenders()[0].replaceTrack(createEmptyAudioTrack());
          }
        }
      })
    };

    remove(){
      this.audioOut.remove()
    };
  
    // TODO: Allow for streams to be appended/ removed
    addUser(){
    }
  }

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