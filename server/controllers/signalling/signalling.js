function startServer({ db, io, config, secret, port, temp_users, expressFunctions }) {

    // constructor(socket, data){
    //   // "Public" properties
    //   this.id = socket.request.session.passport.user;
    //   this.socket = socket;
    //   this.name = null;
    //   this.channel = null;
    //   this.data = {};
    //   this.temp = false;

    //   // "Private" properties
    //   this._status = "online"

    //   // Getters/ setters
    //   this.publicData;
    //   this.status;

    //   // Get user data
    //   (async()=>{
    //     let db_user = await db.models.User.findOne({where: { id: this.id }});
    //     if (db_user !== null || socket.request.session.passport.user in temp_users) {
    //       // console.log(`User ${socket.id} Connected`);
    //       if(db_user !== null){
    //         if (db_user.name !== data.name && ![null, undefined].includes(data.name)) db_user.update({ name: data.name });
    //         this.temp = false;
    //       } else {
    //         db_user = temp_users[socket.request.session.passport.user];
    //         this.temp = true;
    //       };
    //       this.name = db_user.name;
    //       this.data = db_user;
    //       this.initSockets();
    //       server.sendUpdate();
    //     } else {
    //       this.socket.disconnect(true);
    //       server.deleteUser(this.id);
    //     };
    //   })();
    // };

  // User Object
  class user{
    constructor(id, {update=false}={}){
        this.id = id;
        this.socket = null;
        this.channel = null;
        this.request = null;

        // Give blank values before getting from db
        this.name = null;
        this.data = null;
        this.temp = null;
        this._status = "offline";
        this.expires = null;
        this.publicData;
        this.status;
        (async()=>{
          let db_user = await db.models.User.findByPk(id);
          if (db_user !== null || id in temp_users) {
            if(db_user !== null){
              this.temp = false;
            } else {
              db_user = temp_users[id];
              this.temp = true;
            };
            this.name = db_user.name;
            this.data = db_user;
            if(update){
              server.sendUpdate();
            };
          } else {
            this.socket.disconnect(true);
            server.deleteUser(id);
          };
        })();
    };

    get publicData(){
      return {
        name: this.name,
        channel: this.channel,
        status: this.status,
        temp: this.temp,
        socketID: (this.socket !== null) ? this.socket.id : null
      }
    };

    set status(status){
      status = status.toLowerCase();
      switch (status){
        case "online":
          this._status = "online";
          this.channel = null;
          break;
        case "offline":
          // console.log(`User ${this.id} Disconnected`);
          this._status = "offline";
          this.channel = null;
          this.socket = null;
          break;
        default:
          console.log("Error: Invalid status");
      }
      if(this.channel !== null) this.leaveChannel();
      server.sendUpdate();
    };

    get status(){
      return this._status;
    }

    initSockets(){
      this.socket.emit("serverInfo", server.publicData);

      this.socket.on('updateInfo', (data)=>{
        db.models.User.findOne({
          where: { id: this.id },
        }).then((db_user) => {
          if (db_user !== null) {
            // todo: change the length check to just use validation provided by sequelize
            if (db_user.dataValues.name !== data.name && data.name.length <= 32) {
              db_user.update({ name: data.name });
            }
          } else {
            temp_users[this.id].name = data.name;
          }
          this.name = data.name;
          server.sendUpdate("users");
        });
      });

      //INITIATE CHANNEL JOIN PROCESS
      this.socket.on("joinChannel", (id) => {
        this.joinChannel(id);
      });

      this.socket.on("leaveChannel", ()=>{
        this.leaveChannel();
      });

      this.socket.on("disconnect", (reason)=>{
        // console.log("Disconnect:", reason)
        // This might not work if the user needs to be connected in order to update or might be read only from the socket object
        if(this.temp === true){
          let time = (((((config.anonTimeout.days || 0) * 24) + (config.anonTimeout.hours || 0)) * 60) + (config.anonTimeout.minutes || 0)) * 60000;
          server.awaitingRemoval[this.id] = new Date().getTime() + time;
        }
        this.status = "offline";
      });
    }

    connect(socket, data){
      this.socket = socket;
      this.request = socket.request;
      if(this.name !== data.name && ![null, undefined].includes(data.name)) {
        (this.temp === false) ? this.data.update({ name: data.name }) : this.data.name = data.name;
        this.name = data.name;
      };
      if(this.temp === true){
        if(this.id in server.awaitingRemoval){
          delete server.awaitingRemoval[this.id];
        }
      }
      this.initSockets();
      this.status = "online";
    }

    async joinChannel(id){
      let channel = await db.models.Channel.findOne({where: {id}});
      if(channel !== undefined && expressFunctions.hasPermission("join",{id: this.id, scope: "channels", subscope: id})) {
        server.mcu.emit("setChannel", {
          user: this.id,
          channel: channel.id
        });
        this.channel = channel;
      } else {
        this.socket.emit("ocerror", "Channel is not valid");
      }
    }

    leaveChannel(){
      server.mcu.emit("closeCall", {user: this.id});
    };

  };

  class mcu{
    constructor(){
      this.status = "offline";
      this.id = null;
      this.socket = null;
    }

    initSockets(){
      this.socket.emit("serverInfo", server.publicData);

      this.socket.on("peerReady", (id)=>{
        server.users[id].socket.emit("canJoin", true);
      });

      this.socket.on("peerConnected", (data)=>{
        server.users[data.user].channel = data.channel;
        server.sendUpdate();
        // console.log(`User ${data.user} has successfully joined channel ${server.users[data.user].channel}`);
      });

      this.socket.on("mcu_error", (data)=>{
        console.log(data)
      })

      this.socket.on("callClosed", (userId)=>{
        if (server.users[userId] !== undefined) {
          // console.log(`User ${user} has been disconnected from ${server.users[user].channel}`);
          server.users[userId].channel = null;
          server.sendUpdate('users');
        };
      });

      this.socket.on("disconnect", () => {
        for(const temp_user of Object.values(server.users)){
          temp_user.channel = null;
        }
        this.status = "offline";
        server.sendUpdate(['users']);
        console.log("MCU LOST CONNECTION");
        this.socket.disconnect(); //Just to make sure its completely disconnected
      });
    }

    connect(socket){
      this.socket = socket;
      this.id = socket.id;
      this.status = "online";
      this.initSockets();
    }

    emit(type, data){
      if(this.socket !== null){
        this.socket.emit(type, data)
      }
    }
  }

  // Server Object
  let server = new class{
    constructor(){
      this.name = config.name;
      this.users = {};
      this.awaitingRemoval = {};
      this.mcu = new mcu();
      this.peerPort = port;
      this.publicData;
      this.updateChannels();
      this.getUsers();
      this.io = io;
      setInterval((function(){this.flushTemp()}).bind(this), 60 * 1000);
    };

    get publicData(){
      let data = {
        name: this.name,
        users: {},
        channels: this.channels
      };
      for (const [id, temp_user] of Object.entries(this.users)) {
        data.users[id] = temp_user.publicData;
      };

      return data
    };

    async updateChannels(){
      let channels = {};
      let result = await db.models.Channel.aggregate("type", "DISTINCT", { plain: false });

      for(const typeObj of result){
        let type = typeObj.DISTINCT;
        channels[type] = [];

        let typeChannels = await db.models.Channel.findAll({
          where: {
            type: type,
          },
          order: [
            ['position', 'ASC']
          ]
        });

        for(const channel of typeChannels){
          channels[type].push(channel);
        };
      };

      this.channels = channels;

      this.sendUpdate("channels");
    }

    async updateRoles(){
      io.emit("viewUpdate", {type: "roles", data: null});
    }

    async updateInteracts(id){
      io.emit("viewUpdate", {type: "interact", data: id});
    }

    async getUsers(){
      let allUsers = await db.models.User.findAll();
      for(const new_user of allUsers){
        this.addUser(new_user.id, {update: false});
      };
      this.sendUpdate();
    }

    addUser(id, opts={}){
      this.users[id] = new user(id, opts);
    };

    async flushTemp(){
      for(const [k,v] of Object.entries(this.awaitingRemoval)){
        if(v < new Date().getTime()){
          this.users[k].request.session.destroy();
          this.deleteUser(k);
        }
      }
    }

    connectUser(socket, data){
      this.users[socket.request.session.passport.user].connect(socket, data);
      this.sendUpdate();
    }

    deleteUser(id){
      delete this.users[id];
      if(id in this.awaitingRemoval){
        delete this.awaitingRemoval[id];
      };
      this.sendUpdate();
    }

    sendUpdate(props){
      let publicData = this.publicData;
      let data = {};

      if(props === undefined || props === "all"){
        data.updateData = Object.keys(publicData);
      } else if(typeof props === "string"){
        data.updateData = [props];
      } else if(Array.isArray(props)){
        data.updateData = props;
      }

      for(const prop of data.updateData){
        data[prop] = publicData[prop]
      };

      io.emit("serverUpdate", data);
    }
  };

  // Initialize user objects
  io.on("connection",(socket)=>{
    socket.on("clientInfo", (data)=>{
      if (data.type == "client") {
          if (server.mcu.status !== "offline") {
            // MCU is working, allow connections
            if(server.users[socket.request.session.passport.user] === undefined){
              // Add a new user
              server.addUser(socket.request.session.passport.user, {update: true});
            }
            // Set existing user to be online
            if(server.users[socket.request.session.passport.user].status === "online"){
              // if user already connected
              // should change this to support multiple connections per user
              server.users[socket.request.session.passport.user].socket.disconnect(true);
              server.users[socket.request.session.passport.user].status = "offline";
              server.users[socket.request.session.passport.user].connect(socket, data);
            } else {
              server.users[socket.request.session.passport.user].connect(socket, data);
            }
          } else {
            // Disconnect as MCU is down
            socket.disconnect(true);
          }
      } else if (data.type == "mcu") {
        if (data.secret == secret) {
          // MCU has connected with the correct secret token
          console.log("MCU Client ✔");
          console.log("Ready for clients");
          server.mcu.connect(socket);
        } else {
          // There has been an error or somebody has connected trying to impersonate the MCU
          console.log("MCU WITH WRONG SECRET HAS TRIED TO CONNECT");
        }
      } else {
        console.log('Unknown client type');
      }
    });
  });

  console.log("Signalling ✔");

  return server;
}

module.exports = startServer;