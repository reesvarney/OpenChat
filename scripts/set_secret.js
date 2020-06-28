const fs = require('fs');
const conf = require("../conf.json")
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("The secret will be used to authenticate different parts of your application, make sure this is unique to reduce the risk of security issues.")
rl.question("Enter secret for server: ", function(secret) {
    conf.secret = secret;
    fs.writeFile("./conf.json", JSON.stringify(conf, null, 2), function(err) {
        if(err) {
            console.log(err);
        }
        console.log("Secret successfully set");
    }); 
});