import puppeteer from "puppeteer";
import moment from "moment";

String.prototype.includesAny = function (substrings) {
    return substrings.some(substring => this.includes(substring));
}

const filters = {
    titleIncludes: ["Software", "Developer"],
    titleExcludes: ["Senior", "Principal", "Manager", "Staff", "Lead", "Distinguished", "Contractor"]
}

async function getRiotGamesListings(browser, filters) {
    const jobListings = [];

    const page = await browser.newPage();
    await page.goto("https://www.riotgames.com/en/work-with-us/jobs");

    const rawJobListings = await page.$$('a.js-job-url'); // Using $$ for multiple elements

    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent);

        if (filters.titleIncludes.some(term => jobTitle.includes(term)) && !filters.titleExcludes.some(term => jobTitle.includes(term))) {
            const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', els => els[2].textContent);
            const jobUrl = await rawJobListing.evaluate(el => el.href);
            const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');

            jobListings.push({ jobTitle, jobLocation, jobUrl, foundDate });
        }
    }

    return jobListings;
}

async function getCaesarsListings(browser, filters) {
    const jobListings = [];

    const page = await browser.newPage();
    await page.goto("https://edmn.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000289546439%3B300000830240017");

    const rawJobListings = await page.$$('a.js-job-url'); // Using $$ for multiple elements

    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent);

        if (filters.titleIncludes.some(term => jobTitle.includes(term)) && !filters.titleExcludes.some(term => jobTitle.includes(term))) {
            const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', els => els[2].textContent);
            const jobUrl = await rawJobListing.evaluate(el => el.href);
            const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');

            jobListings.push({ jobTitle, jobLocation, jobUrl, foundDate });
        }
    }

    return jobListings;
}

const browser = await puppeteer.launch();
const [riotGamesListings] = await Promise.all([
    getRiotGamesListings(browser, filters),
]);

console.log(riotGamesListings);

await browser.close();
