const global_args = process.argv.slice(2);
require('dotenv').config();
const fs = require('fs');
const {dbPromise, addModels} = require('./db/init.js');
const secret = require('./scripts/secret.js')();
const port = process.env.PORT || 443; 
var config = require('./scripts/config.js')();
var OCCache = {
  "permissions": {}
};

//DB Ready
dbPromise.then((db)=> {
console.log('Database ✔');

//HELPERS
var expressFunctions = require('./helpers/expressfunctions.js')(OCCache);
console.log("Helper Functions ✔")

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
console.log('Session Manager ✔');

var app = express();
app.use(express.static("./views/dist"));
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
      key: fs.readFileSync('./ssl/server.key', 'utf8'),
      cert: fs.readFileSync('./ssl/server.cert', 'utf8')
    };
  }
  if("key" in options && "cert" in options && !(options.key == "" || options.cert == "")) startServer();
} catch (err) {
  console.log("Generating keypair...")
  //Generate a keypair to be used temporarily
  require("child_process").exec("npm list mkcert || npm i", {cwd: './scripts/create_cert'}, function(error, stdout, stderr) {
    (async()=>{
      options = await require('./scripts/create_cert')();
      startServer();
    })()
  });
};

//If no cert exists we do not run this code
async function startServer(){
  console.log("Starting server...")
  var server = https.createServer(options, app);
  server.listen(port, function(){
    console.log("HTTPS Server ✔")
  });
  
  // SASS MIDDLEWARE
  var sassMiddleware = require('node-sass-middleware')
  app.use( '*/css',
    sassMiddleware({
      src: './views/static/scss',
      dest: './views/static/css',
      debug: false,
    })
  );

  //AUTH
  var temp_users = {};
  var passport = require('passport');
  var authFunctions = await require('./controllers/auth/init.js')(passport, db, temp_users, OCCache);
  app.use(passport.initialize());
  app.use(passport.session());
  
  //PEER SERVER
  const { ExpressPeerServer } = require('peer');
  const peerServer = ExpressPeerServer(server, {
    ssl: options
  });
  
  app.use('/rtc', peerServer);
  
  //SIGNALLING
  var io = require('socket.io')(server, {
    pingTimeout: 0, // Removed timeout, it seemed to be causing issues
    pingInterval: 15000
  });
  
  io.use(function(socket, next){
    sessionMiddleware(socket.request, {}, next);
  });
  
  var signallingServer = require('./controllers/signalling/signalling.js')({db, io, config, port, secret, temp_users, expressFunctions, OCCache });
  
  
  // ROUTING //
  // Store routes here
  /**
   * These are the variables that can be accessed by any controllers/ extensions.
   */
  var controllerParams = {
    db,
    io,
    passport,
    temp_users,
    config,
    secret,
    expressFunctions,
    addModels,
    port,
    signallingServer,
    authFunctions,
    OCCache
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
  app.get('/coffee',(req, res)=>{res.sendStatus(418)}); // Why not?
  
  console.log("Controllers ✔")
  
  // MCU CLIENT //
  // Configure params for starting the MCU here
  var mcu_params = {port: port};
  mcu_params.isHeadless = process.argv.includes("showmcu") ? false : true;
  require('./controllers/mcu/mcu_launcher.js')(mcu_params);
};
})
