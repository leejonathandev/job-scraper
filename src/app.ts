import puppeteer from "puppeteer";
import https from "https";
import 'dotenv/config'

function formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
        timeZone: process.env.TZ || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

type JobListing = {
    title: string,
    location: string,
    url: string,
    foundDate: string
}

async function getRiotGamesListings(): Promise<Map<string, JobListing>> {
    const titleInclude = ["Software"];
    const titleExclude = ["Staff", "Principal", "Manager"];
    const locationInclude = ["Los Angeles", "Mercer Island", "SF Bay Area"];

    const jobListings: Map<string, JobListing> = new Map();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.riotgames.com/en/work-with-us/jobs", { waitUntil: 'domcontentloaded' });

    // Get raw job listings
    let rawJobListingsXpath = "//ul[@class='job-list__body list--unstyled']/li/a";
    let rawJobListings = await page.$$(`::-p-xpath(${rawJobListingsXpath})`); // Using $$ for multiple elements
    for (const rawJobListing of rawJobListings) {

        // Extract job title
        const title = await rawJobListing.$eval('div.job-row__col--primary', el => el.textContent) || "n/a";
        if (titleExclude.some(exclude => title.includes(exclude)) || !titleInclude.some(include => title.includes(include))) {
            continue;
        }

        // Extract job location
        const location = await rawJobListing.$$eval('div.job-row__col--secondary', el => el[2].textContent) || "n/a";
        if (!locationInclude.some(include => location.includes(include))) {
            continue;
        }

        // Extract job URL
        const url = await rawJobListing.getProperty('href').then(el => el?.jsonValue()) as string || "n/a";

        // Get current date time
        const foundDate = formatDate(new Date());

        // Create a unique hash ID for the job listing
        const hashId: string = "RIOT-" + new URL(url).pathname.split('/').pop();

        // Store the job listing
        jobListings.set(hashId, { title, location, url, foundDate });
    }

    await browser.close();
    return jobListings;
}

function getNewEntries<K, V>(oldMap: Map<K, V>, newMap: Map<K, V>): Map<K, V> {
    const newEntries = new Map<K, V>();

    for (const [key, value] of newMap) {
        // If the old map does not have the key, it's a new entry.
        if (!oldMap.has(key)) {
            newEntries.set(key, value);
        }
    }

    return newEntries;
}

const rateLimiter = async () => {
    await new Promise(r => setTimeout(r, 100)); // 100 millisecond delay between notifications
};

async function sendWebhookNotifications(newListings: Map<string, JobListing>) {
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
    if (!webhookUrl) {
        console.error("Webhook URL is not defined");
        return;
    }

    if (newListings.size === 0) {
        console.log("No new job listings found");
        return;
    }

    for (const listing of newListings.values()) {

        console.log(`New job listing found: ${listing.title} at ${listing.location} - ${listing.url}`);

        const payload = {
            content: "New job listing found:",
            embeds: [{
                title: listing.title,
                url: listing.url,
                description: `Location: ${listing.location}\nFound Date: ${listing.foundDate}`
            }]
        };

        const req = https.request(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }, (res) => {
            if (res.statusCode !== 204) {
                console.error(`Failed to send webhook: ${res.statusCode}`);
            }
        });

        req.on("error", (error) => {
            console.error(`Error sending webhook: ${error}`);
        });

        req.write(JSON.stringify(payload));
        req.end();

        await rateLimiter(); // Replace the direct setTimeout
    }
}

async function main() {


    process.on('SIGINT', async () => {
        console.log('Shutting down gracefully...');
        process.exit(0);
    });

    console.log("Starting monitoring...");

    let oldListings = new Map<string, JobListing>();
    while (true) {
        try {
            let currListings = await getRiotGamesListings();
            await sendWebhookNotifications(getNewEntries(oldListings, currListings));
            oldListings = currListings;
        } catch (error) {
            console.error('Error in main loop:', error);
        }
        console.log(`Finished checking at ${formatDate(new Date())}`);
        await new Promise(r => setTimeout(r, (Number(process.env.REFRESH_DURATION) || 60) * 60 * 1000));
    }
}

main();


