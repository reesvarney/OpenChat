var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var salts = [];

function checkAuth(req, res, next){
    if (req.isAuthenticated()){
        return next();
    };
    res.redirect('/auth')
}
  
function checkNotAuth(req, res, next){
    if (!req.isAuthenticated()){
        return next();
    };
    res.redirect('/')
}
  
module.exports = function ({db, passport}) {

    router.get('/', checkNotAuth, function(req, res){
        res.redirect('/auth/login');
    })

    router.get('/login', checkNotAuth, function(req,res){
        if('username' in req.query && req.query.username.length != 0){
            db.models.User.findOne({
                where: {
                    name: req.query.username
                }
            }).then(function(result){
                var salt = (result === null) ? crypto.randomBytes(128).toString('base64') : result.salt;
                res.render('auth/login', {salt: salt, username: req.query.username, step: 2});
            });
        } else {
            res.render('auth/login', {step: 1, failed: ("failed" in req.query) ? true : false});
        }
    });

    router.post('/login',
    passport.authenticate('local', {failureRedirect: "/auth/login?failed"}),
    function(req,res){
        res.redirect("/");
    });

    router.get('/register', checkNotAuth, function(req,res){
        var salt = crypto.randomBytes(128).toString('base64');
        req.session.salt = salt;
        res.render('auth/register', {salt: salt});
    })

    router.post('/register', checkNotAuth, function(req,res){
        if( req.session.salt == req.body.salt){
            var private_salt = crypto.randomBytes(128).toString('base64');
            var hash = crypto.createHash('sha256');
            hash.update(req.body.password);
            hash.update(private_salt);
            db.models.User.create({name: req.body.username, salt: req.body.salt, private_salt: private_salt, pass_hashed: hash.digest('hex')});
            res.redirect('/auth/login')
        };
    });

    router.use(express.static('./views/static'));

    return router;
};