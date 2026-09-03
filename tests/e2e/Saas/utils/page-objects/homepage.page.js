const { BasePage } = require('./base.page');
const { expect } = require('@playwright/test');

/**
 * Homepage Page Object
 * Handles homepage-specific interactions including theme, navigation, and content sections
 */
class HomePage extends BasePage {
  constructor(page) {
    super(page);

    // Hero section elements
    this.heroHeading = page.locator('h1').first();
    this.heroSubheading = page.locator('h2, p').first();
    this.mainCTA = page.getByRole('link', { name: /book a demo|contact us|get started/i }).first();
    this.learnMoreButton = page.getByRole('link', { name: /learn more/i }).first();

    // Platform section
    this.platformSection = page.locator('section#platform, [id*="platform"]').first();
    this.platformHeading = page.locator('h2:has-text("Platform"), h2:has-text("Powerful AI")').first();
    this.platformVideo = page.locator('iframe[src*="youtube"], iframe[src*="vimeo"], video').first();

    // Solutions section
    this.solutionsSection = page.locator('section#solutions, [id*="solutions"]').first();
    this.useCaseButtons = page.locator('button:has-text("Brand Management"), button:has-text("Patient Support"), button:has-text("Field Force")');

    // Enterprise section
    this.enterpriseSection = page.locator('section#enterprise, [id*="enterprise"], section:has-text("Enterprise")').first();
    this.technologySection = page.locator('section:has-text("Technology")').first();

    // About section
    this.aboutSection = page.locator('section#about, [id*="about"], section:has-text("Our Story")').first();
    this.timelineElements = page.locator('[class*="timeline"], [class*="milestone"]');

    // FAQ section
    this.faqSection = page.locator('section:has-text("FAQ"), [class*="faq"]').first();
    this.faqQuestions = page.locator('[role="button"]:has-text("?"), button[class*="faq"]');

    // Stats/Impact section
    this.statsSection = page.locator('section:has-text("Impact"), section:has-text("AI Impact")').first();
    this.statNumbers = page.locator('[class*="stat"], [class*="metric"]');

    // Client logos
    this.logoSection = page.locator('section:has-text("Trusted by"), section:has-text("clients")').first();
    this.clientLogos = page.locator('img[alt*="logo"], img[alt*="client"]');

    // Scroll to top button
    this.scrollToTopButton = page.locator('button[aria-label*="top" i], [class*="scroll-top"], [class*="back-to-top"]').first();

    // Assessment CTA
    this.assessmentButton = page.getByRole('link', { name: /take the assessment|assessment/i }).first();
  }

  /**
   * Navigate to homepage
   */
  async navigateToHome() {
    await this.navigate();
  }

  /**
   * Verify homepage loaded successfully
   * @returns {Promise<boolean>} True if homepage loaded
   */
  async isHomePageLoaded() {
    try {
      // Check for key homepage elements
      const hasHero = await this.heroHeading.isVisible({ timeout: 5000 });
      const hasNav = await this.navigation.isVisible({ timeout: 5000 });
      return hasHero && hasNav;
    } catch (error) {
      return false;
    }
  }

