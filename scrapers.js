//script by Jake D'Amico and Otto Coulter
//jakedami.co

const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = require('./client_secret.json')

async function inputToSheets(text, cellNumber) {
    const doc = new GoogleSpreadsheet('1yoalYKIQD7hpKPnaDweTuZQo2X28Z1gk79VNWc3_l9s');
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.loadCells(cellNumber);
    const cell = sheet.getCellByA1(cellNumber);
    cell.value = text;
    await sheet.saveUpdatedCells();
}

async function parcelGrabber(rowNumber) {
    const doc = new GoogleSpreadsheet('1yoalYKIQD7hpKPnaDweTuZQo2X28Z1gk79VNWc3_l9s');
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.loadCells('A' + rowNumber);
    const cell = sheet.getCellByA1('A' + rowNumber);

    let parcelID = cell.value.toString()
    var webCode = parcelID.replace(/-/g, "");

    return webCode;
}

async function scrapeProduct(rowNumber) {

    const parcelID = await parcelGrabber(rowNumber);

    const browser = await puppeteer.launch({
        //headless: false,
        //slowMo: 10,
        devtools: false,
    });

    const page = await browser.newPage();

    await page.goto('https://wedge.hcauditor.org/view/re/' + parcelID + '/2021/summary');


    const [el] = await page.$x('//*[@id="property_information"]/tbody/tr[2]/td[1]/div[2]');// Appraisal Area
    const txt = await el.getProperty('textContent');
    const rawTxt = await txt.jsonValue();
    await inputToSheets(rawTxt, 'B' + rowNumber);

    const [el1] = await page.$x('//*[@id="property_overview_wrapper"]/table[1]/tbody/tr[6]/td[2]');//transfer date
    const txt1 = await el1.getProperty('textContent');
    const rawTxt1 = await txt1.jsonValue();
    await inputToSheets(rawTxt1, 'N' + rowNumber);

    const [el2] = await page.$x('//*[@id="property_overview_wrapper"]/table[1]/tbody/tr[7]/td[2]');//sale amount
    const txt2 = await el2.getProperty('textContent');
    const rawTxt2 = await txt2.jsonValue();
    await inputToSheets(rawTxt2, 'O' + rowNumber);

    const [el3] = await page.$x('//*[@id="property_information"]/tbody/tr[3]/td[2]/div[2]');//mailing address
    const txt3 = await el3.getProperty('textContent');
    const rawTxt3 = await txt3.jsonValue();
    let addressStreet = rawTxt3.split("\n");
    await inputToSheets(addressStreet[1], 'H' + rowNumber);

    let addressCity = addressStreet[2]; //city
    let addressCityPrint = addressCity.split(" ");
    await inputToSheets(addressCityPrint[0], 'I' + rowNumber);

    await inputToSheets(addressCityPrint[1], 'J' + rowNumber);//state

    await inputToSheets(addressCityPrint[2], 'K' + rowNumber);//zip code

    await page.waitForTimeout(20000) //for google sheets api limits

    browser.close();
}


async function runScraper(iterations) {
    for (let i = 2; i <= iterations + 1; i++) {
        await scrapeProduct(i);
    }
}

runScraper(476);

