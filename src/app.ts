// Node.js built-in modules
import https from "node:https";

// Third-party modules
import 'dotenv/config';
import { type ElementHandle } from 'puppeteer';

// Local modules - config & types
import { browserManager } from './browserManager.js';
import config from './config.js';
import { type Company, type JobListing } from './types.js';

// Local modules - utilities
import { formatDate, truncateString, getNewEntries, rateLimiter } from './utils.js';


async function getGoogleListings(): Promise<Map<string, JobListing>> {
    const companyConfig = config.companies.Google;
    const jobListings: Map<string, JobListing> = new Map();

    const browser = await browserManager.getBrowser();
    const page = await browser.newPage();
    await page.goto(companyConfig.url, { waitUntil: companyConfig.waitUntil });

    // Get raw job listings
    let rawJobListings = await page.$$(companyConfig.selectors.listContainer);
    for (const rawJobListing of rawJobListings) {

        // Extract job title
        const title = await rawJobListing.$eval(companyConfig.selectors.title, (el: Element) => el.textContent) || "n/a";

        const { titleInclude, titleExclude, locationInclude } = companyConfig.filters;

        // Check title include filter if specified
        if (titleInclude?.length && !titleInclude.some(include => title.includes(include))) {
            continue;
        }

        // Check title exclude filter if specified
        if (titleExclude?.length && titleExclude.some(exclude => title.includes(exclude))) {
            continue;
        }

        // Extract job location
        const location = await rawJobListing.$eval(companyConfig.selectors.location, (el: Element) => el.textContent) || "n/a";

        // Check location include filter if specified
        if (locationInclude?.length && !locationInclude.some(include => location.includes(include))) {
            continue;
        }

        // Extract job URL
        const url = await rawJobListing.$(companyConfig.selectors.url).then((el: ElementHandle | null) => el?.getProperty('href')).then((el) => el?.jsonValue()) as string || "n/a";

        // Get current date time
        const foundDate = formatDate(new Date(), config.timezone);

        // Create a unique hash ID for the job listing
        const jobIdMatch = url.match(/\/jobs\/results\/(\d+)-/);
        const hashId: string = "GOOGLE-" + (jobIdMatch ? jobIdMatch[1] : new URL(url).pathname);

        // Store the job listing
        jobListings.set(hashId, { title, location, url, foundDate, company: 'Google' });
    }

    await browserManager.releaseBrowser();
    return jobListings;
}

async function getDiscordListings(): Promise<Map<string, JobListing>> {
    const companyConfig = config.companies.Discord;
    const jobListings: Map<string, JobListing> = new Map();

    const browser = await browserManager.getBrowser();
    const page = await browser.newPage();
    await page.goto(companyConfig.url, { waitUntil: companyConfig.waitUntil });

    // Get raw job listings
    let rawJobListings = await page.$$(companyConfig.selectors.listContainer);
    console.log(`Found ${rawJobListings.length} raw job listings`);
    for (const rawJobListing of rawJobListings) {
        // Extract job title
        const title = await rawJobListing.$eval(companyConfig.selectors.title, (el: Element) => el.textContent) || "n/a";

        const { titleInclude, titleExclude, locationInclude } = companyConfig.filters;

        // Check title include filter if specified
        if (titleInclude?.length && !titleInclude.some(include => title.includes(include))) {
            continue;
        }

        // Check title exclude filter if specified
        if (titleExclude?.length && titleExclude.some(exclude => title.includes(exclude))) {
            continue;
        }

        // Extract job location
        const location = await rawJobListing.$eval(companyConfig.selectors.location, (el: Element) => el.textContent) || "n/a";

        // Check location include filter if specified
        if (locationInclude?.length && !locationInclude.some(include => location.includes(include))) {
            continue;
        }

        // Extract job URL
        const url = await rawJobListing.getProperty(companyConfig.selectors.url).then((el) => el?.jsonValue()) as string || "n/a";

        // Get current date time
        const foundDate = formatDate(new Date(), config.timezone);

        // Create a unique hash ID for the job listing
        const hashId: string = "DISCORD-" + new URL(url).pathname.split('/').pop();

        // Store the job listing
        jobListings.set(hashId, { title, location, url, foundDate, company: 'Discord' });
    }

    await browserManager.releaseBrowser();
    return jobListings;
}

