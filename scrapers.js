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

    await sheet.loadCells('A1:P515');
    const cell = sheet.getCellByA1(cellNumber);
    cell.value = text;
    await sheet.saveUpdatedCells();
}

async function getAddressNumber(rowNumber) {
    const doc = new GoogleSpreadsheet('1yoalYKIQD7hpKPnaDweTuZQo2X28Z1gk79VNWc3_l9s');
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.loadCells('A:A');
    const cell = sheet.getCellByA1('A' + rowNumber);
    const address = cell.value.split(' ');
    return address[0];
}

async function getAddressStreet(rowNumber) {
    const doc = new GoogleSpreadsheet('1yoalYKIQD7hpKPnaDweTuZQo2X28Z1gk79VNWc3_l9s');
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.loadCells('A:A');
    const cell = sheet.getCellByA1('A' + rowNumber);
    const address = cell.value.split(' ');
    address.shift()
    let street = address.join(" ");

    return street;
}

async function scrapeProduct(i) {
    const addressStreet = await getAddressStreet(i);
    const addressNumber = await getAddressNumber(i);

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 10,
        devtools: false,
    });
    const page = await browser.newPage();
    await page.goto('https://wedge.hcauditor.org/');

    await page.type('#house_number_low', addressNumber);
    await page.type('#street_name', addressStreet);
    await Promise.all([
        page.click('#search_by_street_address > div:nth-child(4) > button.fg-button.ui-priority-primary.ui-button.ui-widget.ui-state-default.ui-corner-all.ui-button-text-only'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    const [el] = await page.$x('//*[@id="property_information"]/tbody/tr[3]/td[1]/div[2]')// LLC
    const txt = await el.getProperty('textContent');
    const rawTxt = await txt.jsonValue();

    inputToSheets(rawTxt, 'B' + i);

    browser.close();
}

scrapeProduct(2)
scrapeProduct(3)

//getAddressNumber(2);


