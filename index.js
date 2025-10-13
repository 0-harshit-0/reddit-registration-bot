import { RedditBot } from "./reddit-bot.js";
import fs from "fs";

async function main() {
  const PROFILE_ID = "k15wytp2";

  const bot = new RedditBot(PROFILE_ID);

  const username = bot.generateRandomUsername("reddit");
  const password = bot.generateRandomPassword(14);

  const result = await bot.registerAccount(username, password);

  if (result.success) {
    const accounts = loadAccounts();
    accounts.push({
      ...result,
      createdAt: new Date().toISOString(),
    });
    saveAccounts(accounts);

    console.log("Account details saved to accounts.json");
  }
}

function loadAccounts() {
  try {
    if (fs.existsSync("accounts.json")) {
      return JSON.parse(fs.readFileSync("accounts.json", "utf8"));
    }
  } catch (error) {
    console.error("Error loading accounts:", error.message);
  }
  return [];
}

function saveAccounts(accounts) {
  try {
    fs.writeFileSync("accounts.json", JSON.stringify(accounts, null, 2));
  } catch (error) {
    console.error("Error saving accounts:", error.message);
  }
}

main().catch(console.error);