async function getRiotGamesListings(): Promise<Map<string, JobListing>> {
    const companyConfig = config.companies["Riot Games"];
    const jobListings: Map<string, JobListing> = new Map();

    const browser = await browserManager.getBrowser();
    const page = await browser.newPage();
    await page.goto(companyConfig.url, { waitUntil: companyConfig.waitUntil });

    // Get raw job listings
    let rawJobListings = await page.$$(companyConfig.selectors.listContainer);
    for (const rawJobListing of rawJobListings) {

        // Extract job title
        const title = await rawJobListing.$eval(companyConfig.selectors.title, (el: Element) => el.textContent) || "n/a";

        const { titleInclude, titleExclude, locationInclude } = companyConfig.filters;

        // Check title include filter if specified
        if (titleInclude?.length && !titleInclude.some(include => title.includes(include))) {
            continue;
        }

        // Check title exclude filter if specified
        if (titleExclude?.length && titleExclude.some(exclude => title.includes(exclude))) {
            continue;
        }

        // Extract job location
        const location = await rawJobListing.$$eval(companyConfig.selectors.location, (el: Element[]) => el[2].textContent) || "n/a";

        // Check location include filter if specified
        if (locationInclude?.length && !locationInclude.some(include => location.includes(include))) {
            continue;
        }

        // Extract job URL
        const url = await rawJobListing.getProperty(companyConfig.selectors.url).then((el) => el?.jsonValue()) as string || "n/a";

        // Get current date time
        const foundDate = formatDate(new Date(), config.timezone);

        // Create a unique hash ID for the job listing
        const hashId: string = "RIOT-" + new URL(url).pathname.split('/').pop();

        // Store the job listing
        jobListings.set(hashId, { title, location, url, foundDate, company: 'Riot Games' });
    }

    await browserManager.releaseBrowser();
    return jobListings;
}


async function sendWebhookNotifications(newListings: Map<string, JobListing>) {
    if (!config.webhook) {
        console.error("Webhook URL is not defined");
    }

    if (newListings.size === 0) {
        console.log("No new job listings found");
    }

    for (const [key, listing] of newListings.entries()) {
        // Style the console output with colors and formatting
        console.log(
            '%c🔍 New Job Listing Found%c\n' +
            '%cCompany:%c %s\n' +
            '%cTitle:%c %s\n' +
            '%cLocation:%c %s\n' +
            '%cURL:%c %s',
            'color: #4CAF50; font-weight: bold; font-size: 12px;', '', // Job Listing header
            'color: #2196F3; font-weight: bold;', 'color: inherit;', listing.company,
            'color: #2196F3; font-weight: bold;', 'color: inherit;', truncateString(listing.title, 50),
            'color: #2196F3; font-weight: bold;', 'color: inherit;', truncateString(listing.location, 25),
            'color: #2196F3; font-weight: bold;', 'color: inherit;', truncateString(listing.url, 70)
        );

        const payload = {
            content: "New job listing found:",
            embeds: [{
                title: listing.title,
                url: listing.url,
                description: `Company: ${listing.company}\nLocation: ${listing.location}\nFound Date: ${listing.foundDate}`
            }]
        };

        if (config.webhook) {
            let shouldRetry = true;
            while (shouldRetry) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const req = https.request(config.webhook!, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }, async (res) => {
                            // Handle rate limiting
                            if (res.statusCode === 429) {
                                let data = '';
                                res.on('data', chunk => data += chunk);
                                res.on('end', async () => {
                                    try {
                                        const rateLimit = JSON.parse(data);
                                        const retryAfter = rateLimit.retry_after; // seconds
                                        console.log(`Rate limited. Waiting ${retryAfter} seconds before retrying...`);
                                        await new Promise(r => setTimeout(r, retryAfter * 1000));
                                        reject(new Error('rate_limited'));
                                    } catch (e) {
                                        console.error('Error parsing rate limit response:', e);
                                        reject(e);
                                    }
                                });
                            } else if (res.statusCode !== 204) {
                                console.error(`Failed to send webhook: ${res.statusCode}`);
                                reject(new Error(`HTTP ${res.statusCode}`));
                            } else {
                                resolve();
                            }
                        });

                        req.on("error", (error) => {
                            console.error(`Error sending webhook: ${error}`);
                            reject(error);
                        });

                        req.write(JSON.stringify(payload));
                        req.end();
                    });

                    shouldRetry = false; // If we get here, the request was successful
                } catch (error: any) {
                    if (error?.message !== 'rate_limited') {
                        shouldRetry = false; // Don't retry on non-rate-limit errors
                        throw error;
                    }
                    // For rate_limited errors, the loop will continue
                }
            }
        }

        await rateLimiter(); // Normal delay between successful requests
    }
}


async function main() {
    process.on('SIGINT', async () => {
        console.log('Shutting down gracefully...');
        await browserManager.forceClose();
        process.exit(0);
    });

    console.log("Starting monitoring...");

    let oldListings = new Map<string, JobListing>();
    while (true) {
        try {
            // Fetch all listings in parallel
            const [googleListings, discordListings, riotListings] = await Promise.all([
                getGoogleListings(),
                getDiscordListings(),
                getRiotGamesListings(),
            ]);

            const currListings = new Map([...googleListings, ...discordListings, ...riotListings]);

            await sendWebhookNotifications(getNewEntries(oldListings, currListings));
            oldListings = currListings;
        } catch (error) {
            console.error('Error in main loop:', error);
            await browserManager.forceClose(); // Clean up browser on error
        }
        console.log(`Finished checking at ${formatDate(new Date(), config.timezone)}`);
        await new Promise(r => setTimeout(r, config.refreshDuration * 60 * 1000));
    }
}

main();


