const ogs = require("open-graph-scraper");
var express = require("express");
var router = express.Router();
var anchorme = require("anchorme").default;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var moment = require("moment");
const { render } = require("ejs");
const { User } = require("../../db/models");

function sanitize(str) {
  var document = new JSDOM("<div></div>");
  document.window.document.querySelector("div").textContent = str;
  return document.window.document.documentElement.querySelector("div")
    .innerHTML;
}

module.exports = function ({ db, io, expressFunctions }) {
  var ogpCache = {};
  var messageCache = {};

  router.get("/:channel", expressFunctions.checkAuth, (req, res) => {
    if (req.query.page == undefined) {
      req.query.page = 0;
    }

    var query;

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
            var currentMessage = messages[i].dataValues;
            //Just in case message has no user for whatever reason, 
            var content_clean = sanitize(currentMessage.content);
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

            var links = anchorme.list(content_clean);

            currentMessage.date = moment(currentMessage.createdAt);

            if (links.length != 0) {
              var linkHandled = false;

              var regEx = [
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
              ];

              for (x = 0; x < links.length; x++) {
                for (z = 0; z < regEx.length; z++) {
                  var currentRegEx = regEx[z];
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
                var firstLink = links[0].string;
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
                        var ogpData = {};

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

        var messageStatuses = [];
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
            });
          })
          .catch((e) => {
            console.log(e);
          });
      }
    });
  });

  router.post("/:channel", expressFunctions.checkAuth, expressFunctions.hasPermission("permission_send_message"), (req, res) => {
    var error = false;
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

  return router;
};
