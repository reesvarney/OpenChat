const puppeteer = require('puppeteer');
var browser;
var page;

async function startMCU({isHeadless, port}) {
    try {
        browser = await puppeteer.launch(
            {
            headless: isHeadless,
            args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage', '--disable-gpu', '--disable-setuid-sandbox'],
            ignoreHTTPSErrors: true
            }
        );
        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0); 
        await page.goto(`https://localhost:${port}/mcu`, {"waitUntil" : "networkidle0"}); //load local page with JS for MCU
        await page.click('#button');
    } catch (err) {
        if(browser !== undefined) browser.close();
        console.log(err)
        startMCU({isHeadless, port});
    }
};

module.exports = startMCU;