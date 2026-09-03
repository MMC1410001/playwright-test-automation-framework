// @ts-check
/**
 * google-auth.helper.js
 *
 * Shared Google OAuth helper for all admin test suites.
 *
 * Required env vars:
 *   GOOGLE_EMAIL    – e.g. admin@yourcompany.com
 *   GOOGLE_PASSWORD – Google account password
 *
 * Usage:
 *   const { loginWithGoogle, isAdminAuthenticated } = require('../utils/helpers/google-auth.helper');
 */

/**
 * Fill Google's two-step sign-in (email page → password page).
 * Works for both popup and same-tab redirect flows.
 *
 * @param {import('@playwright/test').Page} googlePage
 * @param {string} email
 * @param {string} password
 */
async function fillGoogleCredentials(googlePage, email, password) {
  // ── Step 1: Email ────────────────────────────────────────────────
  const emailInput = googlePage.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await emailInput.fill(email);
    await googlePage.waitForTimeout(500);

    const nextBtn = googlePage.getByRole('button', { name: /next/i }).first();
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await googlePage.waitForTimeout(2500);
    console.log('✓ Google email entered');
  }

  // ── Step 2: Password ─────────────────────────────────────────────
  const passwordInput = googlePage.locator('input[type="password"]').first();
  if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await passwordInput.fill(password);
    await googlePage.waitForTimeout(500);

    const nextBtn = googlePage.getByRole('button', { name: /next/i }).first();
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await googlePage.waitForTimeout(3000);
    console.log('✓ Google password entered');
  }
}

/**
 * Returns true when the current page is an authenticated admin dashboard.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isAdminAuthenticated(page) {
  const url = page.url();

  // Still on Google's auth pages → not authenticated
  if (url.includes('accounts.google.com')) return false;

  const hasDashboard = await page.locator(
    '[class*="dashboard"], [class*="admin"], nav a:has-text("Blog"), nav a:has-text("Categories")'
  ).first().isVisible({ timeout: 5000 }).catch(() => false);

  const hasLogout = await page.locator(
    'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")'
  ).first().isVisible({ timeout: 3000 }).catch(() => false);

  return hasDashboard || hasLogout;
}

/**
 * Full Google OAuth sign-in flow for the Saas admin panel.
 *
 * 1. Navigates to /admin
 * 2. Clicks "Sign in with Google"
 * 3. Fills credentials in the Google popup OR same-tab redirect
 * 4. Returns true when the admin dashboard is accessible
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function loginWithGoogle(page) {
  const email = process.env.GOOGLE_EMAIL;
  const password = process.env.GOOGLE_PASSWORD;

  if (!email || !password) {
    console.log('⚠ GOOGLE_EMAIL / GOOGLE_PASSWORD env vars are not set — skipping authenticated test');
    return false;
  }

  // Navigate to admin login page
  await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/admin`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });
  await page.waitForTimeout(2000);

  // Find the Google sign-in button
  const googleBtn = page.locator(
    'button:has-text("Google"), a:has-text("Google"), ' +
    '[class*="google-btn"], [class*="google-signin"], ' +
    '[data-provider="google"], img[alt*="Google"]'
  ).first();

  const hasGoogleBtn = await googleBtn.isVisible({ timeout: 8000 }).catch(() => false);
  if (!hasGoogleBtn) {
    console.log('⚠ "Sign in with Google" button not found on admin login page');
    return false;
  }

  console.log('✓ Google sign-in button found — clicking...');

  // Click and capture popup or same-tab redirect
  const popupPromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await googleBtn.click();
  const popup = await popupPromise;

  if (popup) {
    // ── Popup flow ───────────────────────────────────────────────────
    console.log('✓ Google OAuth popup opened:', popup.url());
    await popup.waitForLoadState('domcontentloaded');
    await fillGoogleCredentials(popup, email, password);

    // Wait for popup to close (redirected back to app)
    await popup.waitForEvent('close', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    // ── Same-tab redirect flow ───────────────────────────────────────
    console.log('✓ No popup detected — waiting for same-tab Google redirect');
    await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 }).catch(() => {});
    console.log('Current URL:', page.url());
    await fillGoogleCredentials(page, email, password);
    await page.waitForURL(/saas\.io/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  const authenticated = await isAdminAuthenticated(page);
  console.log('Authentication result:', authenticated ? '✅ Logged in' : '❌ Not authenticated');
  return authenticated;
}

module.exports = { loginWithGoogle, isAdminAuthenticated, fillGoogleCredentials };
