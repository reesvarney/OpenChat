const global_args = process.argv.slice(2);
const fs = require('fs')
const db = require('./db/init.js');
var config = require('./config.json')
config.port = process.env.PORT || 443; 

//HTTP SERVER
var https = require('https');
const express = require('express');
const helmet = require('helmet');
var app = express();
app.disable('view cache');
app.set('view engine', 'ejs');

var options = {};

try {
  if (process.env.sslkey && process.env.sslcert){
    options = {
      key: fs.readFileSync(process.env.sslkey, 'utf8'),
      cert: fs.readFileSync(process.env.sslcert, 'utf8'),
    }
  } else {
    options = {
      key: fs.readFileSync('ssl/server.key', 'utf8'),
      cert: fs.readFileSync('ssl/server.cert', 'utf8')
    };
  }
} catch (err) {
  console.log("\n \n \n \n \n \n KEY/CERT NOT FOUND - PLEASE RUN SETUP OR CREATESSL \n \n \n \n \n \n")
};

var server = https.createServer(options, app);
server.listen(config.port, function(){
  console.log("HTTPS Server Running")
});


//PEER SERVER
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  ssl: options
});

app.use('/rtc', peerServer);

//SIGNALLING
var io = require('socket.io')(server);
require('./controllers/signalling/signalling.js')(db, io, config);

// MCU CLIENT //
// Configure params for starting the MCU here
var mcu_params = {};
mcu_params.isHeadless = arguments.includes("showmcu") ? false : true;
require('./controllers/mcu/mcu_launcher.js')(mcu_params);

// ROUTING //
// Store routes here
var clientController = require('./controllers/client/client.js')(config);
var adminController = require('./controllers/admin/admin.js')(db, config, fs);
var mcuController = require('./controllers/mcu/mcu.js')(config.secret);
var messageController = require('./controllers/messages/messages.js')(db);

app.get('/', function(req, res){
  res.redirect('/client')
});

app.use("/client", clientController);
app.use("/admin", adminController);
app.use("/messages", messageController);