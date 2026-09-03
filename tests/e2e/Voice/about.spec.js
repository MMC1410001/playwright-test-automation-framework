import { test, expect } from '@playwright/test';

// Page Object Models
import { AboutPage } from './pages/AboutPage.js';

// Helpers
import { getBrokenImages, assertSuccessfulResponse } from './helpers/navigationHelper.js';
import { getH1Count, getHTMLLang, getMissingAriaLandmarks } from './helpers/accessibilityHelper.js';
import { getMetaDescription } from './helpers/seoHelper.js';

// Constants
import { BASE_URL, ABOUT, TIMEOUTS, ROUTES, FOOTER, NAV } from './utils/constants.js';

/**
 * ============================================================
 * MANUAL TEST CASES — Jasmine Labs About Page (/about)
 * ============================================================
 *
 * TC-048 | About page loads with HTTP 200
 *   Steps    : 1. Navigate to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/about
 *   Expected : HTTP status < 400
 *
 * TC-049 | H1 "About Jasmine Labs" is visible
 *   Steps    : 1. Open /about
 *   Expected : <h1> containing "About Jasmine Labs" is visible
 *
 * TC-050 | "Our Vision" section is visible
 *   Steps    : 1. Open /about  2. Scroll down
 *   Expected : Heading or section text "Our Vision" is visible
 *
 * TC-051 | "Why Jasmine Labs" section with 4 value propositions visible
 *   Steps    : 1. Open /about  2. Scroll to Why section
 *   Expected : Autonomous Voice Agents, Seamless Integrations,
 *              Industry-Ready, Actionable Insights all visible
 *
 * TC-052 | Office locations section shows India and Oman offices
 *   Steps    : 1. Open /about  2. Scroll to footer area
 *   Expected : "Our Office in India" and "Our Office in Oman" visible
 *
 * TC-053 | Header navigation links work from About page
 *   Steps    : 1. Open /about  2. Click "Blogs" nav link
 *   Expected : Navigates to /resources
 *
 * TC-054 | Footer "Contact" link navigates to /contact
 *   Steps    : 1. Open /about  2. Click Contact in footer
 *   Expected : URL changes to /contact
 *
 * TC-055 | No broken images on About page
 *   Steps    : 1. Open /about  2. Check all <img> naturalWidth
 *   Expected : All images loaded (naturalWidth > 0)
 *
 * TC-056 | About page accessibility — single H1, lang set, landmarks present
 *   Steps    : 1. Open /about  2. Inspect DOM
 *   Expected : Exactly 1 <h1>, html[lang] set, nav/main/footer present
 * ============================================================
 */

test.describe('Jasmine Labs — About Page', () => {

  // ─── TC-048 ──────────────────────────────────────────────────────────────
  test('TC-048 | About page loads with HTTP 200', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    const response = await aboutPage.gotoFull(`${BASE_URL}${ROUTES.about}`, 'domcontentloaded');

    assertSuccessfulResponse(response);
    await expect(page).toHaveURL(/\/about/);
  });

  // ─── TC-049 ──────────────────────────────────────────────────────────────
  test('TC-049 | H1 "About Jasmine Labs" is visible', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await expect(
      aboutPage.h1.filter({ hasText: ABOUT.h1Text })
    ).toBeVisible({ timeout: TIMEOUTS.element });
  });

  // ─── TC-050 ──────────────────────────────────────────────────────────────
  test('TC-050 | "Our Vision" section is visible', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await aboutPage.scrollTo(aboutPage.visionSection);
    await expect(aboutPage.visionSection).toBeVisible({ timeout: TIMEOUTS.element });
  });

  // ─── TC-051 ──────────────────────────────────────────────────────────────
  test('TC-051 | "Why Jasmine Labs" — 4 value propositions visible', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await aboutPage.scrollTo(aboutPage.whySection);
    await aboutPage.expectValuePropsVisible();
  });

  // ─── TC-052 ──────────────────────────────────────────────────────────────
  test('TC-052 | Office locations — India and Oman sections visible', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await aboutPage.expectOfficeLocationsVisible();
  });

  // ─── TC-053 ──────────────────────────────────────────────────────────────
  test('TC-053 | Header "Blogs" nav link navigates to /resources', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    const blogsLink = aboutPage.navBar.getByRole('link', { name: NAV.blogs });
    await expect(blogsLink).toBeVisible({ timeout: TIMEOUTS.element });
    await blogsLink.click();
    await expect(page).toHaveURL(/\/resources/);
  });

  // ─── TC-054 ──────────────────────────────────────────────────────────────
  test('TC-054 | Footer "Contact" link navigates to /contact', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await aboutPage.clickFooterLink(FOOTER.contact);
    await expect(page).toHaveURL(/\/contact/);
  });

  // ─── TC-055 ──────────────────────────────────────────────────────────────
  test('TC-055 | No broken images on About page', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    const broken = await getBrokenImages(page);
    expect(
      broken,
      `Broken images:\n${broken.join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-056 ──────────────────────────────────────────────────────────────
  test('TC-056 | About page accessibility — H1 count, lang, ARIA landmarks', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    // Single H1
    const h1Count = await getH1Count(page);
    expect(h1Count, `Expected 1 <h1>, found ${h1Count}`).toBe(1);

    // HTML lang attribute
    const lang = await getHTMLLang(page);
    expect(lang, 'html[lang] missing on About page').not.toBe('');

    // ARIA landmarks
    const missing = await getMissingAriaLandmarks(page);
    expect(
      missing,
      `Missing ARIA landmarks on About page: ${missing.join(', ')}`
    ).toHaveLength(0);
  });

  // ─── TC-057 ──────────────────────────────────────────────────────────────
  test('TC-057 | About page has a meta description', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    const desc = await getMetaDescription(page);
    expect(desc, 'About page missing meta description').not.toBe('');
  });
});
