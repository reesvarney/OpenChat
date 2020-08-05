var arguments = process.argv.slice(2);
const fs = require('fs')
const conf = require("./conf.json");
var ffmpegLoc = require('ffmpeg-static');
const { exec } = require("child_process");
process.env.FFMPEG_PATH = ffmpegLoc;
conf.port =  process.env.PORT || conf.port;
console.log("WELCOME TO OPENCHAT")


//DB

var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./db/openchat.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    db.run("CREATE TABLE IF NOT EXISTS messages (message_id INTEGER PRIMARY KEY AUTOINCREMENT, message_date DATETIME DEFAULT CURRENT_TIMESTAMP, channel_id TEXT, sender_name TEXT, message_content TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, salt TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS iplogs (ip TEXT, name TEXT)");
  }
  console.log("DATABASE CONNECTED")
});

//HTTP

var https = require('https');
const express = require('express');
const helmet = require('helmet');
var bodyParser = require('body-parser');

var app = express();
app.disable('view cache');
app.set('view engine', 'ejs');
app.use(helmet.frameguard());
app.use(helmet.frameguard({ action: undefined }))
app.use(bodyParser.urlencoded({ extended: false }));

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

server.listen(conf.port, function(){
  console.log("HTTPS Server Running")
});


// SOCKET IO

var io = require('socket.io')(server);


//PEER SERVER

const { ExpressPeerServer } = require('peer');
const { ffmpeg } = require('ffmpeg-stream/lib');
const peerServer = ExpressPeerServer(server, {
  ssl: options
});

app.use('/rtc', peerServer);


// EXTENSIONS //
// This is the controller that allows extensions to interact with openchat and provides functions to them

// Add to this object as more variables/ data are accessible to extensions, so they can maintain compatibility
var extension_data = {
  server_config: conf,
  io: io
}

var extensionController = new (require('./controllers/extensions/extensionController.js'))(extension_data);

//SIGNALLING

require('./controllers/signalling/signalling.js')(db, io, conf, extensionController);


// MCU CLIENT //
// Configure params for starting the MCU here

var mcu_params = {
  isHeadless: true
};

if(arguments.includes("showmcu")){
  mcu_params.isHeadless = false;
};

require('./controllers/mcu/mcu_launcher.js')(mcu_params);


// ROUTING //
// Store routes here

var clientController = require('./controllers/client/client.js')(conf);
var adminController = require('./controllers/admin/admin.js')(db, conf, fs, extensionController);
var mcuController = require('./controllers/mcu/mcu.js')(conf.secret);
var messageController = require('./controllers/messages/messages.js')(db);

app.get('/', function(req, res){
  res.redirect('/client')
});

app.use("/client", clientController);
app.use("/admin", adminController);
app.use("/mcu", mcuController);
app.use("/messages", messageController);
app.use("/extensions", extensionController.router);

// LOAD EXTENSIONS
conf.extensions.forEach(function(directory){
  if (fs.existsSync(`./extensions/${directory}/node_modules/`)) {
    //dependencies exist
    new extensionController.extension(require(`./extensions/${directory}/package.json`));
  } else {
    //install dependencies
    exec("npm i", {cwd: `./extensions/${directory}/`}, function(error, stdout, stderr) {
      console.log(stdout);
      new extensionController.extension(require(`./extensions/${directory}/package.json`));
    })
  }
})