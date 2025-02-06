import moment from "moment";
import puppeteer, { Browser } from "puppeteer";

type Filters = {
    titleIncludes: string[],
    titleExcludes: string[]
}

type JobListing = {
    jobTitle: string,
    jobLocation: string,
    jobUrl: string,
    foundDate: string
}

async function getRiotGamesListings(browser: Browser, filters: Filters) {
    let jobListings: JobListing[] = [];
    let rawJobListingsXpath = "//ul[@class='job-list__body list--unstyled']/li/a";

    const page = await browser.newPage();
    await page.goto("https://www.riotgames.com/en/work-with-us/jobs", { waitUntil: 'domcontentloaded' });

    let rawJobListings = await page.$$(`::-p-xpath(${rawJobListingsXpath})`); // Using $$ for multiple elements
    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent) || "n/a";

        // check if title passes filters
        if (filters.titleIncludes.some((term) => jobTitle.includes(term)) && !filters.titleExcludes.some((term) => jobTitle.includes(term))) {

            const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', els => els[2].textContent) || "n/a";
            const jobUrl = await rawJobListing.getProperty('href').then(el => el?.jsonValue()) as string || "n/a";
            const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');

            jobListings.push({ jobTitle, jobLocation, jobUrl, foundDate });
        }
    }

    return jobListings;
}

async function getCaesarsListings(browser: Browser, filters: Filters) {
    const jobListings = [];

    const page = await browser.newPage();
    await page.goto("https://edmn.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000289546439%3B300000830240017");

    const rawJobListings = await page.$$('job-grid-item__link'); // Using $$ for multiple elements

    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', (el: { textContent: any; }) => el.textContent) || "";

        if (
            filters.titleIncludes.some((term: any) => jobTitle.includes(term)) &&
            !filters.titleExcludes.some((term: any) => jobTitle.includes(term))
        ) {

            const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', (els: { textContent: any; }[]) => els[2].textContent);
            const jobUrl = await rawJobListing.evaluate((el: { href: any; }) => el.href);
            const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');

            jobListings.push({ jobTitle, jobLocation, jobUrl, foundDate });
        }
    }

    return jobListings;
}

// let filters: Filters = {
//     titleIncludes: ["Software", "Developer"],
//     titleExcludes: ["Senior", "Principal", "Manager", "Staff", "Lead", "Distinguished", "Contractor"]
// }

async function main() {

    let foundListings = {}

    const browser = await puppeteer.launch();

    let filters: Filters = {
        titleIncludes: ["Software", "Developer"],
        titleExcludes: []
    }
    
    
    const [riotGamesListings] = await Promise.all([
        getRiotGamesListings(browser, filters),
    ]);
    
    console.log(riotGamesListings);
    
    await browser.close();

}

main();


