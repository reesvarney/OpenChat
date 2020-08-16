const ogs = require('open-graph-scraper');
var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var anchorme = require("anchorme").default;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var moment = require('moment');
const { render } = require('ejs');

function sanitize(str){
    var document = new JSDOM("<div></div>");
    document.window.document.querySelector('div').textContent = str;
    return document.window.document.documentElement.querySelector('div').innerHTML;
}

module.exports = function(db){
    var ogpCache = {};
    var messageCache = {};
    var ytCache = {};

    //TODO: ONLY GET MESSAGES FROM DB WHEN NEW MESSAGES HAVE BEEN SENT
    router.get('/channels/:channel', function(req, res){
        if(req.query.page == undefined){
            req.query.page = 0;
        };

        var query;

        if (req.query.id != undefined){
            query = {
                where: {
                    id: req.query.id
                },
                limit: 1
            }
        } else {
            query = {
                where: {
                    channelId: req.params.channel
                },
                order: [['createdAt', 'DESC']],
                limit: 50,
                offset: req.query.page * 50
            }
        };

        var messages = db.Messages.findAll(query);

        if(messages.length == 0){
            res.render("messages/none");
        } else {
            function getMessageData(i){
                return new Promise((resolve) => {
                    var currentResult = result[i];
    
                    var content_clean = sanitize(currentResult.message_content);
    
                    currentResult.message_content = anchorme({
                        input: content_clean,
                        options : {
                        attributes: {
                            class: "found-link",
                            target: "_blank"
                        }
                        }
                    });

                    var links = anchorme.list(content_clean);

                    currentResult.message_date = moment.utc(currentResult.message_date).format('MMMM Do YYYY, h:mm a');

                    if(links.length != 0){
                        var linkHandled = false;

                        var regEx = [
                            {
                                "name": "yt",
                                "expression" : /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gim,
                                "function" : function(str){return str.replace("watch", "embed").replace("?v=", "/")}
                            },
                            {
                                "name" : "twitch",
                                "expression" : /^(?:https?:\/\/)?(?:www\.|go\.)?twitch\.tv\/([a-z0-9_]+)($|\?)/g,
                                "function" : function(str){return str.replace("twitch.tv/", "player.twitch.tv/?channel=").replace("www.", "").concat("&autoplay=false")}
                            }
                        ]

                        for(x = 0; x < links.length; x++){
                            for(z = 0; z < regEx.length; z++){
                                var currentRegEx = regEx[z];
                                if(currentRegEx.expression.test(links[x].string)){
                                    currentResult[currentRegEx.name] = currentRegEx.function(links[x].string);
                                    result[i] = currentResult;
                                    messageCache[currentResult.message_id] = currentResult;
                                    resolve(i)
                                    linkHandled = true;
                                }
                            }
                        };
                        
                        if(!linkHandled){
                            var firstLink = links[0].string;
                            if(firstLink in ogpCache){
                                currentResult["ogp"] = ogpCache[firstLink];
                                result[i] = currentResult;
                                messageCache[currentResult.message_id] = currentResult;
                                resolve(i)
                                linkHandled = true;
                            } else {
                                ogs({ url: firstLink }, (error, ogpResult, response) => {
                                    if ("ogTitle" in ogpResult){
                                        var ogpData = {}
        
                                        ogpData.imageSRC = "";
                                        if ("ogImage" in ogpResult && "url" in ogpResult.ogImage) {
                                            ogpData.imageSRC = ogpResult.ogImage.url
                                        if (ogpResult.ogImage.url.startsWith("/")){
                                            ogpData.imageSRC = (ogpResult.requestUrl || ogpResult.ogUrl) + ogpResult.ogImage.url;
                                        }
                                        }
        
                                        ogpData.siteName = "";
                                        if ("ogSiteName" in ogpResult){
                                            ogpData.siteName = `${ogpResult.ogSiteName} - `;
                                        }
                                        
                                        ogpData.url = ogpResult.ogUrl || ogpResult.requestUrl;
                                        ogpData.title = ogpResult.ogTitle;
                                        ogpData.desc = ogpResult.ogDescription
        
                                        ogpCache[firstLink] = ogpData;
                                        currentResult["ogp"] = ogpData;
                                        result[i] = currentResult;
                                        messageCache[currentResult.message_id] = currentResult;
                                        resolve(i)
                                        linkHandled = true;
                                    };
                                });
                            };
                        }
                    } else {
                        result[i] = currentResult;
                        messageCache[currentResult.message_id] = currentResult;
                        resolve(i)
                        linkHandled = true;
                    };
                });
            }

            var messageStatuses = [];

            for(i = 0; i < messages.length; i++){
                if(messages[i].id in messageCache){
                    messages[i] = messageCache[messages[i].id];
                } else {
                    messageStatuses[messages[i].id] = getMessageData(i);
                }
            }

            Promise.all(messageStatuses).then(function(){
                res.render("messages/messages", {data: result});
            }).catch((e) => { console.log(e) });
        }
    });

    return router;
};