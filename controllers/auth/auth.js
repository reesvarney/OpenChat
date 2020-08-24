var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var salts = {};

function checkAuth(req, res, next){
    if (req.isAuthenticated()){
        return next();
    };
    res.redirect('login')
}
  
function checkNotAuth(req, res, next){
    if (!req.isAuthenticated()){
        return next();
    };
    res.redirect('/')
}
  
module.exports = function ({db, config, fs, passport}) {
    /**
     * Adds a user to the database
     * @param {object} params
     * @param {string} params.username 
     * @param {string} params.salt 
     * @param {string} params.hash 
     */
    
    function addUser(params){
        if(salts[params.username] == params.salt){
            db.User.create({name: params.username, salt: params.salt, pass_hashed: params.hash})
        }
    };

    /**
     * Gets the salt for a user or generates a random salt to send
     * @param {string} username 
     */
    function requestSalt(username){

    };

    router.get('/salts', function(req,res){
        var user = req.body.name;

    })

    router.get('/login', checkNotAuth, function(req,res){
        res.render('auth/login');
    });

    router.post('/login', passport.authenticate('local', {failureRedirect: "login"}), function(req,res){
        var result = db.User.findOne({
            where: {
                name: username
            }
        });
        (result === null) ? res.send(crypto.randomBytes(128).toString('base64')) : res.send(result.salt);
        res.redirect("/");
    });

    router.get('/register', checkNotAuth, function(req,res){
        var salt = crypto.randomBytes(128).toString('base64');
        salts.push(salt);
        res.render('auth/register', {salt: salt});
    })

    router.post('/register', checkNotAuth, function(req,res){
        res.redirect('/')
    })

    return router;
};