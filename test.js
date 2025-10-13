import { RedditBot } from "./reddit-bot.js";

async function testRedditRegistration() {
  console.log("=== Testing Reddit Registration Flow ===\n");
  
  const bot = new RedditBot("test-profile", true);
  
  const username = bot.generateRandomUsername("reddit");
  const password = bot.generateRandomPassword(14);
  
  const result = await bot.registerAccount(username, password);
  
  if (result.success) {
    console.log("\n✓ Test completed successfully!");
    console.log("Account details:", result);
  } else {
    console.log("\n✗ Test failed:", result.error);
  }
}

testRedditRegistration().catch(console.error);
