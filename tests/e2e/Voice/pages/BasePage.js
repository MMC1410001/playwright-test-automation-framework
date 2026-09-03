import { expect } from '@playwright/test';
import { BASE_URL, TIMEOUTS } from '../utils/constants.js';

/**
 * BasePage
 * --------
 * Provides common page interactions shared by all Page Object Models.
 * All page classes extend this.
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  /** Navigate to any path relative to BASE_URL */
  async goto(path = '/', waitUntil = 'networkidle') {
    return await this.page.goto(`${BASE_URL}${path}`, { waitUntil, timeout: TIMEOUTS.navigation });
  }

  /** Navigate to a full URL and return the response object */
  async gotoFull(url, waitUntil = 'domcontentloaded') {
    return await this.page.goto(url, { waitUntil, timeout: TIMEOUTS.navigation });
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  /** Assert the current URL matches a pattern */
  async expectURL(pattern) {
    await expect(this.page).toHaveURL(pattern, { timeout: TIMEOUTS.element });
  }

  /** Assert the page <title> matches a pattern */
  async expectTitle(pattern) {
    await expect(this.page).toHaveTitle(pattern, { timeout: TIMEOUTS.element });
  }

  // ── Scroll helpers ───────────────────────────────────────────────────────

  /** Scroll a locator into the viewport */
  async scrollTo(locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /** Scroll to the bottom of the page */
  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // ── Header / Navigation bar ──────────────────────────────────────────────

  /** Locator for the main <nav> element */
  get navBar() {
    return this.page.getByRole('navigation');
  }

  /** Click a link inside the top navigation bar by its visible label */
  async clickNavLink(label) {
    const link = this.navBar.getByRole('link', { name: label });
    await expect(link).toBeVisible({ timeout: TIMEOUTS.element });
    await link.click();
  }

  /**
   * Locator for the site logo anchor.
   * Site has no <header> element — logo is an <a> wrapping <img alt="Jasmine Labs">
   * with href=`${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/` (full URL with trailing slash).
   */
  get logoLink() {
    return this.page.locator('a:has(img[alt="Jasmine Labs"])').first();
  }

  /** Click the site logo */
  async clickLogo() {
    await expect(this.logoLink).toBeVisible({ timeout: TIMEOUTS.element });
    await this.logoLink.click();
  }

  // ── Footer ───────────────────────────────────────────────────────────────

  /** Locator for the page <footer> element */
  get footer() {
    return this.page.locator('footer');
  }

  /** Scroll the footer into view */
  async scrollToFooter() {
    await this.footer.scrollIntoViewIfNeeded();
  }

  /** Click a link inside the footer by its visible label */
  async clickFooterLink(label) {
    await this.scrollToFooter();
    const link = this.footer.getByRole('link', { name: label });
    await expect(link).toBeVisible({ timeout: TIMEOUTS.element });
    await link.click();
  }
}
