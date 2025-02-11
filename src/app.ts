import moment from "moment";
import puppeteer, { Browser } from "puppeteer";

const REFRESH_DURATION = 60; // in minutes  

type Filters = {
    titleIncludes?: string[],
    titleExcludes?: string[],
    locationIncludes?: string[],
    locationExcludes?: string[]
}

type JobListing = {
    id: string,
    jobTitle: string,
    jobLocation: string,
    jobUrl: string,
    foundDate: string
}

/**
 * @async
 * @function getRiotGamesListings
 * @param {puppeteer.Browser} browser - The puppeteer browser instance.
 * @param {Filters} filters - The filters to apply to the job listings.
 * @returns {Promise<JobListing[]>} - A promise that resolves to an array of job listings.
 */
async function getRiotGamesListings(browser: Browser, hashes: Set<string>, filters: Filters): Promise<JobListing[]> {
    // console.log("Starting scraping Riot Games career page");
    const jobListings: JobListing[] = [];

    let rawJobListingsXpath = "//ul[@class='job-list__body list--unstyled']/li/a";

    const page = await browser.newPage();
    await page.goto("https://www.riotgames.com/en/work-with-us/jobs", { waitUntil: 'domcontentloaded' });
    // console.log(`Page loaded in ${(await page.metrics()).TaskDuration} seconds`)

    let rawJobListings = await page.$$(`::-p-xpath(${rawJobListingsXpath})`); // Using $$ for multiple elements
    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent) || "n/a";
        const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', els => els[2].textContent) || "n/a";
        const jobUrl = await rawJobListing.getProperty('href').then(el => el?.jsonValue()) as string || "n/a";
        const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');
        const hashId: string = "RIOT-" + new URL(jobUrl).pathname.split('/').pop();
        if (!hashes.has(hashId)) {
            hashes.add(hashId);
            if (filters.titleIncludes && !filters.titleIncludes.some((term) => jobTitle.includes(term))) continue;
            if (filters.titleExcludes && filters.titleExcludes.some((term) => jobTitle.includes(term))) continue;
            if (filters.locationIncludes && !filters.locationIncludes.some((term) => jobLocation.includes(term))) continue;
            if (filters.locationExcludes && filters.locationExcludes.some((term) => jobLocation.includes(term))) continue;
            jobListings.push({ id: hashId, jobTitle: jobTitle, jobLocation: jobLocation, jobUrl: jobUrl, foundDate: foundDate });
    }
}
page.close();
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
            const jobUrl = await rawJobListing.evaluate(el => (el as HTMLAnchorElement).href);
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
    let filters: Filters = {
        titleIncludes: ["Software", "Developer"],
        titleExcludes: ["Principal", "Manager", "Staff", "Lead", "Distinguished", "Contractor"],
        locationIncludes: ["USA"]
    }

    const foundHashes: Set<string> = new Set();
    const browser = await puppeteer.launch();

    while (true) {
        try {
            let newListings: JobListing[] = [];
            await Promise.all([
                await getRiotGamesListings(browser, foundHashes, filters),
            ]).then((listings) => {
                newListings = newListings.concat(listings.flat());
            });
            if (newListings.length > 0) {
                for (const listing of newListings) {
                    // console.log(listing.id);
                    // console.log(listing.jobTitle);
                    // console.log(listing.jobLocation);
                    // console.log(listing.jobUrl);
                    // console.log(`Found on: ${listing.foundDate}`);
                    // console.log("");
                    fetch('https://ntfy.sh/joeyeyey-job-scraper', {
                        method: 'POST',
                        body: `${listing.jobTitle}\n${listing.jobLocation}\n${listing.jobUrl}`
                    })
                }
            } else {
                // console.log(`No new listings found as of ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
            }
        } catch (e) {
            console.log(`ERROR: ${e}`);
        }
        await new Promise(r => setTimeout(r, REFRESH_DURATION * 60 * 1000));
    }
}

main();


