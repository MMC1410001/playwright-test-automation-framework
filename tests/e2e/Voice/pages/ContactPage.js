import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { TIMEOUTS } from '../utils/constants.js';

/**
 * ContactPage — Page Object Model for ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/contact
 * ------------------------------------------------------------------
 * Encapsulates locators and actions for the Contact / Get Started form.
 */
export class ContactPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
  }

  /** Navigate to /contact */
  async open() {
    return await this.goto('/contact');
  }

  // ── Page Identity ─────────────────────────────────────────────────────────

  get h1() {
    return this.page.locator('h1').first();
  }

  // ── Form Container ────────────────────────────────────────────────────────

  get form() {
    return this.page.locator('form').first();
  }

  // ── Form Fields ───────────────────────────────────────────────────────────

  get nameInput() {
    return this.page
      .locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]')
      .first();
  }

  get emailInput() {
    return this.page
      .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
      .first();
  }

  get phoneInput() {
    return this.page
      .locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]')
      .first();
  }

  get serviceSelect() {
    // Could be a <select> or a custom dropdown
    return this.page.locator('select').first();
  }

  get companyInput() {
    return this.page
      .locator('input[name="company"], input[placeholder*="company" i]')
      .first();
  }

  get messageTextarea() {
    return this.page.locator('textarea').first();
  }

  get submitButton() {
    return this.page
      .getByRole('button', { name: /send message/i })
      .or(this.page.locator('button[type="submit"]'))
      .first();
  }

  // ── Service Dropdown Helpers ─────────────────────────────────────────────

  /** Returns all <option> text values from the service <select> */
  async getServiceOptions() {
    return this.page.evaluate(() => {
      const sel = document.querySelector('select');
      if (!sel) return [];
      return Array.from(sel.options).map((o) => o.text.trim()).filter(Boolean);
    });
  }

  // ── Form Actions ──────────────────────────────────────────────────────────

  /** Fill the entire contact form with the provided data */
  async fillForm({ name, email, phone, service, company, message } = {}) {
    if (name)    await this.nameInput.fill(name);
    if (email)   await this.emailInput.fill(email);
    if (phone)   await this.phoneInput.fill(phone);
    if (service) await this.serviceSelect.selectOption({ label: service });
    if (company) await this.companyInput.fill(company);
    if (message) await this.messageTextarea.fill(message);
  }

  /** Submit the form by clicking the submit button */
  async submit() {
    await expect(this.submitButton).toBeVisible({ timeout: TIMEOUTS.element });
    await this.submitButton.click();
  }

  /**
   * Returns HTML5 validation message for an input.
   * Empty string means the input is valid or no constraint set.
   *
   * @param {import('@playwright/test').Locator} inputLocator
   * @returns {Promise<string>}
   */
  async getValidationMessage(inputLocator) {
    return inputLocator.evaluate((el) => el.validationMessage || '');
  }

  /** Returns true if the form element has the HTML5 :invalid pseudo-class */
  async isInvalid(inputLocator) {
    return inputLocator.evaluate((el) => !el.validity.valid);
  }
}
