import { expect } from '@playwright/test';
import { BASE_URL, IGNORED_CONSOLE_ERRORS, TIMEOUTS } from '../utils/constants.js';

/**
 * NavigationHelper
 * ----------------
 * Reusable helper functions for navigation assertions and page diagnostics.
 * Imported directly into test files — not a class, just plain functions.
 */

/**
 * Attach console-error and pageerror listeners before navigating.
 * Returns a getter for collected critical errors.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {{ getCriticalErrors: () => string[] }}
 */
export function attachConsoleErrorListener(page) {
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return {
    getCriticalErrors: () =>
      errors.filter((e) => !IGNORED_CONSOLE_ERRORS.some((ignored) => e.includes(ignored))),
  };
}

/**
 * Navigate to the given path and assert the URL matches the expected pattern.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path           - e.g. '/about'
 * @param {RegExp|string} pattern - URL pattern to assert after navigation
 */
export async function navigateAndAssertURL(page, path, pattern) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.navigation });
  await expect(page).toHaveURL(pattern, { timeout: TIMEOUTS.element });
}

/**
 * Click an element and assert the resulting URL matches the expected pattern.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {import('@playwright/test').Page}    page
 * @param {RegExp|string}                      urlPattern
 */
export async function clickAndAssertURL(locator, page, urlPattern) {
  await expect(locator).toBeVisible({ timeout: TIMEOUTS.element });
  await locator.click();
  await expect(page).toHaveURL(urlPattern, { timeout: TIMEOUTS.element });
}

/**
 * Check all <img> elements on the current page.
 * Returns an array of src strings for images that failed to load.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
export async function getBrokenImages(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.src)
  );
}

/**
 * Assert that the page HTTP response status is successful (< 400).
 *
 * @param {import('@playwright/test').Response} response
 */
export function assertSuccessfulResponse(response) {
  expect(
    response.status(),
    `Expected HTTP status < 400 but got ${response.status()}`
  ).toBeLessThan(400);
}
