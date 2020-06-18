const puppeteer = require('puppeteer');

async function startMCU(params) {
    const browser = await puppeteer.launch(
        {
        headless: params.isHeadless,
        args: ['--autoplay-policy=no-user-gesture-required']
        }
    );
    const page = await browser.newPage();
    await page.goto(`${params.protocol}://localhost:${params.port}/mcu`, {"waitUntil" : "networkidle0"}); //load local page with JS for MCU
    await page.click('#button');
};

module.exports = startMCU;