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

function addressSplitStreet(address) {
    let addressArray = address.split(/\n/);
    let nationalTaxTest = addressArray[0];
    nationalTaxTestString = nationalTaxTest.replace(/\s/g, '');

    if (nationalTaxTestString == 'NATIONALTAXSEARCH') {
        return ('NATIONAL TAX SEARCH');
    } else {
        let arrayLength = addressArray.length;
        if (addressArray[arrayLength - 1] == '') {
            addressArray.pop();
        }

        addressArray.shift();
        addressArray.pop();

        let addressStreet = addressArray.join(' ');

        return (addressStreet);
    }
}

function addressSplitCity(address) {
    let addressArray = address.split(/\n/);


    let arrayLength = addressArray.length;
    if (addressArray[arrayLength - 1] == '') {
        addressArray.pop();
    }
    let updatedArrayLength = addressArray.length;
    let bottomAddressLine = addressArray[updatedArrayLength - 1];
    let bottomLineArray = bottomAddressLine.split(' ');
    bottomLineArray.pop();
    bottomLineArray.pop();

    addressCity = bottomLineArray.join(' ');

    return (addressCity);

}

function addressSplitState(address) {
    let addressArray = address.split(/\n/);
    let arrayLength = addressArray.length;
    if (addressArray[arrayLength - 1] == '') {
        addressArray.pop();
    }
    let updatedArrayLength = addressArray.length;
    let bottomAddressLine = addressArray[updatedArrayLength - 1];
    let bottomLineArray = bottomAddressLine.split(' ');

    bottomLineArray.pop();
    bottomLineLength = bottomLineArray.length;

    addressState = bottomLineArray[bottomLineLength - 1];

    return (addressState);
}

function addressSplitZipCode(address) {
    let addressArray = address.split(/\n/);
    let arrayLength = addressArray.length;
    if (addressArray[arrayLength - 1] == '') {
        addressArray.pop();
    }
    let updatedArrayLength = addressArray.length;
    let bottomAddressLine = addressArray[updatedArrayLength - 1];
    let bottomLineArray = bottomAddressLine.split(' ');

    bottomLineLength = bottomLineArray.length;

    addressZipCode = bottomLineArray[bottomLineLength - 1];

    return (addressZipCode);
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

    let addressStreet = addressSplitStreet(rawTxt3); //street address
    await inputToSheets(addressStreet, 'H' + rowNumber);

    let addressCity = addressSplitCity(rawTxt3); //city
    await inputToSheets(addressCity, 'I' + rowNumber);

    let addressState = addressSplitState(rawTxt3);//state
    await inputToSheets(addressState, 'J' + rowNumber);

    let addressZipCode = addressSplitZipCode(rawTxt3);//zip code
    await inputToSheets(addressZipCode, 'K' + rowNumber);

    await page.waitForTimeout(20000) //for google sheets api request limits, need to implement exponential backoff algo like Google suggests

    browser.close();
}


async function runScraper(iterations) { //need to format for start and end point
    for (let i = 2; i <= iterations + 1; i++) {
        await scrapeProduct(i);
    }
}

runScraper(480);

