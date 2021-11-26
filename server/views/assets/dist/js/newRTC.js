// Create core RTC negotiation class that will then have a child class for client/ server
class OCRTCBase{
  constructor({
    iceServer="",
    socket=null,
  }){
    this.stream = null;
    this.socket = socket;
    this.peerConnection = new RTCPeerConnection({iceServers: [{urls: iceServer}]});
    this.peerConnection.onicecandidate = ({candidate}) => {
      this.socket.emit("RTCNegotiation", {type: "candidate", data: candidate})
    };
    this._createListeners();
  }

  _createListeners(){
    this.socket.on('RTCNegotiation', ({type, data})=>{
      switch(type){
        case "desc":
          if(data.type == "offer"){
            this._onOffer(data);
          } else if(data.type == "answer"){
            this._onAnswer(data);
          } else {
            console.log("Invalid SDP Type");
          }
        case "candidate":
          this._onCandidate(data);
      }
    });

    this.peerConnection.ontrack = (event)=>{
      this.onTrack(event);
    };

    this.peerConnection.onnegotiationneeded = async()=>{
      try {
        await this.peerConnection.setLocalDescription(await this.peerConnection.createOffer());
        this.socket.emit("RTCNegotiation", {type:"desc", data: this.peerConnection.localDescription});
      } catch (err) {
        console.error(err);
      }
    }
  };

  async _onCandidate(data){
    await this.peerConnection.addIceCandidate(data);
  }

  async _onOffer(data){
    await this.peerConnection.setRemoteDescription(data);
    this.stream = await this.getStream();
    this.stream.getTracks().forEach((track) => this.peerConnection.addTrack(track, stream));
    await this.peerConnection.setLocalDescription(await this.peerConnection.createAnswer());
    this.socket.emit("RTCNegotiation", {type: "desc", data: pc.localDescription});
  }


  async _onAnswer(data){
    await this.peerConnection.setRemoteDescription(data);
  }

  onTrack(event){
    // this is where we handle the incoming stream
  }

  async getStream(){
    // this is where you provide the stream
  }
}

// Move these into separate files
const RTCConnector = {
  client: class extends OCRTCBase{
    constructor(config){
      super(config);
    }
  

  },
  
  mcu: class extends OCRTCBase{
    constructor(config){
      super(config);
    }


  } 
}
