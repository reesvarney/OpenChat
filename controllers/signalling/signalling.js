var colors = require('colors');
var sqlite3 = require('sqlite3').verbose();

var mcu_id = null;

//WHEN CLIENT CONNECTS TO THE SIGNALLING SERVER
function startServer(db, io, conf) {
    var server_info = {
        name: conf.server.name,
        users: {},
        peerPort: conf.port,
        channels: conf.server.channels
    };

    function logIP(ip, name){
        db.run(`INSERT INTO iplogs (ip, name) SELECT $ip, $name WHERE NOT EXISTS (SELECT * FROM iplogs WHERE ip=$ip AND name=$name)`, {
            "$ip": ip,
            "$name": name,
        }, function (err, result) {
            if (err) throw err;
        });
    }

    const server_secret = conf.secret;

    io.on("connection", function (socket) {
        var currentUser = {};
        var uservalid;

        //WHEN USER SENDS THEIR INFORMATION
        socket.on("userinfo", function (data) {
            if (data.type == "client") {
                console.log(`User ${socket.id} connected from IP ${socket.request.connection.remoteAddress}`.brightBlue);

                if (data.name.length < 32 && data.name.length > 2 && !(conf.blacklist.includes(socket.request.connection.remoteAddress))) {
                    uservalid = true;
                } else {
                    socket.emit("ocerror", "Name too long");
                    socket.disconnect(true);
                }

                if (mcu_id !== null) {
                    if (uservalid) {
                        logIP(socket.request.connection.remoteAddress, data.name);
                        currentUser.info = data;
                        socket.emit("changeState", 1);
                        socket.emit("serverInfo", server_info);
                        server_info.users[socket.id] = {
                            name: data.name,
                            channel: null
                        };
                        io.emit('usersChange', server_info.users);
                    } else {
                        socket.emit("ocerror", "user details are not valid");
                        socket.disconnect(true);
                    }
                } else {
                    socket.emit("ocerror", "MCU has not connected yet");
                    socket.disconnect(true);
                }


            } else if (data.type == "server") {
                if (data.secret == server_secret) {
                    console.log("MCU CONNECTED");
                    console.log("READY TO RECEIVE CALLS")
                    mcu_id = socket.id;
                    socket.emit("serverInfo", {
                        "peerPort": conf.port
                    })
                } else {
                    console.log('MCU WITH WRONG SECRET HAS TRIED TO CONNECT'.bgRed)
                }
            }

        })

        //WHEN USER SENDS A MESSAGE
        socket.on("sendMessage", function (message) {
            var sender = server_info.users[socket.id].name;
            var channel = message.channel;
            var content = message.content;
            var channel_search = server_info.channels.text.find(({
                uuid
            }) => uuid == channel);
            if (channel_search != undefined) {
                if (content != "") {
                    if (content.length <= 2000) {
                        console.log(`${socket.id} SENT MESSAGE TO CHANNEL ${message.channel} : ${message.content}`.magenta);
                        db.run(`INSERT INTO messages (message_content, sender_name, channel_id) VALUES ( $content, $sender, $channel)`, {
                            "$content": message.content,
                            "$sender": sender,
                            "$channel": channel
                        }, function (err, result) {
                            if (err) throw err;
                            io.emit("newMessage", {
                                message_content: message.content,
                                sender_name: sender,
                                channel_id: channel,
                                message_id: this.lastID
                            });
                        });

                    };
                } else {
                    socket.emit("ocerror", "Cannot send empty message")
                }

            } else {
                socket.emit("ocerror", "Invalid Channel");
            }
        });

        //WHEN USER TRIES TO JOIN A CHANNEL
        socket.on("joinChannel", function (channel) {
            var channel_search = server_info.channels.voice.find(({
                uuid
            }) => uuid == channel);
            if (channel_search != undefined) {
                console.log(`User ${socket.id} changing to channel ${channel_search.uuid}`.cyan);
                io.to(mcu_id).emit('setChannel', {
                    user: socket.id,
                    channel: channel
                });
                server_info.users[socket.id].channel = channel;
            } else {
                socket.emit("ocerror", "Channel is not valid");
            };
        });

        //WHEN MCU IS READY FOR THE USER TO JOIN, CHANNEL HAS BEEN PREPARED
        socket.on('peerReady', function (user) {
            io.to(user).emit('canJoin', true)
        });

        //WHEN THE MCU HAS SUCCESSFULLY ESTABLISHED THE CONNECTION, THE CONNECTION PROCESS HAS ENDED
        socket.on('peerConnected', function (data) {
            server_info.users[data.user].channel = data.channel;
            io.emit('usersChange', server_info.users);
            console.log(`User ${data.user} has successfully joined channel ${server_info.users[data.user].channel}`.green);
        });

        //WHEN USER REQUESTS TO LEAVE THEIR CURRENT CHANNEL
        socket.on("leaveChannel", function () {
            console.log(`User ${socket.id} leaving channel ${server_info.users[socket.id].channel}`.yellow);
            io.to(mcu_id).emit('closeCall', {
                user: socket.id
            });
        });

        //WHEN THE MCU HAS SUCCESSFULLY DISCONNECTED THE USER FROM THE CALL
        socket.on("callClosed", function (user) {
            var temp_channel;
            if (server_info.users[user] != undefined) {
                temp_channel = server_info.users[user].channel;
                server_info.users[user].channel = null;
                io.emit('usersChange', server_info.users);
            };
            console.log(`User ${user} has been disconnected from ${temp_channel}`.yellow)
        });

        //WHEN USER HAS DISCONNECTED FROM THE SOCKET
        socket.on("disconnect", function () {
            console.log(`User ${socket.id} Disconnected`.brightRed);
            io.to(mcu_id).emit('closeCall', {
                user: socket.id
            });
            delete server_info.users[socket.id];
            socket.broadcast.emit('usersChange', server_info.users);
        });
    });
};

module.exports = startServer;