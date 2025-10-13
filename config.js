import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nextCaptcha: {
    apiKey: process.env.NEXTCAPTCHA_API_KEY,
    apiUrl: 'https://api.nextcaptcha.com'
  },
  
  browser: {
    type: process.env.BROWSER_TYPE || 'adspower',
    adspower: {
      apiUrl: process.env.ADSPOWER_API_URL || 'http://local.adspower.net:50325'
    },
    multilogin: {
      apiUrl: process.env.MULTILOGIN_API_URL || 'http://127.0.0.1:35000'
    }
  },
  
  reddit: {
    signupUrl: process.env.REDDIT_SIGNUP_URL || 'https://www.reddit.com/register'
  },
  
  email: {
    provider: process.env.EMAIL_PROVIDER || 'temp-mail',
    apiKey: process.env.EMAIL_API_KEY
  },
  
  delays: {
    typing: { min: 50, max: 150 },
    action: { min: 1000, max: 3000 },
    captcha: { min: 2000, max: 5000 }
  }
};
