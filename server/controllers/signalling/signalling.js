var mcu_id = null;

//WHEN CLIENT CONNECTS TO THE SIGNALLING SERVER
function startServer({ db, io, config, secret, port, temp_users }) {
  var server_info = {
    name: config.name,
    channels: [],
    users: {},
    peerPort: port,
  };

  io.on("connection", function (socket) {
    var currentUser = {};
    //USER DATA/ INFORMATION
    socket.on("userInfo", function (data) {
      if (data.type == "client") {
          if (mcu_id !== null) {
            db.models.User.findOne({
              where: { id: socket.request.session.passport.user },
            }).then((user) => {
              if (user == null) {
                user = temp_users[socket.request.session.passport.user];
              } else {
                if (user.dataValues.name != data.name) {
                  user.update({ name: data.name });
                }
                user = user.dataValues;
              }
              console.log(`User ${socket.id} Connected`);
              currentUser.info = data;
              server_info.name = config.name;
              socket.emit("serverInfo", server_info);
              server_info.users[socket.id] = {
                name: user.name,
                channel: null,
                status: "online",
                id: socket.request.session.passport.user,
              };
              io.emit("usersChange", server_info.users);
            });
          } else {
            socket.disconnect(true);
          }

        socket.on('updateInfo', (data)=>{
          db.models.User.findOne({
            where: { id: socket.request.session.passport.user },
          }).then((user) => {
            if (user !== null) {
              if (user.dataValues.name != data.name) {
                user.update({ name: data.name });
              }
            } else {
              temp_users[socket.request.session.passport.user].name = data.name;
            }

            //If this is sent before the user has been properly created, create user (although it will probably just be overwritten)
            try{
              server_info.users[socket.id].name = data.name;
            } catch(err){
              server_info.users[socket.id] = {name: data.name}
            }
            io.emit("usersChange", server_info.users);
          });
        });

        //INITIATE CHANNEL JOIN PROCESS
        socket.on("joinChannel", (channel) => {
          db.models.Channel.findOne({
            where: {
              id: channel,
            },
          }).then((result) => {
            if (result !== undefined) {
              console.log(
                `User ${socket.id} changing to channel ${result.dataValues.id}`
              );
              io.to(mcu_id).emit("setChannel", {
                user: socket.id,
                channel: channel,
              });
              server_info.users[socket.id].channel = channel;
            } else {
              socket.emit("ocerror", "Channel is not valid");
            }
          });
        });

        socket.on("leaveChannel", function () {
          console.log(
            `User ${socket.id} leaving channel ${
              server_info.users[socket.id].channel
            }`
          );
          io.to(mcu_id).emit("closeCall", {
            user: socket.id,
          });
        });

        socket.on("disconnect", function () {
          console.log(`User ${socket.id} Disconnected`);
          io.to(mcu_id).emit("closeCall", {
            user: socket.id,
          });
          delete server_info.users[socket.id];
          socket.broadcast.emit("usersChange", server_info.users);
        });
      } else if (data.type == "server") {
        if (data.secret == secret) {
          console.log("MCU Client ✔");
          mcu_id = socket.id;
          socket.emit("serverInfo", {
            peerPort: port,
          });
        } else {
          console.log("MCU WITH WRONG SECRET HAS TRIED TO CONNECT");
        }

        socket.on("peerReady", function (user) {
          io.to(user).emit("canJoin", true);
        });

        socket.on("peerConnected", function (data) {
          server_info.users[data.user].channel = data.channel;
          io.emit("usersChange", server_info.users);
          console.log(
            `User ${data.user} has successfully joined channel ${
              server_info.users[data.user].channel
            }`
          );
        });

        socket.on("callClosed", function (user) {
          var temp_channel;
          if (server_info.users[user] != undefined) {
            temp_channel = server_info.users[user].channel;
            server_info.users[user].channel = null;
            io.emit("usersChange", server_info.users);
          }
          console.log(
            `User ${user} has been disconnected from ${temp_channel}`
          );
        });

        socket.on("disconnect", () => {
          for(user of Object.values(server_info.users)){
            user.channel = null;
          }
          io.emit("usersChange", server_info.users);
          console.log("MCU LOST CONNECTION");
        });
      }
    });
  });
  console.log("Signalling ✔");
}

module.exports = startServer;
