const global_args = process.argv.slice(2);
const fs = require('fs')
const dbProm = require('./db/init.js');
const secret = fs.readFileSync('./secret.txt', 'utf8');
const port = process.env.PORT || 443; 
var config = require('./config.json');
dbProm.then((db)=> {
//HTTP SERVER
var https = require('https');
const express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')();
var session = require('express-session');
var SequelizeStore = require("connect-session-sequelize")(session.Store);

var sessionStore = new SequelizeStore({
  db: db,
  checkExpirationInterval: 5 * 60 * 1000, 
  expiration: 24 * 60 * 60 * 1000
});

var sessionMiddleware = session({
  name: 'middleware',
  secure: true,
  secret: secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true },
});

sessionStore.sync();

var app = express();


app.disable('view cache');
app.set('view engine', 'ejs');
app.use(sessionMiddleware);
app.use(cookieParser);
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
server.listen(port, function(){
  console.log("HTTPS Server ✔")
});

//AUTH
var temp_users = {};
var passport = require('passport');
var initializePassport = require('./controllers/auth/init.js');
initializePassport(passport, db, temp_users);
app.use(passport.initialize());
app.use(passport.session());

//PEER SERVER
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  ssl: options
});

app.use('/rtc', peerServer);

//SIGNALLING
var io = require('socket.io')(server);

io.use(function(socket, next){
  sessionMiddleware(socket.request, {}, next);
});

require('./controllers/signalling/signalling.js')({
  db: db,
  io: io,
  config: config,
  port: port,
  secret: secret,
  temp_users: temp_users
});


// ROUTING //
// Store routes here
var controllerParams = {
  db: db, 
  passport: passport, 
  config: config,
  secret: secret
};

var clientController = require('./controllers/client/client.js')(controllerParams);
var mcuController = require('./controllers/mcu/mcu.js')(controllerParams);
var messageController = require('./controllers/messages/messages.js')(controllerParams);
var authController = require('./controllers/auth/auth.js')(controllerParams);
var adminController = require('./controllers/admin/admin.js')(controllerParams);

app.use('/auth', authController);
app.use('/admin', adminController);
app.use("/", clientController);
app.use("/messages", messageController);
app.use('/mcu', mcuController);

console.log("Controllers ✔")

// MCU CLIENT //
// Configure params for starting the MCU here
var mcu_params = {};
mcu_params.isHeadless = process.argv.includes("showmcu") ? false : true;
  require('./controllers/mcu/mcu_launcher.js')(mcu_params);
})