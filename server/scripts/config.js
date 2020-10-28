var fs = require('fs');

module.exports = ()=>{
  var config;
  try{
    config =  require('./config.json');
  } catch(err){
    config = {
      name: "OpenChat Server"
    }
    fs.writeFile('./config.json', JSON.stringify(config), 'utf8', (err) => {
        if (err) throw err;
    });
  }
  return config;
}
