var mcu_id = null;

//WHEN CLIENT CONNECTS TO THE SIGNALLING SERVER
function startServer({db, io, config, secret, port}) {
    function validateUser(data, socket){
        if (mcu_id !== null){
            if(socket.request.session.passport !== undefined && data.name !== undefined && data.name.length >= 3){
                if(server_info.users[socket.id] === undefined) {
                    db.models.User.update({name: data.name}, {where: {id: socket.request.session.passport.user}})
                };
                return true;
            } else if (data.name !== undefined && data.name.length >= 3){
                return true;
            };
        }
        return false;
    }

    var server_info = {
        name: config.name,
        channels: [],
        users: {},
        peerPort: port
    };

    io.on("connection", function (socket) {
        var currentUser = {};

        //USER DATA/ INFORMATION
        socket.on("userinfo", function (data) {
            if (data.type == "client") {
                console.log(`User ${socket.id} Connected`);
                if (validateUser(data, socket)) {
                    currentUser.info = data;
                    socket.emit("serverInfo", server_info);
                    socket.request.session.name = data.name;
                    server_info.users[socket.id] = {
                        name: data.name,
                        channel: null,
                        status: "online",
                        id: (socket.request.session.passport !== undefined) ? socket.request.session.passport.user : null
                    };
                    io.emit('usersChange', server_info.users);
                } else {
                    socket.disconnect(true);
                };

                //INITIATE CHANNEL JOIN PROCESS
                socket.on("joinChannel", (channel) => {
                    var channel_search = server_info.channels.voice.find(({ uuid }) => uuid == channel);
                    if (channel_search != undefined) {
                        console.log(`User ${socket.id} changing to channel ${channel_search.uuid}`);
                        io.to(mcu_id).emit('setChannel', {
                            user: socket.id,
                            channel: channel
                        });
                        server_info.users[socket.id].channel = channel;
                    } else {
                        socket.emit("ocerror", "Channel is not valid");
                    };
                });

                socket.on("leaveChannel", function () {
                    console.log(`User ${socket.id} leaving channel ${server_info.users[socket.id].channel}`);
                    io.to(mcu_id).emit('closeCall', {
                        user: socket.id
                    });
                });

                socket.on("disconnect", function () {
                    console.log(`User ${socket.id} Disconnected`);
                    io.to(mcu_id).emit('closeCall', {
                        user: socket.id
                    });
                    delete server_info.users[socket.id];
                    socket.broadcast.emit('usersChange', server_info.users);
                });

            } else if (data.type == "server") {
                if (data.secret == secret) {
                    console.log("MCU CONNECTED")
                    mcu_id = socket.id;
                    socket.emit("serverInfo", {
                        "peerPort": port
                    })
                } else {
                    console.log('MCU WITH WRONG SECRET HAS TRIED TO CONNECT')
                }

                socket.on('peerReady', function (user) {
                    io.to(user).emit('canJoin', true)
                });

                socket.on('peerConnected', function (data) {
                    server_info.users[data.user].channel = data.channel;
                    io.emit('usersChange', server_info.users);
                    console.log(`User ${data.user} has successfully joined channel ${server_info.users[data.user].channel}`);
                });

                socket.on("callClosed", function (user) {
                    var temp_channel;
                    if (server_info.users[user] != undefined) {
                        temp_channel = server_info.users[user].channel;
                        server_info.users[user].channel = null;
                        io.emit('usersChange', server_info.users);
                    };
                    console.log(`User ${user} has been disconnected from ${temp_channel}`)
                });

                socket.on('disconnect', () => {
                    console.log("MCU LOST CONNECTION")
                })
            };
        });
    });
};

module.exports = startServer;