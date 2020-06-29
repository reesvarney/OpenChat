const puppeteer = require('puppeteer');

async function startMCU(params) {
    const browser = await puppeteer.launch(
        {
        headless: params.isHeadless,
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
        ignoreHTTPSErrors: true
        }
    );
    const page = await browser.newPage();
    await page.goto(`https://localhost/mcu`, {"waitUntil" : "networkidle0"}); //load local page with JS for MCU
    await page.click('#button');
};

module.exports = startMCU;