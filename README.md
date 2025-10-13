# Reddit Registration Bot

Automated Reddit account registration bot with antidetect browser integration, proxy support, and captcha solving.

## Features

- **Antidetect Browser Integration**: Supports AdsPower and Multilogin
- **Captcha Solving**: NextCaptcha API integration for reCAPTCHA
- **Email Generation**: Temporary email generation
- **Human-like Behavior**: Random delays and typing simulation
- **Account Management**: Saves registered accounts to JSON file

## Prerequisites

1. **Node.js** (v16 or higher)
2. **AdsPower** or **Multilogin** antidetect browser
3. **NextCaptcha API Key** (from https://nextcaptcha.com)
4. **Browser Profiles** set up with proxies in your antidetect browser

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` and add your credentials:
```env
NEXTCAPTCHA_API_KEY=your_api_key_here
BROWSER_TYPE=adspower
ADSPOWER_API_URL=http://local.adspower.net:50325
```

## Usage

### Basic Usage

Edit `index.js` and set your profile ID:

```javascript
const PROFILE_ID = 'your_adspower_profile_id';
```

Then run:

```bash
npm start
```

### Advanced Usage

```javascript
import { RedditBot } from './reddit-bot.js';

const bot = new RedditBot('profile_id_123');

const result = await bot.registerAccount('username123', 'SecurePass123!');

if (result.success) {
  console.log('Account created:', result);
}
```

### Batch Registration

```javascript
import { RedditBot } from './reddit-bot.js';

const profiles = ['profile1', 'profile2', 'profile3'];

for (const profileId of profiles) {
  const bot = new RedditBot(profileId);
  const username = bot.generateRandomUsername();
  const password = bot.generateRandomPassword();
  
  await bot.registerAccount(username, password);
  
  await new Promise(resolve => setTimeout(resolve, 60000));
}
```

## Project Structure

```
reddit-bot/
├── index.js              # Main entry point
├── reddit-bot.js         # Core registration logic
├── browser-manager.js    # Antidetect browser integration
├── captcha-solver.js     # NextCaptcha API integration
├── email-service.js      # Email generation
├── config.js             # Configuration
├── package.json
├── .env                  # Your credentials (not tracked)
├── .env.example          # Example configuration
└── accounts.json         # Registered accounts (auto-generated)
```

## AdsPower Setup

1. Install AdsPower
2. Create browser profiles with proxies
3. Get profile IDs from AdsPower UI
4. Use profile IDs in the bot

## Multilogin Setup

1. Install Multilogin
2. Create browser profiles with proxies
3. Get profile IDs from Multilogin
4. Set `BROWSER_TYPE=multilogin` in `.env`

## Troubleshooting

### Browser won't connect
- Make sure AdsPower/Multilogin is running
- Check API URL in `.env` matches your setup
- Verify profile ID is correct

### Captcha fails
- Verify NextCaptcha API key is valid
- Check account balance
- Ensure site key extraction works

### Registration fails
- Reddit may have changed their form structure
- Check browser console for errors
- Update selectors in `reddit-bot.js`

## Legal Notice

This tool is for educational purposes only. Automated account creation may violate Reddit's Terms of Service. Use responsibly and at your own risk.

## License

MIT
