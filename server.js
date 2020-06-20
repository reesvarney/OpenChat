var arguments = process.argv.slice(2);
const express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const conf = require("./conf.json");
var sqlite3 = require('sqlite3').verbose();

console.log("WELCOME TO OPENCHAT")


//DB

var db = new sqlite3.Database('./db/openchat.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    db.run("CREATE TABLE IF NOT EXISTS messages (message_id INTEGER PRIMARY KEY AUTOINCREMENT, message_date DATETIME DEFAULT CURRENT_TIMESTAMP, channel_id TEXT, sender_name INTEGER, message_content TEXT)");
  }
  console.log("DATABASE CONNECTED")
});

//HTTP

http.listen(conf.sig.port, function(){
  console.log("HTTP Server Running")
});


//PEER SERVER

const { PeerServer } = require('peer');
const peerServer = PeerServer({ port: 9000, path: '/rtc' });

//SIGNALLING
require('./signalling.js')(db, io, conf);


// MCU CLIENT //
// Configure params for starting the MCU here

var mcu_params = {
  isHeadless: true,
  protocol: 'http',
  port: 8080
};
if(arguments.includes("showmcu")){
  mcu_params.isHeadless = false;
};

require('./mcu_launcher.js')(mcu_params);


// ROUTING //
// Store routes here

var clientController = require('./client/client.js');
var adminController = require('./admin/admin.js');
var mcuController = require('./mcu/mcu.js');
var messageController = require('./messages/messages.js')(db);

app.get('/', function(req, res){
  res.redirect('/client')
});

app.use("/client", clientController);
app.use("/admin", adminController);
app.use("/mcu", mcuController);
app.use("/messages", messageController);