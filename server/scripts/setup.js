//CREATE INITIAL ADMIN
require('../db/init.js').then((db)=> {
    var readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    rl.question("Enter public key for admin", function(answer) {
        require('./add_admin.js')(db, answer);
        console.log('Admin set/created with public key:')
        console.log(answer)
        rl.close();
        process.stdin.destroy();
    });
})