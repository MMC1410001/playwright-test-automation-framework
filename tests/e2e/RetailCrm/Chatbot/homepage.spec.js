/**
 * RetailCrm Chatbot — Homepage UI Validation
 *
 * Prerequisites:
 *   Run the auth setup ONCE before executing these tests:
 *     node tests/e2e/RetailCrm/Chatbot/auth.setup.js
 *
 * Run tests:
 *   npx playwright test tests/e2e/RetailCrm/Chatbot/homepage.spec.js
 *   npm run retail_crm:homepage
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL  = `${process.env.CHATBOT_API_URL || 'https://httpbin.org'}/`;
const AUTH_FILE = path.join(__dirname, '.auth', 'retail_crm-auth.json');

// ── Selectors (verified against live DOM via dom-inspect.js) ─────────────────
const SEL = {
  logo:         'img[alt="RetailCrm Opus"]',
  sidebar:      '[class*="flex-shrink-0"][class*="flex-col"][class*="border-r"]',
  newChatBtn:   'button:has-text("New Chat")',
  chatMessages: '[class*="overflow-y-auto"][class*="overflow-x-hidden"]',
  chatInput:    'textarea[placeholder="Message RetailCrm Opus Assistant..."]',
  sendBtn:      'button[class*="bg-white"][class*="hover:bg-gray-100"]',
  userAvatar:   '[class*="bg-green-600"][class*="rounded-full"]',
  botBubble:    '[class*="bg-transparent"][class*="rounded-2xl"]',
};

// ── Session + per-file timeout ───────────────────────────────────────────────
test.use({
  storageState: AUTH_FILE,
  // Raise the per-test timeout — the app is an SPA with SSE that slows cold loads
  actionTimeout: 45_000,
});

/**
 * Navigate to BASE_URL and wait until the chat textarea is visible.
 * Uses waitUntil:'commit' so goto returns as soon as the HTTP response begins,
 * avoiding hangs caused by the app's streaming/SSE connections that prevent
 * the default 'load' event from firing quickly under parallel load.
 */
async function waitForChatReady(page) {
  await page.goto(BASE_URL, { waitUntil: 'commit' });
  await page.locator(SEL.chatInput).waitFor({ state: 'visible', timeout: 45_000 });
}

test.beforeEach(async ({ page }) => {
  await waitForChatReady(page);

  const loginVisible = await page.locator('#phoneNumber').isVisible({ timeout: 2_000 }).catch(() => false);
  if (loginVisible) {
    throw new Error('Session expired — re-run: node tests/e2e/RetailCrm/Chatbot/auth.setup.js');
  }
});

