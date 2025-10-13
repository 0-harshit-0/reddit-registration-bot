import { BrowserManager } from "./browser-manager.js";
import { CaptchaSolver } from "./captcha-solver.js";
import { EmailService } from "./email-service.js";
import { config } from "./config.js";

export class RedditBot {
  constructor(profileId, testMode = false) {
    this.profileId = profileId;
    this.browserManager = new BrowserManager(profileId, testMode);
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
      const skipped = await this.skipEmailVerification(page, email);
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
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await page.waitForSelector("faceplate-text-input#register-email", {
        timeout: 15000,
        visible: true,
      });

      console.log("Found email web component, accessing shadow DOM input...");

      const inputHandle = await page.evaluateHandle(() => {
        const webComponent = document.querySelector(
          "faceplate-text-input#register-email"
        );
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const continueButton = await page.waitForSelector(
        "button.continue, button.button-brand",
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

  async skipEmailVerification(page, email) {
    try {
      console.log("Looking for email verification page...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const verificationInput = await page.$(
        'faceplate-text-input[name="code"]'
      );
      if (verificationInput) {
        console.log("Email verification page detected");

        const skipButtons = await page.$$("button");
        for (const button of skipButtons) {
          const text = await page.evaluate(
            (el) => el.textContent.trim(),
            button
          );
          if (text.toLowerCase() === "skip") {
            console.log("Found Skip button, clicking...");
            await button.click();
            await this.browserManager.randomDelay(2000, 3000);
            return true;
          }
        }

        console.log(
          "Skip button not found, fetching verification code from email..."
        );
        const code = await this.emailService.getVerificationCode(email);

        if (code) {
          console.log("Entering verification code...");
          await this.enterVerificationCode(page, code);
          return true;
        } else {
          throw new Error("Could not retrieve verification code");
        }
      }

      console.log("No email verification page detected");
      return false;
    } catch (error) {
      console.log("Error checking verification:", error.message);
      return false;
    }
  }

  async enterVerificationCode(page, code) {
    try {
      const inputHandle = await page.evaluateHandle(() => {
        const webComponent = document.querySelector(
          'faceplate-text-input[name="code"]'
        );
        if (!webComponent || !webComponent.shadowRoot) return null;
        return webComponent.shadowRoot.querySelector('input[type="text"]');
      });

      if (!inputHandle) {
        throw new Error(
          "Could not access verification code input in shadow DOM"
        );
      }

      await inputHandle.click();
      await this.browserManager.randomDelay(300, 600);

      await inputHandle.type(code, { delay: 100 });
      await this.browserManager.randomDelay(1500, 2500);

      console.log("Looking for Continue button...");
      const allButtons = await page.$$("button");
      
      let clicked = false;
      for (const button of allButtons) {
        const text = await page.evaluate((el) => el.textContent.trim(), button);
        if (text.toLowerCase() === "continue") {
          console.log("Clicking Continue...");
          await button.click();
          await this.browserManager.randomDelay(3000, 5000);
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        throw new Error("Could not find Continue button");
      }
    } catch (error) {
      throw new Error(`Failed to enter verification code: ${error.message}`);
    }
  }

  async fillRegistrationForm(page, username, password) {
    try {
      console.log(
        "Step 3: Filling password (using Reddit's default username)..."
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Looking for password input...");
      await page.waitForSelector("faceplate-text-input#register-password", {
        timeout: 10000,
        visible: true,
      });

      const passwordInputHandle = await page.evaluateHandle(() => {
        const webComponent = document.querySelector(
          "faceplate-text-input#register-password"
        );
        if (!webComponent || !webComponent.shadowRoot) return null;
        return webComponent.shadowRoot.querySelector('input[type="password"]');
      });

      if (!passwordInputHandle) {
        throw new Error("Could not access password input in shadow DOM");
      }

      await passwordInputHandle.click();
      await this.browserManager.randomDelay(500, 1000);

      console.log(`Typing password`);
      await passwordInputHandle.type(password, { delay: 100 });
      await this.browserManager.randomDelay(1500, 2500);

      console.log("Looking for Continue button...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const continueButton = await page.waitForSelector(
        'button[type="submit"].create, button.create, button[type="submit"]',
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
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const aboutYouModal = await page.$('auth-flow-modal[pagename="onboarding_gender_collection"]');
      if (!aboutYouModal) {
        console.log('No "About you" page found, continuing...');
        return false;
      }

      console.log('"About you" page detected');

      const allButtons = await page.$$("button");
      
      for (const button of allButtons) {
        try {
          const text = await page.evaluate((el) => el.textContent.trim(), button);
          const name = await page.evaluate((el) => el.getAttribute('name'), button);
          
          if (name === "skip" || text.toLowerCase() === "skip") {
            console.log('Found Skip button, clicking...');
            await button.click();
            await this.browserManager.randomDelay(2000, 3000);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      console.log('Skip button not found, clicking "Man" option...');
      for (const button of allButtons) {
        try {
          const text = await page.evaluate((el) => el.textContent.trim(), button);
          if (text === "Man") {
            console.log('Clicking "Man" button...');
            await button.click();
            await this.browserManager.randomDelay(2000, 3000);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      console.log('Could not skip "About you" page');
      return false;
    } catch (error) {
      console.log("Error checking About you page:", error.message);
      return false;
    }
  }

  async selectInterests(page) {
    try {
      console.log("Step 5: Checking for Interests page...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pageContent = await page.evaluate(() => document.body.textContent);
      if (!pageContent.toLowerCase().includes("interests")) {
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
      const allButtons = await page.$$("button");
      
      for (const button of allButtons) {
        const text = await page.evaluate((el) => el.textContent.trim(), button);
        if (text.toLowerCase() === "continue") {
          const isDisabled = await page.evaluate((btn) => btn.disabled, button);
          if (!isDisabled) {
            console.log("Clicking Continue...");
            await button.click();
            await this.browserManager.randomDelay(2000, 3000);
            return true;
          } else {
            console.log("Continue button is disabled, may need to select more interests");
          }
          break;
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
