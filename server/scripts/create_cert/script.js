const mkcert = require('mkcert');
const fs = require('fs');

module.exports = async()=>{
  console.log('SSL: Generating self signed certificates...')

  if (!fs.existsSync('./ssl')){
    fs.mkdirSync('./ssl');
  }

  const ca = await mkcert.createCA({
    organization: 'OpenChat',
    countryCode: 'US',
    state: 'Virginia',
    locality: 'Blacksburgh',
    validityDays: 365
  });
  
  const cert = await mkcert.createCert({
    domains: ['127.0.0.1', 'localhost'],
    validityDays: 365,
    caKey: ca.key,
    caCert: ca.cert
  });

  fs.writeFile('./ssl/server.key', cert.key, 'utf8', (err) => {
    if (err) throw err;
    console.log('SSL: Key Saved');
  });

  fs.writeFile('./ssl/server.cert', cert.cert, 'utf8', (err) => {
    if (err) throw err;
    console.log('SSL: Certificate Saved');
  });

  return cert;
}
