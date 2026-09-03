import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { HERO, FAQ, INTEGRATIONS, TIMEOUTS } from '../utils/constants.js';

/**
 * HomePage — Page Object Model for ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/
 * ---------------------------------------------------------
 * Encapsulates all locators and actions specific to the homepage.
 */
export class HomePage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
  }

  /** Open the homepage */
  async open() {
    return await this.goto('/');
  }

  // ── Hero Section ──────────────────────────────────────────────────────────

  get heroHeading() {
    // H1 is a plain element (not semantic heading role in a11y tree on this site)
    return this.page.locator('h1').filter({ hasText: HERO.headingText }).first();
  }

  get heroSubHeading() {
    // Actual text: "Deploy enterprise grade AI voice agents that handle real customer conversations..."
    return this.page.getByText(HERO.subHeadingText).first();
  }

  get heroGetStartedButton() {
    // First "Get Started" link on the page — lives inside the hero
    return this.page.getByRole('link', { name: HERO.ctaLabel }).first();
  }

  get metricCalls() {
    // Multiple elements may contain this text — take first exact metric badge
    return this.page.getByText(HERO.metrics.calls).first();
  }

  get metricLanguages() {
    // Strict mode: "15+" appears in 3 elements (badge + description paragraphs)
    return this.page.getByText(HERO.metrics.languages).first();
  }

  get metricResponse() {
    return this.page.getByText(HERO.metrics.response).first();
  }

  /** Assert all three hero metrics are visible */
  async expectMetricsVisible() {
    await expect(this.metricCalls).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.metricLanguages).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.metricResponse).toBeVisible({ timeout: TIMEOUTS.element });
  }

  /** Assert the full hero section (heading + sub-heading) is visible */
  async expectHeroVisible() {
    await expect(this.heroHeading).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.heroSubHeading).toBeVisible({ timeout: TIMEOUTS.element });
  }

  /** Click the hero "Get Started" CTA */
  async clickHeroGetStarted() {
    await expect(this.heroGetStartedButton).toBeVisible({ timeout: TIMEOUTS.element });
    await this.heroGetStartedButton.click();
  }

  // ── FAQ Section ───────────────────────────────────────────────────────────

  get faqSectionLabel() {
    return this.page
      .getByText(FAQ.sectionLabel)
      .or(this.page.getByText(/FAQ/i))
      .first();
  }

  /** Returns the first accordion question button on the page */
  get firstFaqQuestion() {
    return this.page
      .locator('button, [role="button"], summary, [data-accordion]')
      .filter({ hasText: FAQ.questionPattern })
      .first();
  }

  /** Returns the expanded answer text locator */
  get faqAnswerText() {
    return this.page
      .locator('[class*="answer"], [class*="content"], [class*="body"], details p')
      .first();
  }

  /** Scroll to FAQ section and expand the first question */
  async expandFirstFaq() {
    await this.scrollTo(this.faqSectionLabel);
    await this.scrollTo(this.firstFaqQuestion);
    await this.firstFaqQuestion.click();
  }

  // ── Integrations Section ─────────────────────────────────────────────────

  get integrationsSectionLabel() {
    return this.page
      .getByText(/integrations/i)
      .or(this.page.getByText(/works with/i))
      .first();
  }

  /** Locator for any known partner logo image — uses exact alt text (case-sensitive CSS) */
  get integrationLogos() {
    // CSS `i` flag is not reliably supported; use exact alt values confirmed from DOM inspection
    const altSelector = INTEGRATIONS.logoAlts
      .map(name => `img[alt="${name}"]`)
      .join(', ');
    return this.page.locator(altSelector);
  }

  /**
   * Scroll to integrations and assert logos exist in the DOM.
   * Uses toBeAttached() because logos live inside an overflow:hidden marquee/carousel
   * and Playwright's toBeVisible() treats clipped elements as hidden.
   */
  async expectIntegrationLogosVisible() {
    await this.scrollTo(this.integrationsSectionLabel);
    const count = await this.integrationLogos.count();
    expect(count, 'No integration logos found in DOM').toBeGreaterThan(0);
    // Verify first instance is attached (rendered in DOM, even if carousel-clipped)
    await expect(this.integrationLogos.first()).toBeAttached({ timeout: TIMEOUTS.element });
  }

  // ── UI Validation ─────────────────────────────────────────────────────────

  /**
   * Locator for the top navigation bar.
   * Site uses <nav class="fixed top-0 ..."> — no <header> element exists.
   */
  get header() {
    return this.page.locator('nav').first();
  }

  /**
   * Returns the computed CSS position value of the primary navigation element.
   * Checks <nav> first (site uses fixed nav), falls back to <header>.
   */
  async getHeaderPosition() {
    return this.page.evaluate(() => {
      const el = document.querySelector('nav') || document.querySelector('header');
      return el ? window.getComputedStyle(el).position : '';
    });
  }

  /** Returns true if the page has a horizontal scrollbar at a given viewport width */
  async hasHorizontalScroll() {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
  }

  /**
   * Returns the computed cursor style for the first element matching selector.
   * @param {string} selector
   */
  async getCursorStyle(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? window.getComputedStyle(el).cursor : '';
    }, selector);
  }

  /** Locator for the footer copyright text */
  get footerCopyright() {
    return this.footer.getByText(/©|copyright/i);
  }

  /** Locator for the favicon <link> in <head> */
  get faviconLink() {
    return this.page.locator('link[rel*="icon"]');
  }

  /** Returns all <a> elements with empty or missing href */
  async getEmptyLinks() {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .filter((a) => !a.getAttribute('href') || a.getAttribute('href').trim() === '')
        .map((a) => a.textContent.trim().slice(0, 60))
    );
  }
}
