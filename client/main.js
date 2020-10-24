const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const crypto = require('crypto');
var keypair = require('keypair');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
const prefsPath = path.join(app.getPath('userData'), "./prefs.json");
var userPrefs;

try {
  userPrefs = JSON.parse(fs.readFileSync(prefsPath));
} catch(error) {
  userPrefs = JSON.parse(fs.readFileSync('./prefs_default.json'));
}

function savePrefs(){
  fs.writeFileSync(prefsPath, JSON.stringify(userPrefs));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 600,
    minWidth: 470,
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true,
      enableRemoteModule: true
    },
  });
  win.loadFile("./client/index.html");
}

app.whenReady().then(createWindow);

// Handle external links
app.on('web-contents-created', (e, contents) => {
  if (contents.getType() == 'webview') {
    contents.on('new-window', (e, loc) => {
      e.preventDefault()
      shell.openExternal(loc)
    })
  }
})

ipcMain.on("getUserPrefs", (event) => {
  event.returnValue = userPrefs;
});

ipcMain.on("setPrefs", (event, prefs) => {
  Object.assign(userPrefs, prefs);
  savePrefs();
});

ipcMain.on("addServer", (event, url) => {
  try{ 
    var url_normal = new URL(url);
  }
  catch(err){
    event.returnValue = false;
    return false;
  }
  if (!userPrefs.servers.includes(url_normal.origin)){
    userPrefs.servers.push(url_normal.origin);
    savePrefs();
    event.returnValue = true;
  } else {
    event.returnValue = false;
  };
});

const pub_key_path = path.join(app.getPath('userData'), "./identity/public.pem");
const priv_key_path = path.join(app.getPath('userData'), "./identity/private.pem");

if(!(fs.existsSync(pub_key_path) && fs.existsSync(priv_key_path))){
  var pair = keypair();

  var id_dir = path.join(app.getPath('userData'), "./identity");

  if (!fs.existsSync(id_dir)){
    fs.mkdirSync(id_dir);
  };

  fs.writeFileSync(pub_key_path, pair.public);
  fs.writeFileSync(priv_key_path, pair.private);
}

var keys = {
  public: fs.readFileSync(pub_key_path),
  private: fs.readFileSync(priv_key_path)
}

global.pub_key = keys.public.toString('utf8');

ipcMain.on("decrypt", (event, data) => {
  var buffer = Buffer.from(data.data, 'utf-8');
  var decoded = crypto.privateDecrypt(keys.private.toString('utf8'), buffer);
  event.returnValue = JSON.stringify(decoded);
});