import { type Company } from './types.js';

type CompanyConfig = {
    url: string;
    selectors: {
        listContainer: string;
        title: string;
        location: string;
        url: string;
    };
    filters: {
        titleInclude: string[] | undefined;
        titleExclude: string[] | undefined;
        locationInclude: string[] | undefined;
    };
    waitUntil: 'networkidle0' | 'domcontentloaded';
};

type Config = {
    companies: Record<Company, CompanyConfig>;
    refreshDuration: number; // minutes
    webhook: string | undefined;
    timezone: string | undefined;
};

const config: Config = {
    companies: {
        'Google': {
            url: "https://www.google.com/about/careers/applications/u/1/jobs/results?sort_by=date&location=United%20States&target_level=MID&q=%22Software%20Engineer%22&degree=BACHELORS&employment_type=FULL_TIME",
            selectors: {
                listContainer: 'ul.spHGqe > li > div > div > div:first-child > div',
                title: 'div:first-child > div > h3',
                location: 'div:nth-child(3) > p > span > span',
                url: 'div > div > a'
            },
            filters: {
                titleInclude: undefined,
                titleExclude: ["Staff", "Principal", "Manager"],
                locationInclude: undefined
            },
            waitUntil: 'networkidle0'
        },
        'Discord': {
            url: "https://discord.com/careers",
            selectors: {
                listContainer: 'div.jobs-list > a',
                title: 'h3.heading-28px',
                location: 'p.paragraph-white-opacity50',
                url: 'href'
            },
            filters: {
                titleInclude: ["Software"],
                titleExclude: ["Staff", "Principal", "Manager"],
                locationInclude: ["San Francisco", "SF Bay Area", "Remote"]
            },
            waitUntil: 'networkidle0'
        },
        'Riot Games': {
            url: "https://www.riotgames.com/en/work-with-us/jobs",
            selectors: {
                listContainer: 'ul.job-list__body.list--unstyled > li > a',
                title: 'div.job-row__col--primary',
                location: 'div.job-row__col--secondary',
                url: 'href'
            },
            filters: {
                titleInclude: ["Software"],
                titleExclude: ["Staff", "Principal", "Manager"],
                locationInclude: ["Los Angeles", "Mercer Island", "SF Bay Area"]
            },
            waitUntil: 'domcontentloaded'
        }
    },
    refreshDuration: Number(process.env.REFRESH_DURATION) || 60,
    webhook: process.env.NOTIFICATION_WEBHOOK,
    timezone: process.env.TZ || 'UTC'
};

export default config;
