const puppeteer = require('puppeteer');
var browser;
var page;

async function startMCU({isHeadless}) {
    try {
        browser = await puppeteer.launch(
            {
            headless: isHeadless,
            args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage', '--disable-gpu', '--disable-setuid-sandbox'],
            ignoreHTTPSErrors: true
            }
        );
        page = await browser.newPage();
        await page.goto(`https://localhost/mcu`, {"waitUntil" : "networkidle0"}); //load local page with JS for MCU
        await page.click('#button');
    } catch (err) {
        browser.close();
        console.log(err)
        startMCU({isHeadless});
    }
};

module.exports = startMCU;