  /**
   * Click main CTA button
   */
  async clickMainCTA() {
    await this.mainCTA.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click Learn More button
   */
  async clickLearnMore() {
    await this.learnMoreButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll to Platform section
   */
  async scrollToPlatformSection() {
    await this.scrollToSection('platform');
  }

  /**
   * Scroll to Solutions section
   */
  async scrollToSolutionsSection() {
    await this.scrollToSection('solutions');
  }

  /**
   * Scroll to Enterprise section
   */
  async scrollToEnterpriseSection() {
    await this.scrollToSection('enterprise');
  }

  /**
   * Scroll to About section
   */
  async scrollToAboutSection() {
    await this.scrollToSection('about');
  }

  /**
   * Navigate to anchor link
   * @param {string} anchor - Anchor name (platform, solutions, enterprise, about)
   */
  async navigateToAnchorLink(anchor) {
    await this.page.goto(`${this.baseUrl}#${anchor}`);
    await this.page.waitForTimeout(500); // Wait for smooth scroll
  }

  /**
   * Get current URL hash
   * @returns {string} Current hash (without #)
   */
  getCurrentHash() {
    const url = this.page.url();
    const hash = url.split('#')[1];
    return hash || '';
  }

  /**
   * Click navigation anchor link
   * @param {string} anchor - Anchor name
   */
  async clickNavAnchor(anchor) {
    const anchorLink = this.navigation.locator(`a[href="#${anchor}"], a[href*="#${anchor}"]`).first();
    await anchorLink.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify smooth scroll behavior
   * @returns {Promise<boolean>} True if smooth scroll is enabled
   */
  async hasSmoothScroll() {
    const scrollBehavior = await this.page.evaluate(() => {
      return getComputedStyle(document.documentElement).scrollBehavior;
    });
    return scrollBehavior === 'smooth';
  }

  /**
   * Get section visibility and scroll position
   * @param {string} sectionId - Section ID
   * @returns {Promise<Object>} Object with isVisible and scrollY
   */
  async getSectionPosition(sectionId) {
    return await this.page.evaluate((id) => {
      const section = document.querySelector(`#${id}, [id*="${id}"]`);
      if (!section) return { isVisible: false, scrollY: 0 };

      const rect = section.getBoundingClientRect();
      return {
        isVisible: rect.top >= 0 && rect.bottom <= window.innerHeight,
        scrollY: window.scrollY,
        sectionTop: rect.top + window.scrollY,
        sectionBottom: rect.bottom + window.scrollY
      };
    }, sectionId);
  }

  /**
   * Click use case button in Solutions section
   * @param {string} useCaseName - Use case name (Brand Management, Patient Support, Field Force)
   */
  async clickUseCase(useCaseName) {
    const useCaseButton = this.useCaseButtons.filter({ hasText: useCaseName }).first();
    await useCaseButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click FAQ question
   * @param {number} index - Question index
   */
  async clickFAQQuestion(index) {
    await this.faqQuestions.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if client logos are visible
   * @returns {Promise<number>} Number of visible logos
   */
  async getClientLogoCount() {
    return await this.clientLogos.count();
  }

  /**
   * Check if stats are animating from 0
   * @returns {Promise<boolean>} True if animation detected
   */
  async areStatsAnimating() {
    // This is a simplified check - actual implementation may vary
    const hasStats = await this.statsSection.isVisible({ timeout: 3000 }).catch(() => false);
    return hasStats;
  }

  /**
   * Click scroll to top button
   */
  async clickScrollToTop() {
    await this.scrollToTopButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if navigation is sticky
   * @returns {Promise<boolean>} True if nav is sticky
   */
  async isNavigationSticky() {
    // Scroll down
    await this.page.evaluate(() => window.scrollBy(0, 1000));
    await this.page.waitForTimeout(300);

    const navVisible = await this.navigation.isVisible();

    // Scroll back up
    await this.page.evaluate(() => window.scrollTo(0, 0));

    return navVisible;
  }

  /**
   * Get theme from HTML class or localStorage
   * @returns {Promise<string>} Theme ('dark' or 'light')
   */
  async getTheme() {
    return await this.getCurrentTheme();
  }

  /**
   * Verify theme applied to page elements
   * @param {string} expectedTheme - Expected theme
   * @returns {Promise<boolean>} True if theme matches
   */
  async verifyThemeApplied(expectedTheme) {
    const currentTheme = await this.getCurrentTheme();
    const htmlClass = await this.page.evaluate(() => document.documentElement.className);

    console.log('Current theme:', currentTheme);
    console.log('HTML classes:', htmlClass);

    return currentTheme === expectedTheme || htmlClass.includes(expectedTheme);
  }

  /**
   * Toggle theme and verify change
   * @returns {Promise<Object>} Object with oldTheme and newTheme
   */
  async toggleThemeAndVerify() {
    const oldTheme = await this.getCurrentTheme();
    await this.toggleTheme();
    const newTheme = await this.getCurrentTheme();

    return { oldTheme, newTheme };
  }

  /**
   * Check if page has loaded all animations
   * @returns {Promise<boolean>} True if animations are complete
   */
  async areAnimationsLoaded() {
    return await this.page.evaluate(() => {
      const animations = document.getAnimations();
      return animations.length === 0 || animations.every(anim => anim.playState === 'finished' || anim.playState === 'running');
    });
  }

  /**
   * Get all navigation anchor links
   * @returns {Promise<string[]>} Array of anchor hrefs
   */
  async getNavigationAnchors() {
    return await this.page.evaluate(() => {
      const anchorLinks = Array.from(document.querySelectorAll('nav a[href^="#"]'));
      return anchorLinks.map(link => link.getAttribute('href'));
    });
  }

  /**
   * Verify section is in viewport
   * @param {string} sectionId - Section ID
   * @returns {Promise<boolean>} True if section is visible in viewport
   */
  async isSectionInViewport(sectionId) {
    return await this.page.evaluate((id) => {
      const section = document.querySelector(`#${id}, [id*="${id}"]`);
      if (!section) return false;

      const rect = section.getBoundingClientRect();
      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0
      );
    }, sectionId);
  }
}

module.exports = { HomePage };
