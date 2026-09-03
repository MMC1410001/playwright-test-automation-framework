/**
 * RetailCrm Chatbot — OTP Authentication Setup
 *
 * Run ONCE before executing homepage.spec.js:
 *   node tests/e2e/RetailCrm/Chatbot/auth.setup.js
 *
 * The script checks whether the saved session is still alive on the server by
 * doing a real headless browser probe.  If the session is expired it opens a
 * visible browser, requests an OTP for 9000000001, waits for you to type the
 * OTP in this terminal, completes login, and saves the new session.
 *
 * Use --force to skip the probe and always do a fresh login.
 */

const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const BASE_URL  = `${process.env.CHATBOT_API_URL || 'https://httpbin.org'}/`;
const MOBILE    = '9000000001';
const AUTH_DIR  = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'retail_crm-auth.json');

const SEL = {
  mobileInput: '#phoneNumber',
  submitBtn:   'button[type="submit"]',
  otpInput:    '#otp',
  chatInput:   'textarea[placeholder="Message RetailCrm Opus Assistant..."]',
};

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

/**
 * Probe the saved session by loading it in a headless browser.
 * Returns true only if the chat textarea is visible (session alive on server).
 */
async function isSessionLive() {
  if (!fs.existsSync(AUTH_FILE)) return false;

  process.stdout.write('Checking session validity... ');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page    = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'commit' });
    // Wait up to 10 s for either the chat textarea (valid) or login field (expired)
    const result = await Promise.race([
      page.locator(SEL.chatInput).waitFor({ state: 'visible', timeout: 10_000 })
          .then(() => 'valid'),
      page.locator(SEL.mobileInput).waitFor({ state: 'visible', timeout: 10_000 })
          .then(() => 'expired'),
    ]).catch(() => 'expired');

    return result === 'valid';
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function doOtpLogin() {
  console.log('\n=== RetailCrm Chatbot — OTP Login Setup ===\n');
  console.log(`Mobile number : ${MOBILE}`);
  console.log('Opening browser...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'commit' });
  await page.locator(SEL.mobileInput).waitFor({ state: 'visible', timeout: 15_000 });
  await page.fill(SEL.mobileInput, MOBILE);
  await page.click(SEL.submitBtn);

  console.log(`OTP requested for ${MOBILE}. Check your phone.\n`);

  await page.locator(SEL.otpInput).waitFor({ state: 'visible', timeout: 20_000 });
  const otp = await prompt('>>> Enter the OTP received on your phone: ');

  if (!otp || !/^\d{4,8}$/.test(otp)) {
    console.error('Invalid OTP entered. Aborting.');
    await browser.close();
    process.exit(1);
  }

  await page.fill(SEL.otpInput, otp);
  await page.click(SEL.submitBtn);

  console.log('\nVerifying OTP...');

  try {
    await page.waitForFunction(
      () => !document.querySelector('#otp') && !document.querySelector('#phoneNumber'),
      { timeout: 15_000 }
    );
  } catch {
    console.error('\nLogin may have failed — OTP fields still visible.');
    await browser.close();
    process.exit(1);
  }

  // Wait for the chat interface to fully render before saving state
  await page.locator(SEL.chatInput).waitFor({ state: 'visible', timeout: 20_000 });

  await context.storageState({ path: AUTH_FILE });
  console.log(`\n✓ Session saved to ${AUTH_FILE}`);
  console.log('Run tests now immediately:\n  npm run retail_crm:homepage\n');

  await browser.close();
}

async function main() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const forceLogin = process.argv.includes('--force');

  if (!forceLogin) {
    const live = await isSessionLive();
    if (live) {
      console.log('session is alive.\n✓ Reusing existing session — run tests now:\n  npm run retail_crm:homepage\n');
      return;
    }
    console.log('session expired.\n');
  } else {
    console.log('--force flag set, skipping probe.\n');
  }

  await doOtpLogin();
}

main().catch(err => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
