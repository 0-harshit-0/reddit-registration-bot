import { BrowserManager } from "./browser-manager.js";
import { CaptchaSolver } from "./captcha-solver.js";
import { EmailService } from "./email-service.js";
import { config } from "./config.js";

export class RedditBot {
  constructor(profileId) {
    this.profileId = profileId;
    this.browserManager = new BrowserManager(profileId);
    this.captchaSolver = new CaptchaSolver();
    this.emailService = new EmailService();
  }

  async registerAccount(username, password) {
    let page;

    try {
      console.log("\n=== Starting Reddit Account Registration ===\n");

      page = await this.browserManager.launch();
      const email = await this.emailService.generateTempEmail();

      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}\n`);

      console.log("Navigating to Reddit registration page...");
      try {
        await page.goto(config.reddit.signupUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
      } catch (navError) {
        console.log("Navigation slow, continuing anyway...");
      }

      console.log("Waiting for page to stabilize...");
      await this.browserManager.randomDelay(5000, 7000);

      console.log("Step 1: Entering email...");
      await this.enterEmail(page, email);

      console.log("Step 2: Checking for email verification...");
      const skipped = await this.skipEmailVerification(page);
      if (!skipped) {
        console.log(
          "Email verification page not found or cannot skip, proceeding..."
        );
      }

      await this.fillRegistrationForm(page, username, password);

      await this.skipAboutYou(page);

      await this.selectInterests(page);

      console.log("Checking for captcha...");
      const captchaResult = await this.handleCaptcha(page);

      if (captchaResult) {
        console.log("Captcha handled successfully");
      }

      await this.browserManager.randomDelay(3000, 5000);

      const success = await this.verifyRegistration(page);

      if (success) {
        console.log("\n✓ Account registered successfully!\n");
        return {
          success: true,
          username,
          email,
          password,
          profileId: this.profileId,
        };
      } else {
        throw new Error("Registration verification failed");
      }
    } catch (error) {
      console.error("\n✗ Registration failed:", error.message, "\n");
      return {
        success: false,
        error: error.message,
      };
    } finally {
      await this.browserManager.close();
    }
  }

  async enterEmail(page, email) {
    try {
      console.log("Waiting for email input field...");
      await page.waitForTimeout(2000);

      await page.waitForSelector('faceplate-text-input#register-email', {
        timeout: 15000,
        visible: true,
      });

      console.log("Found email web component, accessing shadow DOM input...");
      
      const inputHandle = await page.evaluateHandle(() => {
        const webComponent = document.querySelector('faceplate-text-input#register-email');
        if (!webComponent || !webComponent.shadowRoot) return null;
        return webComponent.shadowRoot.querySelector('input[type="email"]');
      });

      if (!inputHandle) {
        throw new Error("Could not access email input in shadow DOM");
      }

      console.log("Clicking email input...");
      await inputHandle.click();
      await this.browserManager.randomDelay(500, 1000);

      console.log(`Typing email: ${email}`);
      await inputHandle.type(email, { delay: 100 });
      await this.browserManager.randomDelay(1500, 2500);

      console.log("Looking for Continue button...");
      await page.waitForTimeout(1000);

      const continueButton = await page.waitForSelector(
        'button.continue, button.button-brand',
        {
          timeout: 10000,
          visible: true,
        }
      );

      console.log("Clicking Continue button...");
      await continueButton.click();
      await this.browserManager.randomDelay(3000, 5000);
    } catch (error) {
      throw new Error(`Failed to enter email: ${error.message}`);
    }
  }

  async skipEmailVerification(page) {
    try {
      console.log("Looking for email verification page...");
      await page.waitForTimeout(2000);

      const skipButton = await page.$('button:has-text("Skip")');
      if (skipButton) {
        console.log("Found Skip button, clicking...");
        await skipButton.click();
        await this.browserManager.randomDelay(2000, 3000);
        return true;
      }

      console.log("Skip button not found, checking if we can continue...");
      return false;
    } catch (error) {
      console.log("No skip option found, continuing...");
      return false;
    }
  }

  async fillRegistrationForm(page, username, password) {
    try {
      console.log("Step 3: Filling username and password...");

      await page.waitForTimeout(2000);

      console.log("Looking for username input...");
      const usernameInput = await page.waitForSelector(
        'input[placeholder*="Username"], input[name="username"]',
        {
          timeout: 15000,
          visible: true,
        }
      );

      await usernameInput.click();
      await this.browserManager.randomDelay(500, 1000);

      await usernameInput.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await this.browserManager.randomDelay(300, 600);

      console.log(`Typing username: ${username}`);
      await usernameInput.type(username, { delay: 100 });
      await this.browserManager.randomDelay(1500, 2500);

      console.log("Looking for password input...");
      const passwordInput = await page.waitForSelector(
        'input[placeholder*="Password"], input[type="password"]',
        {
          timeout: 10000,
          visible: true,
        }
      );

      await passwordInput.click();
      await this.browserManager.randomDelay(500, 1000);

      console.log(`Typing password`);
      await passwordInput.type(password, { delay: 100 });
      await this.browserManager.randomDelay(1500, 2500);

      console.log("Looking for Continue button...");
      const continueButton = await page.waitForSelector(
        'button:has-text("Continue")',
        {
          timeout: 10000,
          visible: true,
        }
      );

      console.log("Clicking Continue...");
      await continueButton.click();
      await this.browserManager.randomDelay(3000, 5000);
    } catch (error) {
      throw new Error(`Failed to fill registration form: ${error.message}`);
    }
  }

  async skipAboutYou(page) {
    try {
      console.log('Step 4: Checking for "About you" page...');
      await page.waitForTimeout(2000);

      const skipButton = await page.$('button:has-text("Skip")');
      if (skipButton) {
        console.log('Found "About you" page, clicking Skip...');
        await skipButton.click();
        await this.browserManager.randomDelay(2000, 3000);
        return true;
      }

      console.log('No "About you" page found, continuing...');
      return false;
    } catch (error) {
      console.log("Error checking About you page:", error.message);
      return false;
    }
  }

  async selectInterests(page) {
    try {
      console.log("Step 5: Checking for Interests page...");
      await page.waitForTimeout(2000);

      const interestsTitle = await page.$("text=/Interests/i");
      if (!interestsTitle) {
        console.log("Interests page not found, continuing...");
        return false;
      }

      console.log("Found Interests page, selecting random interests...");

      const interestButtons = await page.$$('button[role="checkbox"]');

      if (interestButtons.length === 0) {
        console.log(
          "No interest buttons found, trying alternative selector..."
        );
        const altButtons = await page.$$('button:not([type="submit"])');

        if (altButtons.length > 5) {
          const numToSelect = Math.floor(Math.random() * 3) + 3;
          console.log(`Selecting ${numToSelect} random interests...`);

          for (let i = 0; i < numToSelect && i < altButtons.length; i++) {
            const randomIndex = Math.floor(Math.random() * altButtons.length);
            try {
              await altButtons[randomIndex].click();
              await this.browserManager.randomDelay(300, 800);
              console.log(`Selected interest ${i + 1}`);
            } catch (e) {
              console.log(`Failed to click interest ${i + 1}`);
            }
          }
        }
      } else {
        const numToSelect = Math.floor(Math.random() * 3) + 3;
        console.log(`Selecting ${numToSelect} interests...`);

        for (let i = 0; i < numToSelect && i < interestButtons.length; i++) {
          const randomIndex = Math.floor(
            Math.random() * interestButtons.length
          );
          try {
            await interestButtons[randomIndex].click();
            await this.browserManager.randomDelay(300, 800);
            console.log(`Selected interest ${i + 1}`);
          } catch (e) {
            console.log(`Failed to click interest ${i + 1}`);
          }
        }
      }

      await this.browserManager.randomDelay(1000, 2000);

      console.log("Looking for Continue button...");
      const continueButton = await page.waitForSelector(
        'button:has-text("continue"), button[type="button"]',
        {
          timeout: 10000,
        }
      );

      if (continueButton) {
        const isDisabled = await page.evaluate(
          (btn) => btn.disabled,
          continueButton
        );
        if (!isDisabled) {
          console.log("Clicking Continue...");
          await continueButton.click();
          await this.browserManager.randomDelay(2000, 3000);
          return true;
        } else {
          console.log(
            "Continue button is disabled, may need to select more interests"
          );
        }
      }

      return true;
    } catch (error) {
      console.log("Error on Interests page:", error.message);

      return false;
    }
  }

  async handleCaptcha(page) {
    try {
      const recaptchaFrame = await page.$('iframe[src*="recaptcha"]');

      if (!recaptchaFrame) {
        console.log("No captcha detected");
        return false;
      }

      console.log("Captcha detected, extracting sitekey...");

      const siteKey = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="recaptcha"]');
        if (iframe) {
          const src = iframe.getAttribute("src");
          const match = src.match(/k=([^&]+)/);
          return match ? match[1] : null;
        }
        return null;
      });

      if (!siteKey) {
        throw new Error("Could not extract reCAPTCHA site key");
      }

      console.log(`Site key: ${siteKey}`);

      const captchaSolution = await this.captchaSolver.solveCaptcha(
        siteKey,
        page.url()
      );

      console.log("Injecting captcha solution...");
      await page.evaluate((token) => {
        const textarea = document.querySelector(
          'textarea[name="g-recaptcha-response"]'
        );
        if (textarea) {
          textarea.value = token;
          textarea.style.display = "block";
        }

        if (typeof window.___grecaptcha_cfg !== "undefined") {
          const clients = window.___grecaptcha_cfg.clients;
          for (let client in clients) {
            if (clients[client].callback) {
              clients[client].callback(token);
            }
          }
        }
      }, captchaSolution);

      await this.browserManager.randomDelay(1000, 2000);
      return true;
    } catch (error) {
      console.error("Captcha handling error:", error.message);
      return false;
    }
  }

  async verifyRegistration(page) {
    try {
      await page
        .waitForNavigation({ timeout: 15000, waitUntil: "networkidle2" })
        .catch(() => {});

      const url = page.url();
      console.log(`Current URL: ${url}`);

      if (url.includes("reddit.com") && !url.includes("register")) {
        return true;
      }

      const errorElement = await page.$('[class*="error"], [class*="Error"]');
      if (errorElement) {
        const errorText = await page.evaluate(
          (el) => el.textContent,
          errorElement
        );
        console.log(`Error detected: ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.log("Verification check inconclusive");
      return false;
    }
  }

  generateRandomUsername(prefix = "user") {
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}`;
  }

  generateRandomPassword(length = 12) {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
