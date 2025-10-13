import axios from 'axios';
import { config } from './config.js';

export class EmailService {
  constructor() {
    this.provider = config.email.provider;
  }

  async generateTempEmail() {
    console.log('Generating temporary email...');
    
    const email = this.generateRandomEmail();
    console.log(`Generated email: ${email}`);
    
    return email;
  }

  generateRandomEmail() {
    const username = this.generateRandomString(10);
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getVerificationCode(email, timeout = 60000) {
    console.log('Waiting for verification email...');
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      await this.sleep(5000);
      console.log('Checking for verification email...');
    }
    
    return null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
