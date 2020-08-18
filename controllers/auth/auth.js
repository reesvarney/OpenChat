var crypto = require('crypto');
var salts = [];

//Creates salt and adds it to array of known salts, which can then be used to verify the salt
//By passing the fake parameter as true, it just returns the salt, this can be used to stop attacks from detecting valid/ invalid usernames
function createSalt(params){
    var salt = crypto.randomBytes(128).toString('base64');
    if(params.fake) salts.push(salt)
    return salt
}

//SEND SALT TO USER

function addUser(username, salt, hash){
    db.User.create({name: username, salt: salt, pass_hashed: hash})
};

function requestSalt(username){
    var result = db.User.findOne({
        where: {
            name: username
        }
    });
    if (result === null){
        res.send(createSalt({fake: true}))
    }
}