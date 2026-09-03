import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { TIMEOUTS } from '../utils/constants.js';

/**
 * AboutPage — Page Object Model for ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/about
 * --------------------------------------------------------------
 * Encapsulates locators and actions specific to the About Us page.
 */
export class AboutPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
  }

  /** Navigate to /about */
  async open() {
    return await this.goto('/about');
  }

  // ── Page Identity ─────────────────────────────────────────────────────────

  get h1() {
    return this.page.locator('h1').first();
  }

  /** Assert the page H1 is visible and contains expected text */
  async expectH1Visible(pattern = /About Jasmine Labs/i) {
    await expect(this.h1.filter({ hasText: pattern })).toBeVisible({ timeout: TIMEOUTS.element });
  }

  // ── Content Sections ─────────────────────────────────────────────────────

  get visionSection() {
    return this.page.getByText(/Our Vision/i).first();
  }

  get whySection() {
    return this.page.getByText(/Why Jasmine Labs/i).first();
  }

  get philosophySection() {
    return this.page.getByText(/Philosophy/i).first();
  }

  // ── Value Propositions ────────────────────────────────────────────────────

  get autonomousAgentsProp() {
    return this.page.getByText(/Autonomous Voice Agents/i).first();
  }

  get seamlessIntegrationsProp() {
    return this.page.getByText(/Seamless Integrations/i).first();
  }

  get industryReadyProp() {
    return this.page.getByText(/Industry.Ready/i).first();
  }

  get actionableInsightsProp() {
    return this.page.getByText(/Actionable Insights/i).first();
  }

  /** Assert all four value propositions are visible */
  async expectValuePropsVisible() {
    await expect(this.autonomousAgentsProp).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.seamlessIntegrationsProp).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.industryReadyProp).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.actionableInsightsProp).toBeVisible({ timeout: TIMEOUTS.element });
  }

  // ── Office Locations ─────────────────────────────────────────────────────

  get indiaOffice() {
    return this.page.getByText(/Our Office in India/i).first();
  }

  get omanOffice() {
    return this.page.getByText(/Our Office in Oman/i).first();
  }

  /** Assert both office location blocks are visible */
  async expectOfficeLocationsVisible() {
    await this.scrollToBottom();
    await expect(this.indiaOffice).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(this.omanOffice).toBeVisible({ timeout: TIMEOUTS.element });
  }
}
