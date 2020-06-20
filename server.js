var arguments = process.argv.slice(2);
const fs = require('fs')
const conf = require("./conf.json");

console.log("WELCOME TO OPENCHAT")


//DB

var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./db/openchat.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    db.run("CREATE TABLE IF NOT EXISTS messages (message_id INTEGER PRIMARY KEY AUTOINCREMENT, message_date DATETIME DEFAULT CURRENT_TIMESTAMP, channel_id TEXT, sender_name INTEGER, message_content TEXT)");
  }
  console.log("DATABASE CONNECTED")
});

//HTTP

var https = require('https');
const express = require('express');
var app = express();

var key  = fs.readFileSync('ssl/server.key', 'utf8');
var cert = fs.readFileSync('ssl/server.cert', 'utf8');

var options = {
  key: key,
  cert: cert
};

var server = https.createServer(options, app);

server.listen(conf.sig.port, function(){
  console.log("HTTPS Server Running")
});


//PEER SERVER

const { PeerServer } = require('peer');
const peerServer = PeerServer({ 
  port: 9000, 
  path: '/rtc',
  ssl: {
    key: key,
    cert: cert
  }
});


//SIGNALLING

var io = require('socket.io')(server);
require('./signalling.js')(db, io, conf);


// MCU CLIENT //
// Configure params for starting the MCU here

var mcu_params = {
  isHeadless: true,
  protocol: 'https',
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