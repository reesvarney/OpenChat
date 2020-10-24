//CREATE INITIAL ADMIN
require('../db/init.js').then((db)=> {
    var readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    rl.question("Enter public key for admin", function(answer) {
        require('./addAdmin.js')(db, answer);
        console.log('Admin set/created with public key:')
        console.log(answer)
        rl.close();
        process.stdin.destroy();
    });
    
    //SET SECRET
    var crypto = require('crypto');
    var fs = require('fs');
    var secret = crypto.randomBytes(128).toString('hex');
    fs.writeFile('secret.txt', secret, (err) => {
        if (err) throw err;
    });
})