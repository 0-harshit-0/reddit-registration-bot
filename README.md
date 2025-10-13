# Reddit Registration Bot

Automated Reddit account registration bot with antidetect browser integration, Shadow DOM support, email verification handling, and captcha solving.

## Features

- **Antidetect Browser Integration**: Supports AdsPower and Multilogin
- **Test Mode**: Regular Puppeteer mode for testing without antidetect browsers
- **Shadow DOM Support**: Handles Reddit's web component architecture
- **Email Verification**: Automatic skip or code entry from email
- **Captcha Solving**: NextCaptcha API integration for reCAPTCHA
- **Onboarding Flow**: Handles "About you" and Interests pages
- **Human-like Behavior**: Random delays and typing simulation
- **Error Handling**: Stops process immediately on critical errors
- **Account Management**: Saves registered accounts to JSON file

## Prerequisites

1. **Node.js** (v18 or higher)
2. **AdsPower** or **Multilogin** antidetect browser (optional for production)
3. **NextCaptcha API Key** (from https://nextcaptcha.com) - optional
4. **Browser Profiles** set up with proxies in your antidetect browser (for production)

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

### Test Mode (No AdsPower Required)

For testing the registration flow without antidetect browsers:

```bash
node test.js
```

This will launch a regular Chrome browser and test the full registration process.

### Production Mode with AdsPower

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

// Production mode with AdsPower
const bot = new RedditBot('profile_id_123');

// Test mode
const testBot = new RedditBot('test-profile', true);

const username = bot.generateRandomUsername('reddit');
const password = bot.generateRandomPassword(14);

const result = await bot.registerAccount(username, password);

if (result.success) {
  console.log('Account created:', result);
  // result contains: username, email, password, profileId
}
```

### Batch Registration

```javascript
import { RedditBot } from './reddit-bot.js';

const profiles = ['profile1', 'profile2', 'profile3'];

for (const profileId of profiles) {
  const bot = new RedditBot(profileId);
  const username = bot.generateRandomUsername('reddit');
  const password = bot.generateRandomPassword(14);
  
  const result = await bot.registerAccount(username, password);
  
  if (result.success) {
    console.log(`✓ Created account: ${result.username}`);
  } else {
    console.log(`✗ Failed: ${result.error}`);
  }
  
  // Wait 1 minute between registrations
  await new Promise(resolve => setTimeout(resolve, 60000));
}
```

## Registration Flow

The bot handles the complete Reddit registration process:

1. **Email Entry**: Enters email address (handles Shadow DOM)
2. **Email Verification**: 
   - Tries to click "Skip" button
   - If no skip, fetches verification code from email
   - Enters code and continues
3. **Username & Password**: Uses Reddit's default username, enters password
4. **About You**: Clicks "Skip" or selects "Man" option
5. **Interests**: Selects 3-5 random interests
6. **Captcha**: Solves reCAPTCHA if present
7. **Verification**: Confirms successful registration

## Project Structure

```
reddit-bot/
├── index.js              # Main entry point (production)
├── test.js               # Test mode entry point
├── reddit-bot.js         # Core registration logic with Shadow DOM
├── browser-manager.js    # Browser integration (AdsPower/Multilogin/Test)
├── captcha-solver.js     # NextCaptcha API integration
├── email-service.js      # Email generation and verification
├── config.js             # Configuration
├── package.json
├── .env                  # Your credentials (not tracked)
├── .env.example          # Example configuration
└── accounts.json         # Registered accounts (auto-generated)
```

## Key Features Explained

### Shadow DOM Support

Reddit uses Shadow DOM for form inputs. The bot handles this by:
- Using `evaluateHandle()` to pierce shadow roots
- Accessing inputs inside web components
- Working with `faceplate-text-input` elements

### Email Verification

The bot automatically handles email verification:
1. Detects verification page
2. Looks for "Skip" button
3. If skip available, clicks it
4. If no skip, fetches code from email API
5. Enters code and continues

### Error Handling

The bot stops immediately on critical errors:
- Email input not found
- Password input not found  
- Required pages not loading
- Cannot skip or verify email

This prevents wasted time on failed registrations.

## AdsPower Setup

1. Install AdsPower
2. Create browser profiles with proxies
3. Get profile IDs from AdsPower UI
4. Use profile IDs in the bot
5. Ensure daily limit not exceeded (free plan has limits)

## Multilogin Setup

1. Install Multilogin
2. Create browser profiles with proxies
3. Get profile IDs from Multilogin
4. Set `BROWSER_TYPE=multilogin` in `.env`

## Troubleshooting

### "Exceeding open daily limit"
- AdsPower free plan has daily limits
- Use test mode: `node test.js`
- Upgrade AdsPower plan
- Wait 23 hours for limit reset

### Browser won't connect
- Make sure AdsPower/Multilogin is running
- Check API URL in `.env` matches your setup
- Verify profile ID is correct
- Try test mode to isolate issue

### Captcha fails
- Verify NextCaptcha API key is valid
- Check account balance
- Ensure site key extraction works

### Shadow DOM errors
- "Could not access email input" - Page not fully loaded
- Increase wait times in `reddit-bot.js`
- Check if Reddit updated their web components

### "About you page not found"
- Page may not appear for all accounts
- Bot will stop if expected page doesn't load
- Check browser console for actual page state

### Registration fails
- Reddit may have changed their form structure
- Check browser console for errors
- Update selectors in `reddit-bot.js`
- Use test mode to debug visually

## Development Tips

### Testing Changes

Always use test mode when developing:
```bash
node test.js
```

This lets you see the browser and debug issues.

### Debugging

1. Add console.logs in `reddit-bot.js`
2. Increase delays to see what's happening
3. Check browser console for errors
4. Use test mode to see visual feedback

### Updating Selectors

If Reddit changes their UI:
1. Inspect element in browser
2. Update selectors in `reddit-bot.js`
3. Test with `node test.js`
4. Verify in production mode

## Legal Notice

This tool is for educational purposes only. Automated account creation may violate Reddit's Terms of Service. Use responsibly and at your own risk. The authors are not responsible for any misuse of this software.

## License

MIT
