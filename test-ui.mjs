import { chromium, devices } from 'playwright';

const BASE_URL = 'https://focus-program-refugees-converter.trycloudflare.com';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'clod3@test.com');
  await page.fill('input[type="password"]', 'testtest123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  
  // Scroll up a bit to show Today header
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(300);
  
  await page.screenshot({ path: '/tmp/libt-final.png', fullPage: false });
  console.log('Done!');
  await browser.close();
}

run().catch(console.error);
