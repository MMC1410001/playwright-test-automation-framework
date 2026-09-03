const { expect } = require('@playwright/test');

/**
 * Base Page Object - Parent class for all page objects
 * Contains common functionality shared across all pages
 */
class BasePage {
  // @ts-ignore
  constructor(page) {
    this.page = page;
    this.baseUrl = `${process.env.SAAS_URL || 'https://www.saucedemo.com'}`;

    // Common locators across all pages
    this.navigation = page.getByRole('navigation').first();
    this.logo = page.locator('header img[alt*="Saas"], header img[alt*="logo"]').first();
    this.themeToggle = page.locator([
      'button[aria-label*="theme" i]',
      'button[aria-label*="mode" i]',
      'button:has(svg.lucide-moon)',
      'button:has(svg.lucide-sun)',
      'button:has(svg[data-icon="sun"])',
      'button:has(svg[data-icon="moon"])',
      '[class*="theme-toggle"]',
      '[class*="theme-switch"]',
      'button:has([class*="theme" i])'
    ].join(',')).first();
    this.contactButton = page.getByRole('link', { name: /contact|book a demo/i }).first();

    // Footer elements
    this.footer = page.locator('footer');
    this.footerLinks = page.locator('footer a');
  }

  /**
   * Navigate to a specific path
   * @param {string} path - The path to navigate to (default: '')
   */
  async navigate(path = '') {
    await this.page.goto(this.baseUrl + path, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    // Wait for network to be idle with a shorter timeout
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('Network idle timeout - continuing with test');
    });
  }

  /**
   * Click a navigation link by name
   * @param {string} linkName - The name of the link to click
   */
  async clickNavLink(linkName) {
    await this.navigation.getByRole('link', { name: linkName }).click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network idle timeout after navigation - continuing with test');
    });
  }

  /**
   * Toggle the theme (light/dark mode)
   */
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current theme from localStorage
   * @returns {Promise<string>} The current theme ('light' or 'dark')
   */
  async getCurrentTheme() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('theme') ||
        (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
  }

  /**
   * Scroll to a section by ID or selector
   * @param {string} sectionId - The section ID or selector
   */
  async scrollToSection(sectionId) {
    const selector = sectionId.startsWith('#') ? sectionId : `#${sectionId}`;
    await this.page.locator(selector).scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for an element to be visible
   * @param {string} selector - The selector for the element
   * @param {Object} options - Additional wait options
   */
  async waitForElement(selector, options = {}) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout: 5000, ...options });
  }

  /**
   * Get current URL
   * @returns {string} The current URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Get current scroll position
   * @returns {Promise<number>} The current Y scroll position
   */
  async getScrollPosition() {
    return await this.page.evaluate(() => window.scrollY);
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop() {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(300);
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if an element is visible
   * @param {string} selector - The selector for the element
   * @returns {Promise<boolean>} True if element is visible
   */
  async isElementVisible(selector) {
    try {
      return await this.page.locator(selector).isVisible({ timeout: 3000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Take a screenshot
   * @param {string} name - The name for the screenshot file
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Wait for page load to complete
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network idle timeout - continuing with test');
    });
  }

  /**
   * Click logo to return to homepage
   */
  async clickLogo() {
    await this.logo.click();
    await this.waitForPageLoad();
  }

  /**
   * Get all navigation links
   * @returns {Promise<string[]>} Array of link texts
   */
  async getNavigationLinks() {
    return await this.navigation.locator('a').allTextContents();
  }

  /**
   * Navigate using anchor link (smooth scroll)
   * @param {string} anchor - The anchor name (e.g., 'platform', 'solutions')
   */
  async navigateToAnchor(anchor) {
    const currentUrl = this.page.url();
    await this.page.goto(currentUrl.split('#')[0] + '#' + anchor);
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if page has loaded without errors
   * @returns {Promise<boolean>} True if no errors detected
   */
  async hasPageLoadedSuccessfully() {
    // Check for common error indicators
    const hasErrorMessage = await this.isElementVisible('text=/error|404|not found/i');
    const hasMainContent = await this.isElementVisible('main, [role="main"], #content');

    return !hasErrorMessage && hasMainContent;
  }
}

module.exports = { BasePage };
