![license](https://img.shields.io/github/license/reesvarney/OpenChat)
![Build/Release](https://github.com/reesvarney/OpenChat/workflows/Build/Release/badge.svg)
<p align="center">
  <a href="./">
    <img src="https://raw.githubusercontent.com/reesvarney/OpenChat/assets/logo.png" alt="Logo" width="auto" height="80">
  </a>

  <h3 align="center">OpenChat</h3>

  <p align="center">
    A free, open-source communications platform. Built to be modified.
    <br />
    <a href="https://openchatdemo.tech">View the Demo</a>
    <br />
  </p>
</p>

### I am currently working on the next version of openchat (on v2-rewrite branch) which will come with an electron app for more persistant authentication, this will take a while so it may be some time for the next update. I will be keeping most of the progress on https://trello.com/b/p2K25uED/openchat if you are interested.

## Overview
This is a project that seeks to provide a communication service akin to discord or teamspeak completely built in the javascript stack to increase accessibility and ease of use. It features an MCU which means that clients use a more consistent amount of bandwidth compared to peer-to-peer.

This project is currently in its infancy and is functional, however can have issues with stability, especially in terms of signalling. The current signalling system utilises peer.js and socket.io, however in the future should move to a fully socket.io based negotiation system with native WebRTC implementation.

![User Interface](https://raw.githubusercontent.com/reesvarney/OpenChat/assets/2020-06-28-01-44-localhost.png)

## Install/ Usage
I hope to have server binaries potentially in the future to make things easier but in the meantime you will have to install node.

### Local
1. Install the latest version of Node/ NPM [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2. Download and unzip the `server.zip` from the [latest release](https://github.com/reesvarney/OpenChat/releases/latest)
3. In the unzipped folder, install the prequisite packages with npm.
```sh
npm i
``` 
4. Start the server
```sh
npm start
```
5. Connect to the server and authenticate yourself, either using the client or with email/password, as the first user to connect will be given administrative control over the server.
6. Port forward the port `443` in your router software to allow users to connect from outside the local network ([guide](https://www.noip.com/support/knowledgebase/general-port-forwarding-guide/))

If you already have a SSL key and certificate, you can place them in the `/ssl` directory, naming them `server.key` and `server.cert` respectively, otherwise they will be created automatically for you.

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
4. Continue to follow steps 5-6 from the local method above.

#### Build your own image
You can build OpenChat straight from the repository however it could take several minutes (depending on hardware) as some packages require building (such as sqlite3).
1. Clone/Download the repository
2. Go to the directory that you installed it and build the image
```docker
docker build -t [tag] .
```

#### Implementing letsencrypt SSL keys
I recommend using certbot to auto renew ssl keys (https://certbot.eff.org/)

Change the `docker run` command to:
```docker
docker run -v /etc/letsencrypt/live/[URL_HERE]/:/etc/letsencrypt/live/[URL_HERE]/ -v /etc/letsencrypt/archive/[URL_HERE]/:/etc/letsencrypt/archive/[URL_HERE]/ -env sslkey=/etc/letsencrypt/live/[URL_HERE]/privkey.pem -env sslcert=sslkey=/etc/letsencrypt/live/[URL_HERE]/fullchain.pem --detach -p [port to expose on]:443 --name [container name] reesvarney02/openchat:latest
```

### Further configuration
 - If you'd like to use a different port, change the PORT environment variable. To do this you can use the `.env` file by simply setting `PORT=x`.

## Plans for the future:
 - Add ability to upload and view files/ media.
 - Markdown support
 - Combine signalling into single system with native WebRTC implementation
 - Create a repository-based extension system to allow for easy server-level customisation for even those with little technical knowledge. This would also provide the benefit of providing a less disjointed product as there would be less need for individual versions/forks. It may feature things such as:
   - Bots
   - Front-end appearance modification
   - Completely additional functionality

## Bugs
If you encounter any issues with OpenChat, please raise an issue so that it can be fixed as quickly as possible.

## Development/ Contribution
Due to the current state of the application in terms of stability, changes will quickly be applied directly to the master branch. However, once stability improves and updates become more incremental, new features/ fixes will be added into their own branches with more extensive testing before being merged into the master branch.

If you would like to contribute please use the following guide: https://github.com/firstcontributions/first-contributions/blob/master/README.md