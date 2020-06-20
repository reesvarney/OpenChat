var arguments = process.argv.slice(2);
const express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const conf = require("./conf.json");

console.log("WELCOME TO OPENCHAT")

//HTTP

http.listen(conf.sig.port, function(){
  console.log("HTTP Server Running")
});


//PEER SERVER

const { PeerServer } = require('peer');
const peerServer = PeerServer({ port: 9000, path: '/rtc' });

//SIGNALLING
require('./signalling.js')(io, conf);


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
var ogpController = require('./ogp/ogp.js');

app.get('/', function(req, res){
  res.redirect('/client')
});

app.use("/client", clientController);
app.use("/admin", adminController);
app.use("/mcu", mcuController);
app.use("/ogp", ogpController);