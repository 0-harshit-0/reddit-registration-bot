import axios from 'axios';
import puppeteer from 'puppeteer-core';
import { config } from './config.js';

export class BrowserManager {
  constructor(profileId) {
    this.profileId = profileId;
    this.browserType = config.browser.type;
    this.browser = null;
    this.page = null;
  }

  async launch() {
    console.log(`Launching ${this.browserType} browser profile: ${this.profileId}`);
    
    if (this.browserType === 'adspower') {
      return await this.launchAdsPower();
    } else if (this.browserType === 'multilogin') {
      return await this.launchMultilogin();
    } else {
      throw new Error('Unsupported browser type. Use "adspower" or "multilogin"');
    }
  }

  async launchAdsPower() {
    try {
      const response = await axios.get(`${config.browser.adspower.apiUrl}/api/v1/browser/start`, {
        params: {
          user_id: this.profileId,
          launch_args: [],
          headless: 0
        }
      });

      if (response.data.code !== 0) {
        throw new Error(`AdsPower API error: ${response.data.msg}`);
      }

      const { ws, debug_port } = response.data.data;
      
      this.browser = await puppeteer.connect({
        browserWSEndpoint: ws.puppeteer || ws,
        defaultViewport: null
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
      
      console.log('AdsPower browser connected successfully');
      return this.page;
    } catch (error) {
      throw new Error(`Failed to launch AdsPower browser: ${error.message}`);
    }
  }

  async launchMultilogin() {
    try {
      const response = await axios.get(`${config.browser.multilogin.apiUrl}/api/v1/profile/start`, {
        params: {
          automation: 'puppeteer',
          profileId: this.profileId
        }
      });

      const { value } = response.data;
      
      this.browser = await puppeteer.connect({
        browserWSEndpoint: value,
        defaultViewport: null
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
      
      console.log('Multilogin browser connected successfully');
      return this.page;
    } catch (error) {
      throw new Error(`Failed to launch Multilogin browser: ${error.message}`);
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.disconnect();
        console.log('Browser disconnected');
      }

      if (this.browserType === 'adspower') {
        await axios.get(`${config.browser.adspower.apiUrl}/api/v1/browser/stop`, {
          params: { user_id: this.profileId }
        });
      } else if (this.browserType === 'multilogin') {
        await axios.get(`${config.browser.multilogin.apiUrl}/api/v1/profile/stop`, {
          params: { profileId: this.profileId }
        });
      }
      
      console.log('Browser profile closed');
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
}
