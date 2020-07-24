![license](https://img.shields.io/github/license/reesvarney/OpenChat)

<p align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="https://raw.githubusercontent.com/reesvarney/OpenChat/assets/logo.png" alt="Logo" width="auto" height="80">
  </a>

  <h3 align="center">OpenChat</h3>

  <p align="center">
    A free, open-source communications platform. Built to be modified.
    <br />
    <a href="https://openchatdemo.tech">View the Demo</a>
    <br />
    <a> Demo may not be available at this time (for cost saving), please contact me <a href="mailto:reesvarney02@gmail.com?subject=openchat%20demo">here</a> if you require it.</a>
  </p>
</p>

## Overview
This is a project that seeks to provide a communication service akin to discord or teamspeak completely built in the javascript stack to increase accessibility and ease of use.

This project is currently in its infancy and is functional, however can have issues with stability, especially in terms of signalling. The current signalling system utilises peer.js and socket.io, however in the future should move to a fully socket.io based negotiation system with native WebRTC implementation.

At the core of OpenChat is its MCU (Multipoint Conferencing Unit) which allows many users to connect without having to establish a connection between each and every peer. It currently utilises a headless browser (using puppeteer) which acts as a proxy-client to receive multiple WebRTC streams and create a single output for each user. Extensive testing for performance and stability has not yet been carried out but the system seems to handle several users quite well without requiring too much power from the CPU (although may be RAM intensive with the natural drawback from using a chromium based headless browser).

![User Interface](https://raw.githubusercontent.com/reesvarney/OpenChat/assets/2020-06-28-01-44-localhost.png)

## Install/ Usage
Support for deployment methods such as heroku will be added in the future, however the current method of storing the config in a .json file won't work in a non-persistant environment.

### Local
1. Install the latest version of Node/ NPM and openssl (if you don't already have SSL keys) [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2. Download and unzip the latest release from [https://github.com/reesvarney/OpenChat/releases](https://github.com/reesvarney/OpenChat/releases)
3. In the unzipped folder, run the setup script, which will install prequisite packages, create self-signed SSH keys, add an admin user and configure the server's secret.
```sh
npm run setup
``` 
4. Port forward the port `443` in your router software to allow users to connect from outside the local network ([guide](https://www.noip.com/support/knowledgebase/general-port-forwarding-guide/))
5. Start the server
```sh
npm start
```
6. Open `localhost/admin` in your browser (replace with your IP if accessing from another device) and log in with the previously configured admin credentials. Here you will be able to change the server name and manage the different channels (clients will need to refresh to see these changes).
7. To access the client go to your IP which should automatically be forwarded to `/client`.

If you already have a SSL key and certificate, you can place them in the `/ssl` directory, naming them `server.key` and `server.cert` respectively.

### Using Docker
The current docker install is slightly 'hacky' however to maintain quick development, I do not want to have to make too many severe changes to the core functionality to facilitate it.

#### Premade Images
These are created with every release which should be reasonably stable.

1. Pull the docker image https://hub.docker.com/r/reesvarney02/openchat/
```docker
docker pull reesvarney02/openchat:latest
```
2. Run the image
```sh
docker run --detach -p [port to expose on]:443 --name [container name] reesvarney02/openchat:latest
```
3. Start a bash terminal in the container
```docker
docker exec -it [container name] /bin/bash
```
4. Run the setup script
```sh
npm run setup
```
5. Restart the container
```docker
docker restart [container name]
```

#### Build your own image
You can build OpenChat straight from the repository however it could take several minutes (depending on hardware) as some packages require building (such as sqlite3).
1. Clone/Download the repository
2. Go to the directory that you installed it and build the image
```docker
docker build -t [tag] .
```
3. Run the image in a container
```docker
docker run --detach -p [port to expose on]:443 --name [container name] [tag]
```
4. Start a bash terminal in the container
```docker
docker exec -it [container name] /bin/bash
```
5. Run the setup script (after secret is successfully set, use `CTRL + C` to exit the script)
```sh
npm run setup
```
6. Restart the container (make sure to `exit` from the container terminal first)
```docker
docker restart [container name]
```

#### Implementing letsencrypt SSL keys
I recommend using certbot to auto renew ssl keys (https://certbot.eff.org/)

Change the `docker run` command to:
```docker
docker run -v /etc/letsencrypt/live/[URL_HERE]/:/etc/letsencrypt/live/[URL_HERE]/ -v /etc/letsencrypt/archive/[URL_HERE]/:/etc/letsencrypt/archive/[URL_HERE]/ -env sslkey=/etc/letsencrypt/live/[URL_HERE]/privkey.pem -env sslcert=sslkey=/etc/letsencrypt/live/[URL_HERE]/fullchain.pem --detach -p [port to expose on]:443 --name [container name] reesvarney02/openchat:latest
```

### Further configuration
 - To add more admin accounts, run `npm run addAdmin` in the root of the repository.

 - If you'd like to use a different port, open `conf.json` and change the port value.

## Plans for the future:
 - Add ability to upload and view files/ media.
 - Markdown support
 - Add some kind of session tracking or authentication to allow for more persistence between different sessions, whilst still maintaining the option for user anonymity
 - Combine signalling into single system with native WebRTC implementation
 - IN PROGRESS: Create a repository-based extension system to allow for easy server-level customisation for even those with little technical knowledge. This would also provide the benefit of providing a less disjointed product as there would be less need for individual versions/forks. It may feature things such as:
   - Bots
   - Front-end appearance modification
   - Completely additional functionality

## Extensions
Openchat extensions are the best way to tune and modify Openchat to your liking. Like with everything else, extensions are written in JS and the system is designed to be accessible but also highly capable.

A basic bot can be made in just a few lines, as shown in the following code.

extension.js:
```js
var botName = "TestBot";

module.exports = function(extData){
    var messageListener = extData.controller.messageListener;
    messageListener.on('newMessage', function(msg){
        if(msg.message_content == "!foo"){
            messageListener.emit('sendMessage', {
                sender: botName,
                content: "bar!",
                channel: msg.channel_id
            })
        }
    })
}
```

To install an extension simply add the extension directory in `/extensions` to `conf.json` under "extensions" (to be added to admin panel).


### Extension Data
This is the data that each extension can access.

#### `controller.messageListener`
This is an event emitter which can be used to read messages being sent and send messages itself.

##### `messageListener.on('newMessage', function(data){})`
 - This event is emitted when a message is sent from a user. The data object contains the following data:
    ```
    data =  {
      message_content // The content of the message
      sender_name // The name of whoever sent the message
      channel_id // The ID of the channel which the message was sent to
      message_id // The database ID of the message that was sent
    }
    ```

##### `messageListener.emit('sendMessage', data)`
 - This sends a message to the specified channel, with the content and sender set in the data object in the following format:
    ```
    data =  {
      content // The content of the message
      sender // The name to display
      channel // The ID of the channel to send it to
    }
    ```
    
#### `controller.createStream(channel)`
This creates an empty combiner stream, allowing users to connect to it. Only one stream can exist per channel.

#### `controller.sendStream(stream, channel, format_in)`
This converts the stream into realtime and then pipes it to the combiner stream. Must provide the `format_in` as an [ffmpeg supported format](https://ffmpeg.org/ffmpeg-formats.html).

 - ##### `.on('end')`
    Event emitted when previous input has finished being played in realtime, this should be used to then set the next stream to be played.

#### `server_config`
This includes the config stored in `conf.json`.

MORE TO BE ADDED - WORK IN PROGRESS

## Bugs
If you encounter any issues with OpenChat, please raise an issue so that it can be fixed as quickly as possible.

## Development/ Contribution
Due to the current state of the application in terms of stability, changes will quickly be applied directly to the master branch. However, once stability improves and updates become more incremental, new features/ fixes will be added into their own branches with more extensive testing before being merged into the master branch.

If you would like to contribute please use the following guide: https://github.com/firstcontributions/first-contributions/blob/master/README.md
