import puppeteer, { Browser } from 'puppeteer';

class BrowserManager {
    private static instance: BrowserManager;
    private browser: Browser | null = null;
    private referenceCount = 0;

    private constructor() {}

    public static getInstance(): BrowserManager {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }

    public async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch();
        }
        this.referenceCount++;
        return this.browser;
    }

    public async releaseBrowser(): Promise<void> {
        this.referenceCount--;
        if (this.referenceCount === 0 && this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    public async forceClose(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.referenceCount = 0;
    }
}

export const browserManager = BrowserManager.getInstance();
