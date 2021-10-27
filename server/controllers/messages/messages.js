const ogs = require("open-graph-scraper");
let express = require("express");
let router = express.Router();
let anchorme = require("anchorme").default;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
let moment = require("moment");
const rateLimit = require("express-rate-limit");
const autoLimit = rateLimit({
  windowMs: 1 * 1000,
  max: 2
});
const spamLimit = rateLimit({
  windowMs: 15 * 1000,
  max: 15
});
const spamLimit2 = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});

function sanitize(str) {
  let document = new JSDOM("<div></div>");
  document.window.document.querySelector("div").textContent = str;
  return document.window.document.documentElement.querySelector("div")
    .innerHTML;
}

module.exports = function ({ db, io, expressFunctions, signallingServer }) {
  let ogpCache = {};
  let messageCache = {};

  router.get("/channel/:channel", expressFunctions.checkAuth, (req, res) => {
    if (req.query.page == undefined) {
      req.query.page = 0;
    }

    let query;

    if (req.query.id != undefined) {
      query = {
        where: {
          id: req.query.id,
        },
        include: db.models.User,
        limit: 1,
      };
    } else {
      query = {
        where: {
          ChannelId: req.params.channel,
        },
        order: [["createdAt", "DESC"]],
        limit: 50,
        include: db.models.User,
        offset: req.query.page * 50,
      };
    }

    db.models.Message.findAll(query).then((messages) => {
      if (messages.length == 0) {
        res.render("messages/none");
      } else {
        function getMessageData(i) {
          return new Promise((resolve) => {
            let currentMessage = messages[i].dataValues;
            //Just in case message has no user for whatever reason, 
            let content_clean = sanitize(currentMessage.content);
            if(currentMessage.User === null){
              currentMessage.sender = "Anonymous";
            } else {
              currentMessage.sender = currentMessage.User.dataValues.name;
            }

            currentMessage.content = anchorme({
              input: content_clean,
              options: {
                attributes: {
                  class: "found-link",
                  target: "_blank",
                },
              },
            });

            let links = anchorme.list(content_clean);

            currentMessage.date = moment(currentMessage.createdAt);

            if (links.length != 0) {
              let linkHandled = false;

              let regEx = [
                {
                  name: "yt",
                  expression: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gim,
                  function: function (str) {
                    return str.replace("watch", "embed").replace("?v=", "/");
                  },
                },
                {
                  name: "twitch",
                  expression: /^(?:https?:\/\/)?(?:www\.|go\.)?twitch\.tv\/([a-z0-9_]+)($|\?)/g,
                  function: function (str) {
                    return str
                    .replace("twitch.tv/", "player.twitch.tv/?channel=")
                    .replace("www.", "")
                    .concat("&autoplay=false");
                  },
                },
                {
                  name: "spotify",
                  expression: /\.spotify\.com\/([^.]+)/,
                  function: function (str) {
                    return `https://open.spotify.com/embed/${str.split("spotify.com/").pop()}`
                  },
                },
                {
                  name: "appleMusic",
                  expression: /(?:.+)?music\.apple\.com\/..\/(album|song)\/([^,.;#\\\/]+)\/(\d+)$/,
                  function: function (str) {
                    // Bit inefficient but we'll just run the regex on it again so we can use the capture groups
                    let captureGroups = str.match(/(?:.+)?music\.apple\.com\/..\/(album|song)\/([^,.;#\\\/]+)\/(\d+)$/);
                    let out = `https://embed.music.apple.com/gb/${captureGroups[1]}/${captureGroups[2]}/${captureGroups[3]}`;
                    return out
                  }
                }
              ];

              for (x = 0; x < links.length; x++) {
                for (z = 0; z < regEx.length; z++) {
                  let currentRegEx = regEx[z];
                  if (currentRegEx.expression.test(links[x].string)) {
                    currentMessage[currentRegEx.name] = currentRegEx.function(
                      links[x].string
                    );
                    messages[i] = currentMessage;
                    messageCache[currentMessage.id] = currentMessage;
                    resolve(i);
                    linkHandled = true;
                  }
                }
              }

              if (!linkHandled) {
                let firstLink = links[0].string;
                if (firstLink in ogpCache) {
                  currentMessage["ogp"] = ogpCache[firstLink];
                  messages[i] = currentMessage;
                  messageCache[currentMessage.id] = currentMessage;
                  resolve(i);
                  linkHandled = true;
                } else {
                  ogs(
                    {
                      url: firstLink,
                    },
                    (error, ogpResult, response) => {
                      if ("ogTitle" in ogpResult) {
                        let ogpData = {};

                        ogpData.imageSRC = "";
                        if (
                          "ogImage" in ogpResult &&
                          "url" in ogpResult.ogImage
                        ) {
                          ogpData.imageSRC = ogpResult.ogImage.url;
                          if (ogpResult.ogImage.url.startsWith("/")) {
                            ogpData.imageSRC =
                              (ogpResult.requestUrl || ogpResult.ogUrl) +
                              ogpResult.ogImage.url;
                          }
                        }

                        ogpData.siteName = "";
                        if ("ogSiteName" in ogpResult) {
                          ogpData.siteName = `${ogpResult.ogSiteName} - `;
                        }

                        ogpData.url = ogpResult.ogUrl || ogpResult.requestUrl;
                        ogpData.title = ogpResult.ogTitle;
                        ogpData.desc = ogpResult.ogDescription;

                        ogpCache[firstLink] = ogpData;
                        currentMessage["ogp"] = ogpData;
                        messages[i] = currentMessage;
                        messageCache[currentMessage.id] = currentMessage;
                        resolve(i);
                        linkHandled = true;
                      }
                    }
                  );
                }
              }
            } else {
              messages[i] = currentMessage;
              messageCache[currentMessage.id] = currentMessage;
              resolve(i);
              linkHandled = true;
            }
          });
        }

        let messageStatuses = [];
        for (i = 0; i < messages.length; i++) {
          if (messages[i].dataValues.id in messageCache) {
            Object.assign(messageCache[messages[i].dataValues.id], {
              User: messages[i].User, 
              sender: (messages[i].User !== null) ? messages[i].User.dataValues.name : "Anonymous"
            });
            messages[i] = messageCache[messages[i].dataValues.id];
          } else {
            messageStatuses.push(getMessageData(i));
          }
        }

        Promise.all(messageStatuses)
          .then(function () {
            res.render("messages/messages", {
              data: messages,
              req
            });
          })
          .catch((e) => {
            console.log(e);
          });
      }
    });
  });

  router.post("/channel/:channel", autoLimit, spamLimit, spamLimit2, expressFunctions.checkAuth, expressFunctions.hasPermission("send_message"), (req, res) => {
    let error = false;
    if(req.user !== undefined){
      db.models.Message.create({
        ChannelId: req.params.channel,
        UserId: req.user.id,
        content: req.body.contents,
      }).catch((err)=>{
        res.status(400).send(err);
        error = true;
      }).then((message, err) => {
        if(!error){
          console.log(req.user.id, "=>", req.params.channel, "=", req.body.contents);
          res.sendStatus(200);
          io.emit("newMessage", {
            channel_id: message.dataValues.ChannelId,
            message_id: message.dataValues.id
          });
        }
      });
    } else {
      res.status(403).send("NO SESSION")
    }

  });

  router.delete("/message/:uuid", expressFunctions.checkAuth, async(req, res)=>{
    let message = await db.models.Message.findByPk(req.params.uuid);
    if(message !== null){
      if(message.UserId === req.user.id || req.user.permissions.channels[message.ChannelId].manage_messages){
        await message.destroy();
        res.sendStatus(200);
        signallingServer.io.emit("removeMessage", req.params.uuid);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(404);
    }
  });

  return router;
};
