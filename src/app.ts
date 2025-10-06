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

async function getDiscordListings(): Promise<Map<string, JobListing>> {
    const titleInclude: string[] = ["Software"];
    const titleExclude = ["Staff", "Principal", "Manager"];
    const locationInclude: string[] = ["San Francisco", "SF Bay Area", "Remote"];

    const jobListings: Map<string, JobListing> = new Map();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://discord.com/careers", { waitUntil: 'networkidle0' });

    // Get raw job listings
    let rawJobListingsXpath = "//div[@class='jobs-list']/a"; 
    let rawJobListings = await page.$$(`::-p-xpath(${rawJobListingsXpath})`); // Using $$ for multiple elements
    console.log(`Found ${rawJobListings.length} raw job listings`);
    for (const rawJobListing of rawJobListings) {
        // Extract job title
        const title = await rawJobListing.$eval('h3.heading-28px', el => el.textContent) || "n/a";
        if (titleExclude.some(exclude => title.includes(exclude)) || !titleInclude.some(include => title.includes(include))) {
            continue;
        }

        // Extract job location
        const location = await rawJobListing.$eval('p.paragraph-white-opacity50', el => el.textContent) || "n/a";
        // if (!locationInclude.some(include => location.includes(include))) {
        //     continue;
        // }

        // Extract job URL
        const url = await rawJobListing.getProperty('href').then(el => el?.jsonValue()) as string || "n/a";

        // Get current date time
        const foundDate = formatDate(new Date());

        // Create a unique hash ID for the job listing
        const hashId: string = "DISCORD-" + new URL(url).pathname.split('/').pop();

        // Store the job listing
        jobListings.set(hashId, { title, location, url, foundDate });
    }

    await browser.close();
    return jobListings;
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
    }

    if (newListings.size === 0) {
        console.log("No new job listings found");
    }

    for (const [key, listing] of newListings.entries()) {
        console.log(`New job listing found [${key}]: ${listing.title} at ${listing.location} - ${listing.url}`);

        const payload = {
            content: "New job listing found:",
            embeds: [{
                title: key,
                url: listing.url,
                description: `Title: ${listing.title}\nLocation: ${listing.location}\nFound Date: ${listing.foundDate}`
            }]
        };

        if (webhookUrl) {
            let shouldRetry = true;
            while (shouldRetry) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const req = https.request(webhookUrl, {
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
        process.exit(0);
    });

    console.log("Starting monitoring...");

    let oldListings = new Map<string, JobListing>();
    while (true) {
        try {
            // Fetch both Discord and Riot Games listings in parallel
            const [discordListings, riotListings] = await Promise.all([
                getDiscordListings(),
                getRiotGamesListings()
            ]);

            // Combine both maps into a single map
            const currListings = new Map([...discordListings, ...riotListings]);
            
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