// ── 1. Page Load & Authentication ─────────────────────────────────────────────
test.describe('Page load and authentication', () => {

  test('HP-01: Page title is "RetailCrm Opus Chatbot"', async ({ page }) => {
    // Page already loaded by beforeEach — just assert title
    expect(await page.title()).toBe('RetailCrm Opus Chatbot');
  });

  test('HP-02: User is authenticated — login fields are not shown', async ({ page }) => {
    await expect(page.locator('#phoneNumber')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#otp')).not.toBeVisible({ timeout: 5_000 });
  });

  test('HP-03: URL contains /chat (redirected from root after login)', async ({ page }) => {
    expect(page.url()).toContain('https://www.saucedemo.com');
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/auth');
  });

});

// ── 2. Branding ───────────────────────────────────────────────────────────────
test.describe('Branding', () => {

  test('HP-04: RetailCrm Opus logo is visible in the sidebar', async ({ page }) => {
    await expect(page.locator(SEL.logo).first()).toBeVisible();
  });

  test('HP-05: Logo image loads without error (naturalWidth > 0)', async ({ page }) => {
    const logo = page.locator(SEL.logo).first();
    await expect(logo).toBeVisible();
    const naturalWidth = await logo.evaluate(el => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('HP-06: Logo src attribute contains "logo"', async ({ page }) => {
    const src = await page.locator(SEL.logo).first().getAttribute('src');
    expect(src).toContain('logo');
  });

});

// ── 3. Chat Input Area ────────────────────────────────────────────────────────
test.describe('Chat input area', () => {

  test('HP-07: Chat textarea is visible', async ({ page }) => {
    await expect(page.locator(SEL.chatInput)).toBeVisible();
  });

  test('HP-08: Chat textarea is enabled and editable', async ({ page }) => {
    const input = page.locator(SEL.chatInput);
    await expect(input).toBeEnabled();
    await expect(input).not.toHaveAttribute('disabled');
    await expect(input).not.toHaveAttribute('readonly');
  });

  test('HP-09: Chat textarea placeholder reads "Message RetailCrm Opus Assistant..."', async ({ page }) => {
    await expect(page.locator(SEL.chatInput))
      .toHaveAttribute('placeholder', 'Message RetailCrm Opus Assistant...');
  });

  test('HP-10: Chat textarea accepts typed text', async ({ page }) => {
    const input = page.locator(SEL.chatInput);
    await input.fill('Hello, this is a test');
    await expect(input).toHaveValue('Hello, this is a test');
    // No cleanup — beforeEach navigates fresh for each test
  });

  test('HP-11: Chat textarea receives focus', async ({ page }) => {
    const input = page.locator(SEL.chatInput);
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('HP-12: Send button is visible in the input toolbar', async ({ page }) => {
    await expect(page.locator(SEL.sendBtn)).toBeVisible();
  });

  test('HP-13: Send button is disabled when textarea is empty', async ({ page }) => {
    // Ensure empty on load
    await expect(page.locator(SEL.chatInput)).toHaveValue('');
    await expect(page.locator(SEL.sendBtn)).toBeDisabled();
  });

  test('HP-14: Send button becomes enabled when text is typed', async ({ page }) => {
    await page.locator(SEL.chatInput).fill('Test message');
    await expect(page.locator(SEL.sendBtn)).toBeEnabled();
  });

  test('HP-15: Pressing Enter sends the message and clears the textarea', async ({ page }) => {
    const input = page.locator(SEL.chatInput);
    await input.fill('Automated test ping ' + Date.now());
    await input.press('Enter');
    await expect(input).toHaveValue('', { timeout: 8_000 });
  });

  test('HP-16: Textarea maxlength is 2000 characters', async ({ page }) => {
    await expect(page.locator(SEL.chatInput)).toHaveAttribute('maxlength', '2000');
  });

});

// ── 4. Chat Message Area ──────────────────────────────────────────────────────
test.describe('Chat message area', () => {

  test('HP-17: Chat messages scroll container is visible', async ({ page }) => {
    await expect(page.locator(SEL.chatMessages).first()).toBeVisible();
  });

  test('HP-18: Sent message appears as a user bubble in the chat area', async ({ page }) => {
    const input = page.locator(SEL.chatInput);
    // User message bubbles have rounded-tr-none (right-aligned, corner cut)
    const userBubble = page.locator('[class*="rounded-tr-none"]');

    await input.fill('UI automation test ' + Date.now());
    await input.press('Enter');

    // Textarea clears and a user bubble appears
    await expect(input).toHaveValue('', { timeout: 8_000 });
    await expect(userBubble.last()).toBeVisible({ timeout: 10_000 });
  });

  test('HP-19: Bot response bubble appears after sending a message', async ({ page }) => {
    test.setTimeout(120_000); // Real AI round-trip needs more than the default 60 s

    const input = page.locator(SEL.chatInput);
    await input.fill('Hello');
    await input.press('Enter');

    // User bubble appears first; bot bubble is bg-transparent + rounded-2xl
    // Wait up to 90 s for the bot to reply
    await expect(page.locator(SEL.botBubble).first()).toBeVisible({ timeout: 90_000 });
  });

});

// ── 5. Sidebar & Navigation ───────────────────────────────────────────────────
test.describe('Sidebar and navigation', () => {

  test('HP-20: Sidebar panel is attached to the DOM', async ({ page }) => {
    await expect(page.locator(SEL.sidebar).first()).toBeAttached();
  });

  test('HP-21: "New Chat" button is visible in the sidebar', async ({ page }) => {
    await expect(page.locator(SEL.newChatBtn)).toBeVisible();
  });

  test('HP-22: Clicking "New Chat" shows an empty textarea', async ({ page }) => {
    const input   = page.locator(SEL.chatInput);
    const newChat = page.locator(SEL.newChatBtn);

    // Click New Chat — starts a fresh conversation regardless of current state
    await newChat.click();
    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(input).toHaveValue('');
  });

  test('HP-23: Collapse sidebar button is present (desktop layout)', async ({ page }) => {
    await expect(page.locator('button[title="Collapse sidebar"]')).toBeAttached();
  });

});

// ── 6. User Profile ───────────────────────────────────────────────────────────
test.describe('User profile', () => {

  test('HP-24: User avatar (green circle) is visible in the sidebar', async ({ page }) => {
    await expect(page.locator(SEL.userAvatar).first()).toBeVisible();
  });

});

// ── 7. Accessibility ──────────────────────────────────────────────────────────
test.describe('Accessibility', () => {

  test('HP-25: Page title is "RetailCrm Opus Chatbot"', async ({ page }) => {
    expect(await page.title()).toBe('RetailCrm Opus Chatbot');
  });

  test('HP-26: Chat textarea has a non-empty placeholder', async ({ page }) => {
    const placeholder = await page.locator(SEL.chatInput).getAttribute('placeholder');
    expect(placeholder?.length).toBeGreaterThan(0);
  });

  test('HP-27: Logo image has a non-empty alt attribute', async ({ page }) => {
    const alt = await page.locator(SEL.logo).first().getAttribute('alt');
    expect(alt?.length).toBeGreaterThan(0);
  });

});

// ── 8. Layout & Responsive ────────────────────────────────────────────────────
test.describe('Layout and responsive behaviour', () => {

  test('HP-28: No horizontal scrollbar at 1280×800 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await waitForChatReady(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('HP-29: Chat textarea visible at 768px width (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForChatReady(page);
    await expect(page.locator(SEL.chatInput)).toBeVisible();
  });

});
