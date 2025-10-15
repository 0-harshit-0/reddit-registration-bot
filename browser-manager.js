// BrowserManager.js
import axios from 'axios';
import puppeteerCore from 'puppeteer-core';
import { config } from './config.js';

// Try to enable puppeteer-extra + stealth plugin when launching locally
let puppeteer = null;
let useStealth = false;
async function getPuppeteerForTest() {
  // Use bunded Chromium from 'puppeteer' to avoid executablePath error
  const puppeteerRegular = (await import('puppeteer')).default;
  const { executablePath } = await import('puppeteer');
  try {
    const puppeteerExtra = (await import('puppeteer-extra')).default;
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    puppeteerExtra.use(StealthPlugin());
    useStealth = true;
    return { puppeteerImpl: puppeteerExtra, executablePathFn: executablePath };
  } catch {
    // Fallback to regular puppeteer without stealth
    useStealth = false;
    return { puppeteerImpl: puppeteerRegular, executablePathFn: executablePath };
  }
}

// Shared tuning
const DEFAULT_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-infobars',
  '--lang=en-US,en',
];

const DEFAULT_VIEWPORT = {
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const ACCEPT_LANGUAGES = 'en-US,en;q=0.9';

async function applyEarlyEvasions(page, {
  timezone = 'America/New_York',
  languages = ['en-US', 'en'],
  platform = 'Win32',
} = {}) {
  try {
    await page.emulateTimezone(timezone);
  } catch {}

  await page.evaluateOnNewDocument((opts) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    Object.defineProperty(navigator, 'languages', {
      get: () => Object.freeze(opts.languages),
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => opts.platform,
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => Object.freeze([{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }]),
    });

    const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }

    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {};
  }, { languages, platform });
}

export class BrowserManager {
  constructor(profileId, testMode = false) {
    this.profileId = profileId;
    this.browserType = testMode ? 'test' : config.browser.type;
    this.browser = null;
    this.page = null;
  }

  async launch() {
    console.log(`Launching ${this.browserType} browser profile: ${this.profileId}`);
    if (this.browserType === 'test') {
      return await this.launchTestBrowser();
    } else if (this.browserType === 'adspower') {
      return await this.launchAdsPower();
    } else if (this.browserType === 'multilogin') {
      return await this.launchMultilogin();
    } else {
      throw new Error('Unsupported browser type. Use "adspower" or "multilogin"');
    }
  }

  async launchTestBrowser() {
    try {
      const { puppeteerImpl, executablePathFn } = await getPuppeteerForTest();

      // Important: provide executablePath() to avoid puppeteer-core error
      this.browser = await puppeteerImpl.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', ...DEFAULT_ARGS],
        executablePath: executablePathFn(), // path to bundled Chromium from 'puppeteer'
      });

      const page = await this.browser.newPage();
      this.page = await this._prepareFirstPage(page);
      console.log(`Test browser launched successfully${useStealth ? ' with stealth' : ''}`);
      return this.page;
    } catch (error) {
      throw new Error(`Failed to launch test browser: ${error.message}`);
    }
  }

  async launchAdsPower() {
    try {
      const response = await axios.get(`${config.browser.adspower.apiUrl}/api/v1/browser/start`, {
        params: { user_id: this.profileId, launch_args: [], headless: 0 },
      });

      if (response.data.code !== 0) {
        throw new Error(`AdsPower API error: ${response.data.msg}`);
      }

      const { ws } = response.data.data;
      this.browser = await puppeteerCore.connect({
        browserWSEndpoint: ws.puppeteer || ws,
        defaultViewport: null,
      });

      const pages = await this.browser.pages();
      this.page = pages && pages.length ? pages[0] : await this.browser.newPage();
      await this._hardenConnectedPage(this.page, { managedByAntiDetect: true });

      console.log('AdsPower browser connected successfully');
      return this.page;
    } catch (error) {
      throw new Error(`Failed to launch AdsPower browser: ${error.message}`);
    }
  }

  async launchMultilogin() {
    try {
      const response = await axios.get(`${config.browser.multilogin.apiUrl}/api/v1/profile/start`, {
        params: { automation: 'puppeteer', profileId: this.profileId },
      });

      const { value } = response.data;

      this.browser = await puppeteerCore.connect({
        browserWSEndpoint: value,
        defaultViewport: null,
      });

      const pages = await this.browser.pages();
      this.page = pages && pages.length ? pages[0] : await this.browser.newPage();
      await this._hardenConnectedPage(this.page, { managedByAntiDetect: true });

      console.log('Multilogin browser connected successfully');
      return this.page;
    } catch (error) {
      throw new Error(`Failed to launch Multilogin browser: ${error.message}`);
    }
  }

  async close() {
    try {
      if (this.browser) {
        if (this.browserType === 'test') {
          console.log('Test browser closed');
        } else {
          await this.browser.disconnect();
          console.log('Browser disconnected');
        }
      }

      if (this.browserType === 'adspower') {
        await axios.get(`${config.browser.adspower.apiUrl}/api/v1/browser/stop`, {
          params: { user_id: this.profileId },
        });
      } else if (this.browserType === 'multilogin') {
        await axios.get(`${config.browser.multilogin.apiUrl}/api/v1/profile/stop`, {
          params: { profileId: this.profileId },
        });
      }

      if (this.browserType !== 'test') {
        console.log('Browser profile closed');
      }
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }

  async humanType(element, text, minDelay = 50, maxDelay = 150) {
    for (const char of text) {
      await element.type(char, {
        delay: Math.random() * (maxDelay - minDelay) + minDelay
      });
    }
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Internal: apply stealth-like hardening to a new page
  async _prepareFirstPage(page) {
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': ACCEPT_LANGUAGES,
      'Sec-CH-UA-Platform': 'Windows',
    });

    page.once('domcontentloaded', async () => {
      try {
        const vp = page.viewport();
        if (!vp) await page.setViewport(DEFAULT_VIEWPORT);
      } catch {}
    });

    await applyEarlyEvasions(page, {
      timezone: 'America/New_York',
      languages: ['en-US', 'en'],
      platform: 'Win32',
    });

    return page;
  }

  // Internal: add safe evasions when connected to anti-detect containers
  async _hardenConnectedPage(page, { managedByAntiDetect = false } = {}) {
    await page.setExtraHTTPHeaders({ 'Accept-Language': ACCEPT_LANGUAGES });

    // Only override UA if headless token appears
    try {
      const ua = await page.browser().userAgent();
      if (ua && ua.includes('HeadlessChrome')) {
        await page.setUserAgent(USER_AGENT);
      }
    } catch {}

    const vp = page.viewport();
    if (!vp) await page.setViewport(DEFAULT_VIEWPORT);

    await applyEarlyEvasions(page, {
      timezone: 'America/New_York',
      languages: ['en-US', 'en'],
      platform: 'Win32',
    });

    await page.evaluateOnNewDocument(() => {
      try {
        const cores = Math.max(4, Math.min(16, navigator.hardwareConcurrency || 8));
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores });
      } catch {}
    });
  }
}
