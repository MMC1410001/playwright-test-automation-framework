/**
 * Combined auth-refresh + DOM inspection script.
 * Run: node tests/e2e/RetailCrm/Chatbot/dom-inspect.js
 *
 * 1. Opens browser, loads saved session
 * 2. If login page appears → prompts for fresh OTP, re-authenticates, saves new session
 * 3. Dumps real DOM structure to dom-snapshot.json for selector analysis
 */

const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const BASE_URL  = `${process.env.CHATBOT_API_URL || 'https://httpbin.org'}/`;
const MOBILE    = '9000000001';
const AUTH_DIR  = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'retail_crm-auth.json');
const SNAP_FILE = path.join(__dirname, 'dom-snapshot.json');

const SEL = { mobileInput: '#phoneNumber', submitBtn: 'button[type="submit"]', otpInput: '#otp' };

function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

async function doOtpLogin(page, context) {
  console.log('\nSession expired. Doing fresh OTP login...');
  await page.locator(SEL.mobileInput).waitFor({ state: 'visible', timeout: 15_000 });
  await page.fill(SEL.mobileInput, MOBILE);
  await page.click(SEL.submitBtn);
  await page.locator(SEL.otpInput).waitFor({ state: 'visible', timeout: 20_000 });
  const otp = await prompt(`>>> OTP sent to ${MOBILE}. Enter OTP: `);
  await page.fill(SEL.otpInput, otp);
  await page.click(SEL.submitBtn);
  console.log('Waiting for login to complete...');
  await page.waitForFunction(
    () => !document.querySelector('#otp') && !document.querySelector('#phoneNumber'),
    { timeout: 15_000 }
  );
  await page.waitForLoadState('networkidle');
  await context.storageState({ path: AUTH_FILE });
  console.log('✓ New session saved.');
}

async function main() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState });
  const page    = await context.newPage();

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Re-login if session expired
  const loginVisible = await page.locator('#phoneNumber').isVisible().catch(() => false);
  if (loginVisible) {
    await doOtpLogin(page, context);
  } else {
    console.log('✓ Session still valid.');
  }

  console.log('\nInspecting DOM...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const snapshot = await page.evaluate(() => {
    function attrs(el) {
      const out = {};
      for (const a of el.attributes) out[a.name] = a.value;
      return out;
    }
    function describe(sel) {
      const els = [...document.querySelectorAll(sel)].slice(0, 5);
      return els.map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: [...el.classList].join(' ') || null,
        attrs: attrs(el),
        text: el.innerText?.trim().substring(0, 100) || null,
        visible: el.offsetParent !== null,
      }));
    }

    // Broad captures
    const inputs    = describe('input, textarea');
    const buttons   = describe('button');
    const headers   = describe('header, nav, [role="banner"]');
    const asides    = describe('aside, [class*="sidebar"], [class*="side-bar"], [class*="sidenav"]');
    const mains     = describe('main, [role="main"], [class*="chat-container"], [class*="chat-area"], [class*="message-container"]');
    const imgs      = describe('img');
    const avatars   = describe('[class*="avatar"], [class*="user-menu"], [aria-label*="profile"], [aria-label*="account"]');
    const allDivs   = describe('[class*="chat"], [class*="message"], [class*="conversation"]');

    // Full body classes for pattern analysis
    const bodyClasses = [...document.body.querySelectorAll('*')]
      .map(el => [...el.classList].join(' '))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 200);

    return { inputs, buttons, headers, asides, mains, imgs, avatars, allDivs, bodyClasses, title: document.title, url: location.href };
  });

  fs.writeFileSync(SNAP_FILE, JSON.stringify(snapshot, null, 2));
  console.log(`✓ DOM snapshot saved to ${SNAP_FILE}`);

  // Print useful summary to terminal
  console.log('\n=== TITLE ===', snapshot.title);
  console.log('=== URL ===', snapshot.url);
  console.log('\n=== INPUTS ===');
  snapshot.inputs.forEach(i => console.log(' ', i.tag, 'id=', i.id, 'class=', i.classes, 'placeholder=', i.attrs.placeholder));
  console.log('\n=== BUTTONS (first 10) ===');
  snapshot.buttons.slice(0, 10).forEach(b => console.log(' ', b.tag, 'id=', b.id, 'class=', b.classes?.substring(0,60), 'text=', b.text));
  console.log('\n=== HEADERS ===');
  snapshot.headers.forEach(h => console.log(' ', h.tag, 'class=', h.classes));
  console.log('\n=== ASIDES / SIDEBARS ===');
  snapshot.asides.forEach(a => console.log(' ', a.tag, 'class=', a.classes));
  console.log('\n=== MAIN / CHAT AREAS ===');
  snapshot.mains.forEach(m => console.log(' ', m.tag, 'class=', m.classes));
  console.log('\n=== IMAGES ===');
  snapshot.imgs.forEach(i => console.log(' ', i.tag, 'src=', i.attrs.src?.substring(0,60), 'alt=', i.attrs.alt));
  console.log('\n=== CHAT/MESSAGE DIVS (class patterns) ===');
  snapshot.allDivs.forEach(d => console.log(' ', d.tag, 'class=', d.classes?.substring(0,80)));

  await browser.close();
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
