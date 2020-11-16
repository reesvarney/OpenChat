const { ipcRenderer, remote } = require("electron");
const { URL } = require('url');
var userPrefs = ipcRenderer.sendSync("getUserPrefs");
const Handlebars = require("handlebars");
const $ = require("jquery");
const liveVar = require("./js/livevar.js");
var templates = {}
var servers = {};

class server {
  constructor(url){
    this.url = new URL(url);
    this.wv = undefined;
    this.socket = {
      listeners: {},
      emit: (e, d={})=>{
        if(this.connected.value){
          this.wv[0].send("socket_event", {event: e, data: d})
        }
      },
      on: (e, f)=>{
        if(this.socket.listeners[e] === undefined){this.socket.listeners[e] = []};
        this.socket.listeners[e].push(f);
      }
    };

    this.connected = new liveVar(false);
    this.connected.onChange((conn)=>{this._onConnection(conn)});
    
    this.thumbnail = {el: $(templates.serverIcon({url: this.url.href})).appendTo("#server_list")};
    this.thumbnail.image = $(this.thumbnail.el).find('img');
    this.thumbnail.no_connection = $(this.thumbnail.el).find('i')

    servers[this.url.href] = this;

    this.authenticate();
    this._socketListeners();
  }

  _onConnection(conn){
    if(conn){
      this.addWebView();
      this.thumbnail.image[0].style.display = "block";
      this.thumbnail.no_connection[0].style.display = "none";
    } else {
      this.removeWebView();
      this.thumbnail.image[0].style.display = "none";
      this.thumbnail.no_connection[0].style.display = "block";
      this.thumbnail.el[0].title = `${this.url.href} - No Connection` 
    };
  };

  _socketListeners(){
    this.socket.on("disconnect", ()=>{
      this.connected.value = false;
    }) 

    this.socket.on("serverInfo", (data)=>{
      this.thumbnail.el[0].title = `${data.name} (${this.url.href})`;
    })

    this.socket.on("newMessage", (d)=>{
      console.log(this.url.href, d)  
    })
  }

  authenticate(){
    $.ajax({
      async: true,
      type: 'GET',
      url: `${this.url.origin}/auth/pubkey`,
      data: { "public_key": remote.getGlobal("pub_key")}, 
      error: ()=>{
        this.connected.value = false;
      },
      success: ( result ) => {
        if (result.encoded_data !== undefined){
          var decrypted = ipcRenderer.sendSync("decrypt", result.encoded_data);
          $.ajax({
            async: true,
            type: 'POST',
            url: `${this.url.origin}/auth/pubkey`,
            data: {decrypted, name: userPrefs.displayName},
            success: ((r) => {
              this.connected.value = true;
            })
          });
        } else {
          //probably already connected - should probably add extra data to the response to be sure, will update info in case it has changed between being connected
          this.connected.value = true;
        }
      }
    });
  };

  addWebView(){
    if(this.wv !== undefined){
      //remove existing webview if connection has been reset
      this.wv.remove();
    }
    this.wv = $(document.createElement("webview")).appendTo('body');

    Object.assign(this.wv[0], {
      style: {
        height: "100%",
        width: "100%",
      },
      src: this.url.href,
      preload: "./js/bridge.js",
      autosize: "on",
      minHeight: "100%"
    });

    this.wv[0].addEventListener('ipc-message', (e)=>{
      var d = e.args[0]
      switch( e.channel){
        case "socket_event":
          if(this.socket.listeners[d.event] !== undefined){
            this.socket.listeners[d.event].forEach((f)=>{
              f(d.data)
            });
          }
          break;
        case "client_event":
          for(const [url, server] of Object.entries(servers)){
            server.wv[0].send("client_event", d)
          }
          break;
        default:
          console.log("Unhandled IPC Message:", e)
      }
    });

    this.thumbnail.el.on("click", ()=>{
      if(this.connected.value){
        this.showWebView();
      } else {
        this.authenticate();
      }
    });
  };

  removeWebView(){
    this.wv.remove();
  }

  showWebView(){
    var active = $("webview.active");
    if(active.length > 0 && active[0].src !== this.url.href){
      console.log(active[0].src, this.url.href)
      active[0].style.display = "none";
      active.removeClass("active");
    }
    this.wv.addClass("active");
    this.wv[0].shadowRoot.childNodes[1].style.height = "100%";
  }
}

var overlay = {
  show: function (div) {
    $("#overlay").show();
    $(`#overlay>*`).hide();
    $(`#overlay>#${div}`).show();
  },
  hide: function () {
    $("#overlay").hide();
  },
};

$(window).on('load', function (e) {
  templates.serverIcon = Handlebars.compile($("#server-template").html());
  var darkMode = {
    true: "30%",
    false: "100%"
  }

  function setDark(val){
    document.documentElement.style.setProperty('--bg-l', darkMode[val]);
    $("body").toggleClass("dark", val);
  }

  setDark(userPrefs.darkMode);
  $("#overlay").on("click", function (e) {
    if (e.target !== this) return;
    overlay.hide();
  });

  $("#modal_close").on( 'click', function () {
    overlay.hide();
  });

  $("#add_server").on( 'click', function () {
    overlay.show("connect");
  });

  $("#settings_button").on( "click", function() {
    overlay.show("settings");
  });

  $("#connect_form").on( 'submit', function (e) {
    e.preventDefault();
    var url = 'https://' + $("#connect_destination").val();
    if(ipcRenderer.sendSync("addServer", url)){
      new server(url);
      overlay.hide();
    }
  });

  $("#user_form input[type='text']").each(function(){
    $(this).val(userPrefs[$(this).attr('name')]);
  });

  $("#user_form input[type='checkbox']").each(function(){
    $(this)[0].checked = userPrefs[$ (this).attr('id')];
  });

  $("#user_form").on( 'submit', function (e) {
    e.preventDefault();
    $(this).serializeArray().forEach((pref)=>{
      if(name.length !== 0){userPrefs[pref.name] = pref.value;}
    });
    $("#user_form .device-select select").each((i, el)=>{
      userPrefs[el.id] = $(el).val();
    });
    $("#user_form input[type='checkbox']").each((i, el)=>{
      userPrefs[el.id] = $(el)[0].checked;
    })
    ipcRenderer.send("setPrefs", userPrefs);
    Object.values(servers).forEach((server) => {
      server.socket.emit("updateInfo", {
        name: userPrefs.displayName
      });
      server.wv[0].send("client_event", {event: "setDark", data: userPrefs.darkMode})
    });
    setDark(userPrefs.darkMode)
    overlay.hide();
  });
  
  userPrefs.servers.forEach(function(url){
    new server(url);
  });

  navigator.mediaDevices.enumerateDevices().then((devices)=>{
    var selected = {}
    devices.forEach((device)=>{
      var option = document.createElement('option');
      option.value = device.label;
      option.text = device.label;
      switch(device.kind){
        case "audiooutput":
          if (option.value == userPrefs.audioOutput){
            selected.output = option.value;
          }
          $(option).appendTo(`#user_form #audioOutput`)
          break;
        case "audioinput":
          if (option.value == userPrefs.audioSource){
            selected.source = option.value;
          }
          $(option).appendTo(`#user_form #audioSource`)
          break;
        default:
          break;
      }
    })
    if("output" in selected){$('#user_form #audioOutput').val(selected.output)};
    if("source" in selected){$('#user_form #audioSource').val(selected.source)};
  });
});