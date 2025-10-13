import axios from 'axios';
import { config } from './config.js';

export class CaptchaSolver {
  constructor() {
    this.apiKey = config.nextCaptcha.apiKey;
    this.apiUrl = config.nextCaptcha.apiUrl;
  }

  async solveCaptcha(siteKey, pageUrl, captchaType = 'recaptcha_v2') {
    if (!this.apiKey) {
      throw new Error('NextCaptcha API key not configured');
    }

    console.log('Submitting captcha to NextCaptcha...');
    
    const taskId = await this.createTask(siteKey, pageUrl, captchaType);
    const solution = await this.getTaskResult(taskId);
    
    return solution;
  }

  async createTask(siteKey, pageUrl, captchaType) {
    try {
      const response = await axios.post(`${this.apiUrl}/createTask`, {
        clientKey: this.apiKey,
        task: {
          type: captchaType === 'recaptcha_v3' ? 'RecaptchaV3TaskProxyless' : 'RecaptchaV2TaskProxyless',
          websiteURL: pageUrl,
          websiteKey: siteKey,
          ...(captchaType === 'recaptcha_v3' && { minScore: 0.7 })
        }
      });

      if (response.data.errorId !== 0) {
        throw new Error(`NextCaptcha error: ${response.data.errorDescription}`);
      }

      return response.data.taskId;
    } catch (error) {
      throw new Error(`Failed to create captcha task: ${error.message}`);
    }
  }

  async getTaskResult(taskId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);
      
      try {
        const response = await axios.post(`${this.apiUrl}/getTaskResult`, {
          clientKey: this.apiKey,
          taskId: taskId
        });

        if (response.data.status === 'ready') {
          console.log('Captcha solved successfully!');
          return response.data.solution.gRecaptchaResponse;
        }

        if (response.data.status === 'failed') {
          throw new Error('Captcha solving failed');
        }

        console.log(`Waiting for captcha solution... (${i + 1}/${maxAttempts})`);
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Failed to get captcha result: ${error.message}`);
        }
      }
    }

    throw new Error('Captcha solving timeout');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
