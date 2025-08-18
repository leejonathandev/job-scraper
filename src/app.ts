import moment from "moment";
import puppeteer, { Browser } from "puppeteer";

const REFRESH_DURATION = 60; // in minutes  

type JobListing = {
    id: string,
    jobTitle: string,
    jobLocation: string,
    jobUrl: string,
    foundDate: string
}

async function getRiotGamesListings(browser: Browser): Promise<JobListing[]> {
    const jobListings: JobListing[] = [];

    let rawJobListingsXpath = "//ul[@class='job-list__body list--unstyled']/li/a";

    const page = await browser.newPage();
    await page.goto("https://www.riotgames.com/en/work-with-us/jobs", { waitUntil: 'domcontentloaded' });

    let rawJobListings = await page.$$(`::-p-xpath(${rawJobListingsXpath})`); // Using $$ for multiple elements
    for (const rawJobListing of rawJobListings) {
        const jobTitle = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent) || "n/a";
        const jobLocation = await rawJobListing.$$eval('div.job-row__col--secondary', els => els[2].textContent) || "n/a";
        const jobUrl = await rawJobListing.getProperty('href').then(el => el?.jsonValue()) as string || "n/a";
        const foundDate = moment().format('YYYY-MM-DD HH:mm:ss');
        const hashId: string = "RIOT-" + new URL(jobUrl).pathname.split('/').pop();
        jobListings.push({ id: hashId, jobTitle: jobTitle, jobLocation: jobLocation, jobUrl: jobUrl, foundDate: foundDate });
    }
    page.close();
    return jobListings;
}

async function main() {

    const browser = await puppeteer.launch();

    while (true) {
        try {
            const newListings = await getRiotGamesListings(browser);
        } catch (e) {
            console.log(`ERROR: ${e}`);
        }
        await new Promise(r => setTimeout(r, REFRESH_DURATION * 60 * 1000));
    }
}

main();


