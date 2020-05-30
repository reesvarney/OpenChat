# OpenChat
## Overview
This is a project that seeks to provide a communication service akin to discord or teamspeak completely built in the javascript stack to increase accessibility and ease of use.

This project is currently in its infancy and is functional, however can have issues with stability, especially in terms of signalling. The current signalling system utilises peer.js and socket.io, however in the future should move to a fully socket.io based negotiation system with native WebRTC implementation.

At the core of OpenChat is its MCU (Multipoint Conferencing Unit) which allows many users to connect without having to establish a connection between each and every peer. It currently utilises a headless browser (using puppeteer) which acts as a proxy-client to receive multiple WebRTC streams and create a single output for each user. Extensive testing for performance and stability has not yet been carried out but the system seems to handle several users quite well without requiring too much power from the CPU (although may be RAM intensive with the natural drawback from using a chromium based headless browser).

## Usage
Using OpenChat is quite simple. The following guide explains how to set it up locally however for others to be able to connect, an SSL certificate will need to be configured (as well as modifications to the `server.js`, although this is planned to be implemented soon). Optionally you can also host the `/client` directory with a provider such as Netlify which will provide a free SSL certificate.

1. Install the latest version of Node/ NPM
2. Clone/ Download the repository
3. Open the repository and run `npm i` to install prequisite packages
4. (Temporary until administrative panel is added) - edit `conf.json` to add channels and configure ports
5. Navigate to `/mcu/js/secret.js` and change the secret to a random string of characters
6. Run `npm start` in the console at the root of the repository
7. Open `IP:PORT` in your browser (e.g. `localhost:8080/`)

## Plans for the future:
 - [ ] Add admin panel to allow server settings to be adjusted without having to manually edit files
 - [ ] Create better mode of authentication to verify local MCU
 - [ ] Configure `server.js` so that an SSL certificate can easily be added
 - [ ] Rewrite front-end styling to use custom css rather than depending on a framework
 - [ ] Use react to optimize front-end code
 - [ ] Add some kind of session tracking to allow for more persistence between different sessions, whilst still maintaining the option for user anonymity
 - [ ] Combine signalling into single system with native WebRTC implementation

## Bugs
If you encounter any issues with OpenChat, please raise an issue so that it can be fixed as quickly as possible.

### Currently Identified Issues:
 - Instability beyond 8/9 users in a single channel
 - Temperamental issues with signalling, especially regarding users currently connected to a channel
 - Sometimes voice channels seem to 'break' meaning users are completely unable to join them

## Development/ Contribution
Due to the current state of the application in terms of stability, changes will quickly be applied directly to the master branch. However, once stability improves and updates become more incremental, new features/ fixes will be added into their own branches with more extensive testing before being merged into the master branch.

If you would like to contribute please use the following guide: https://github.com/firstcontributions/first-contributions/blob/master/README.md
