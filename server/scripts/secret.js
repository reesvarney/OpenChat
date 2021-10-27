let crypto = require('crypto');
let fs = require('fs');

module.exports = ()=>{
  let secret;
  if (fs.existsSync('./secret.txt')) {
    secret =  fs.readFileSync('./secret.txt', 'utf8');
    return secret;
  } else {
    secret = crypto.randomBytes(128).toString('hex');
    fs.writeFileSync('./secret.txt', secret, 'utf8');
    return secret;
  }
}
