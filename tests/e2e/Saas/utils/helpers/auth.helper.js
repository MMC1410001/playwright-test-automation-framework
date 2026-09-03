/**
 * Authentication Helper
 * Provides utilities for admin authentication and session management
 */

/**
 * Load admin credentials from fixture file
 * @returns {Object} Admin credentials
 */
function loadAdminCredentials() {
  try {
    const credentials = require('../fixtures/admin-credentials.json');
    return credentials;
  } catch (error) {
    console.warn('Admin credentials file not found. Using default credentials.');
    return {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'password123'
    };
  }
}

/**
 * Setup admin authentication state
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} credentials - Admin credentials
 */
// @ts-ignore
async function setupAdminAuth(page, credentials = null) {
  const creds = credentials || loadAdminCredentials();

  // Navigate to login page
  await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/admin/login`);

  // Fill in credentials
  // @ts-ignore
  await page.fill('input[type="email"]', creds.email);
  // @ts-ignore
  await page.fill('input[type="password"]', creds.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForLoadState('networkidle');

  // Verify login was successful
  const isLoggedIn = await page.locator('nav a:has-text("Dashboard")').isVisible().catch(() => false);

  if (!isLoggedIn) {
    throw new Error('Admin authentication failed');
  }

  return true;
}

/**
 * Setup admin authentication using cookies
 * @param {import('@playwright/test').BrowserContext} context - Browser context
 * @param {Object} authState - Authentication state with cookies/tokens
 */
async function setupAdminAuthWithCookies(context, authState) {
  // @ts-ignore
  if (authState.cookies) {
    // @ts-ignore
    await context.addCookies(authState.cookies);
  }

  // @ts-ignore
  if (authState.localStorage) {
    // Set localStorage items if needed
    await context.addInitScript((storage) => {
      for (const [key, value] of Object.entries(storage)) {
        localStorage.setItem(key, value);
      }
      // @ts-ignore
    }, authState.localStorage);
  }
}

/**
 * Save authentication state for reuse
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} Authentication state
 */
async function saveAuthState(page) {
  const cookies = await page.context().cookies();

  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        // @ts-ignore
        items[key] = window.localStorage.getItem(key);
      }
    }
    return items;
  });

  return {
    cookies,
    localStorage
  };
}

/**
 * Clear authentication state
 * @param {import('@playwright/test').BrowserContext} context - Browser context
 */
async function clearAuthState(context) {
  await context.clearCookies();
  await context.clearPermissions();
}

/**
 * Check if user is authenticated
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated(page) {
  try {
    // Check for auth token in localStorage
    const hasAuthToken = await page.evaluate(() => {
      return !!(localStorage.getItem('auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('access_token'));
    });

    // Check for auth cookies
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(cookie =>
      cookie.name.includes('auth') ||
      cookie.name.includes('session') ||
      cookie.name.includes('token')
    );

    return hasAuthToken || hasAuthCookie;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for authentication redirect
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForAuthRedirect(page, timeout = 10000) {
  await page.waitForURL(url =>
    url.pathname.includes('/dashboard') ||
    url.pathname.includes('/admin'),
    { timeout }
  );
}

/**
 * Login with Google OAuth
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} googleCreds - Google credentials
 */
async function loginWithGoogle(page, googleCreds) {
  // Click Google login button
  await page.click('button:has-text("Sign in with Google")');

  // Wait for Google popup
  const [googlePage] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('button:has-text("Sign in with Google")')
  ]);

  // Fill Google credentials
  // @ts-ignore
  await googlePage.fill('input[type="email"]', googleCreds.email);
  await googlePage.click('button:has-text("Next")');
  await googlePage.waitForTimeout(1000);

  // @ts-ignore
  await googlePage.fill('input[type="password"]', googleCreds.password);
  await googlePage.click('button:has-text("Next")');

  // Wait for redirect back to main page
  await page.waitForLoadState('networkidle');

  return true;
}

/**
 * Login with Microsoft OAuth
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} microsoftCreds - Microsoft credentials
 */
async function loginWithMicrosoft(page, microsoftCreds) {
  // Click Microsoft login button
  await page.click('button:has-text("Sign in with Microsoft")');

  // Wait for Microsoft popup
  const [microsoftPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('button:has-text("Sign in with Microsoft")')
  ]);

  // Fill Microsoft credentials
  // @ts-ignore
  await microsoftPage.fill('input[type="email"]', microsoftCreds.email);
  await microsoftPage.click('input[type="submit"]');
  await microsoftPage.waitForTimeout(1000);

  // @ts-ignore
  await microsoftPage.fill('input[type="password"]', microsoftCreds.password);
  await microsoftPage.click('input[type="submit"]');

  // Wait for redirect back to main page
  await page.waitForLoadState('networkidle');

  return true;
}

/**
 * Generate test user credentials
 * @param {string} prefix - Username prefix
 * @returns {Object} Test user credentials
 */
function generateTestUserCredentials(prefix = 'testuser') {
  const timestamp = Date.now();
  return {
    email: `${prefix}_${timestamp}@test.com`,
    password: `Test@${timestamp}`,
    name: `Test User ${timestamp}`
  };
}

module.exports = {
  loadAdminCredentials,
  setupAdminAuth,
  setupAdminAuthWithCookies,
  saveAuthState,
  clearAuthState,
  isAuthenticated,
  waitForAuthRedirect,
  loginWithGoogle,
  loginWithMicrosoft,
  generateTestUserCredentials
};
