var sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto');
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var db = new sqlite3.Database('./db/openchat.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, salt TEXT)");
    }

    function hashPassword(password, salt) {
        var hash = crypto.createHash('sha256');
        hash.update(password);
        hash.update(salt);
        return hash.digest('hex');
    }

    function addUser(username, password){
        var salt = crypto.randomBytes(128).toString('base64');
        var hashed_pass = hashPassword(password, salt);
        db.run(`INSERT INTO users (username, password, salt) VALUES ( $username, $password, $salt)`,
        {
            "$username": username,
            "$password": hashed_pass,
            "$salt": salt
        }
        , function (err, result) {
            if (err) throw err;
        });
    };

    rl.question("Enter admin username: ", function(name) {
        rl.question("Enter admin password: ", function(pass) {
            addUser(name, pass);
            rl.close();
        });
    });
});