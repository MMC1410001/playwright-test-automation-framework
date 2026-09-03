import { test, expect } from '@playwright/test';

// Page Object Models
import { HomePage } from './pages/HomePage.js';

// Helpers
import {
  attachConsoleErrorListener,
  clickAndAssertURL,
  getBrokenImages,
  assertSuccessfulResponse,
} from './helpers/navigationHelper.js';

import {
  getNavigationTimings,
  getFirstContentfulPaint,
  getLargestContentfulPaint,
  attachRequestCounter,
} from './helpers/performanceHelper.js';

import {
  isHTTPS,
  getResponseHeaders,
  getMixedContentUrls,
  getUnsafeExternalLinks,
  detectExposedSecrets,
  getCookiesMissingSameSite,
} from './helpers/securityHelper.js';

import {
  getImagesWithoutAlt,
  getH1Count,
  getHTMLLang,
  getMissingAriaLandmarks,
  getLinksWithPoorText,
  getInputsWithoutLabel,
  getPositiveTabindexElements,
} from './helpers/accessibilityHelper.js';

import {
  getMetaDescription,
  getOgTag,
  getCanonicalUrl,
  getRobotsMeta,
  getJsonLdScripts,
} from './helpers/seoHelper.js';

// Constants
import {
  BASE_URL,
  ROUTES,
  NAV,
  FOOTER,
  TIMEOUTS,
  PERFORMANCE,
  VIEWPORTS,
  SECURITY,
  A11Y,
  SEO,
} from './utils/constants.js';

/**
 * ============================================================
 * MANUAL TEST CASES — Jasmine Labs Homepage (${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/)
 * ============================================================
 *
 * TC-001 | Page Load & Title Verification
 *   Precondition : Internet access available
 *   Steps        : 1. Open ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/ in browser
 *   Expected     : Page loads (HTTP 200), title contains "Jasmine"
 *
 * TC-002 | Hero Section — Headline & Sub-headline Visible
 *   Steps        : 1. Open homepage, scroll to top
 *   Expected     : Heading "Voice AI Agents That Listen" is visible
 *                  Sub-headline text about enterprise-grade AI voice agents is visible
 *
 * TC-003 | Hero Section — Key Metrics Displayed
 *   Steps        : 1. Open homepage
 *   Expected     : "45M+" calls/month, "15+" languages, "500ms" response time metrics visible
 *
 * TC-004 | Hero CTA Button — "Get Started" navigates to /contact
 *   Steps        : 1. Click "Get Started" button in the hero section
 *   Expected     : URL changes to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/contact
 *
 * TC-005 | Header Navigation — Blogs link navigates to /resources
 *   Steps        : 1. Click "Blogs" in the top navigation
 *   Expected     : URL changes to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/resources
 *
 * TC-006 | Header Navigation — About Us link navigates to /about
 *   Steps        : 1. Click "About Us" in the top navigation
 *   Expected     : URL changes to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/about
 *
 * TC-007 | Header "Get Started" button navigates to /contact
 *   Steps        : 1. Click the "Get Started" button in the header nav bar
 *   Expected     : URL changes to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/contact
 *
 * TC-008 | Logo — Clicking logo returns to homepage
 *   Steps        : 1. Navigate to /about, then click the header logo
 *   Expected     : URL returns to ${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}/
 *
 * TC-009 | FAQ Section — Accordion expand/collapse
 *   Steps        : 1. Scroll to FAQ section
 *                  2. Click the first FAQ question
 *   Expected     : Answer text expands/becomes visible
 *
 * TC-010 | Integrations Section — Partner logos visible
 *   Steps        : 1. Scroll to integrations section
 *   Expected     : Integration logos (Twilio, WhatsApp, etc.) are visible in viewport
 *
 * TC-011 | Footer — Privacy Policy link navigates correctly
 *   Steps        : 1. Click "Privacy Policy" in the footer
 *   Expected     : URL contains /privacy
 *
 * TC-012 | Footer — Terms of Service link navigates correctly
 *   Steps        : 1. Click "Terms of Service" in the footer
 *   Expected     : URL contains /terms
 *
 * TC-013 | Footer — About Us quick link works
 *   Steps        : 1. Click "About Us" in footer Quick Links
 *   Expected     : Navigates to /about page
 *
 * TC-014 | No broken images on homepage
 *   Steps        : 1. Open homepage, check all <img> tags
 *   Expected     : All images have naturalWidth > 0 (loaded successfully)
 *
 * TC-015 | No critical console errors on page load
 *   Steps        : 1. Open homepage and observe browser console
 *   Expected     : No JS exceptions in the console
 * ============================================================
 */

test.describe('Jasmine Labs — Homepage Test Suite', () => {

  // ─── TC-001 ──────────────────────────────────────────────────────────────
  test('TC-001 | Page load & title verification', async ({ page }) => {
    const homePage = new HomePage(page);
    const response = await homePage.gotoFull(BASE_URL, 'domcontentloaded');

    assertSuccessfulResponse(response);
    await homePage.expectTitle(/jasmine/i);
  });

  // ─── TC-002 ──────────────────────────────────────────────────────────────
  test('TC-002 | Hero section — headline and sub-headline visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.expectHeroVisible();
  });

  // ─── TC-003 ──────────────────────────────────────────────────────────────
  test('TC-003 | Hero section — key metrics are displayed', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.expectMetricsVisible();
  });

  // ─── TC-004 ──────────────────────────────────────────────────────────────
  test('TC-004 | Hero CTA "Get Started" navigates to /contact', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.clickHeroGetStarted();
    await homePage.expectURL(/\/contact/);
  });

  // ─── TC-005 ──────────────────────────────────────────────────────────────
  test('TC-005 | Header nav — Blogs link navigates to /resources', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const blogsLink = homePage.navBar.getByRole('link', { name: NAV.blogs });
    await clickAndAssertURL(blogsLink, page, /\/resources/);
  });

  // ─── TC-006 ──────────────────────────────────────────────────────────────
  test('TC-006 | Header nav — About Us link navigates to /about', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const aboutLink = homePage.navBar.getByRole('link', { name: NAV.aboutUs });
    await clickAndAssertURL(aboutLink, page, /\/about/);
  });

  // ─── TC-007 ──────────────────────────────────────────────────────────────
  test('TC-007 | Header nav — "Get Started" button navigates to /contact', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const navGetStarted = homePage.navBar.getByRole('link', { name: NAV.getStarted });
    await clickAndAssertURL(navGetStarted, page, /\/contact/);
  });

  // ─── TC-008 ──────────────────────────────────────────────────────────────
  test('TC-008 | Logo — clicking logo returns to homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto(ROUTES.about, 'domcontentloaded');

    await homePage.clickLogo();
    await homePage.expectURL(new RegExp(`^${BASE_URL}/?$`));
  });

  // ─── TC-009 ──────────────────────────────────────────────────────────────
  test('TC-009 | FAQ section — accordion expands on click', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.expandFirstFaq();
    await expect(homePage.faqAnswerText).toBeVisible({ timeout: TIMEOUTS.animation });
  });

  // ─── TC-010 ──────────────────────────────────────────────────────────────
  test('TC-010 | Integrations section — partner logos visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.expectIntegrationLogosVisible();
  });

  // ─── TC-011 ──────────────────────────────────────────────────────────────
  test('TC-011 | Footer — Privacy Policy link navigates to /privacy', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.clickFooterLink(FOOTER.privacyPolicy);
    await homePage.expectURL(/\/privacy/);
  });

  // ─── TC-012 ──────────────────────────────────────────────────────────────
  test('TC-012 | Footer — Terms of Service link navigates to /terms', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.clickFooterLink(FOOTER.termsOfService);
    await homePage.expectURL(/\/terms/);
  });

  // ─── TC-013 ──────────────────────────────────────────────────────────────
  test('TC-013 | Footer — About Us quick link navigates to /about', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.clickFooterLink(FOOTER.aboutUs);
    await homePage.expectURL(/\/about/);
  });

  // ─── TC-014 ──────────────────────────────────────────────────────────────
  test('TC-014 | No broken images on homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const brokenImages = await getBrokenImages(page);
    expect(
      brokenImages,
      `Broken images found:\n${brokenImages.join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-015 ──────────────────────────────────────────────────────────────
  test('TC-015 | No critical console errors on page load', async ({ page }) => {
    const { getCriticalErrors } = attachConsoleErrorListener(page);

    const homePage = new HomePage(page);
    await homePage.open();

    const jsErrors = getCriticalErrors();
    expect(
      jsErrors,
      `Critical console errors:\n${jsErrors.join('\n')}`
    ).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UI VALIDATION TESTS  (TC-016 → TC-022)
// ════════════════════════════════════════════════════════════════════════════

/**
 * TC-016 | Header is sticky — remains visible after scrolling to bottom
 *   Steps    : 1. Open homepage  2. Scroll to page bottom
 *   Expected : <header> element has position: sticky or fixed
 *
 * TC-017 | CTA buttons have pointer cursor (interactive styling)
 *   Steps    : 1. Open homepage  2. Inspect computed cursor on "Get Started" link
 *   Expected : cursor = "pointer"
 *
 * TC-018 | Mobile viewport — no horizontal scroll overflow
 *   Steps    : 1. Set viewport to 375×812  2. Open homepage
 *   Expected : scrollWidth ≤ clientWidth (no horizontal overflow)
 *
 * TC-019 | Tablet viewport — header and hero visible at 768 px width
 *   Steps    : 1. Set viewport to 768×1024  2. Open homepage
 *   Expected : Header and hero heading are visible
 *
 * TC-020 | Footer contains current-year copyright text
 *   Steps    : 1. Open homepage  2. Scroll to footer
 *   Expected : Footer contains "©" or "Copyright" and the current year (2025 or 2026)
 *
 * TC-021 | Page has a favicon configured
 *   Steps    : 1. Open homepage  2. Inspect <head>
 *   Expected : At least one <link rel="icon"> element present
 *
 * TC-022 | All anchor tags have a non-empty href
 *   Steps    : 1. Open homepage  2. Inspect all <a> elements
 *   Expected : No anchor has an empty or missing href
 */

test.describe('Jasmine Labs — UI Validation', () => {

  // ─── TC-016 ──────────────────────────────────────────────────────────────
  test('TC-016 | Header is sticky after scrolling to bottom', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await homePage.scrollToBottom();

    const position = await homePage.getHeaderPosition();
    expect(
      ['sticky', 'fixed'],
      `Header position is "${position}" — expected sticky or fixed`
    ).toContain(position);
  });

  // ─── TC-017 ──────────────────────────────────────────────────────────────
  test('TC-017 | CTA "Get Started" button has pointer cursor', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    // Use the anchor selector that matches the hero CTA
    const cursor = await homePage.getCursorStyle('a[href*="contact"]');
    expect(cursor).toBe('pointer');
  });

  // ─── TC-018 ──────────────────────────────────────────────────────────────
  test('TC-018 | Mobile viewport (375px) — no horizontal scroll overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const homePage = new HomePage(page);
    await homePage.open();

    const hasOverflow = await homePage.hasHorizontalScroll();
    expect(hasOverflow, 'Page has horizontal overflow on mobile viewport').toBe(false);
  });

  // ─── TC-019 ──────────────────────────────────────────────────────────────
  test('TC-019 | Tablet viewport (768px) — header and hero heading visible', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);

    const homePage = new HomePage(page);
    await homePage.open();

    await expect(homePage.header).toBeVisible({ timeout: TIMEOUTS.element });
    await expect(homePage.heroHeading).toBeVisible({ timeout: TIMEOUTS.element });
  });

  // ─── TC-020 ──────────────────────────────────────────────────────────────
  test('TC-020 | Footer contains current-year copyright text', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();
    await homePage.scrollToFooter();

    const footerText = await homePage.footer.innerText();
    const hasSymbol  = /©|copyright/i.test(footerText);
    const hasYear    = /202[5-9]|2030/.test(footerText); // covers 2025-2030

    expect(hasSymbol, 'Footer missing © or "Copyright"').toBe(true);
    expect(hasYear,   'Footer missing a current year').toBe(true);
  });

  // ─── TC-021 ──────────────────────────────────────────────────────────────
  test('TC-021 | Page has a favicon configured', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const count = await homePage.faviconLink.count();
    expect(count, 'No favicon <link> found in <head>').toBeGreaterThan(0);
  });

  // ─── TC-022 ──────────────────────────────────────────────────────────────
  test('TC-022 | All anchor tags have a non-empty href', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const emptyLinks = await homePage.getEmptyLinks();
    expect(
      emptyLinks,
      `Anchors with empty href:\n${emptyLinks.join('\n')}`
    ).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PERFORMANCE TESTS  (TC-023 → TC-027)
// ════════════════════════════════════════════════════════════════════════════

/**
 * TC-023 | Total page load time < 5 s
 *   Steps    : 1. Open homepage  2. Read performance.timing
 *   Expected : loadEventEnd - navigationStart < 5000 ms
 *
 * TC-024 | DOM becomes interactive < 3 s
 *   Steps    : 1. Open homepage  2. Read domInteractive timing
 *   Expected : domInteractive - navigationStart < 3000 ms
 *
 * TC-025 | First Contentful Paint < 2.5 s
 *   Steps    : 1. Open homepage  2. Read paint performance entry
 *   Expected : FCP startTime < 2500 ms
 *
 * TC-026 | Largest Contentful Paint < 4 s
 *   Steps    : 1. Open homepage  2. Observe LCP via PerformanceObserver
 *   Expected : LCP startTime < 4000 ms
 *
 * TC-027 | Total network requests during load ≤ 150
 *   Steps    : 1. Attach request counter  2. Open homepage
 *   Expected : Total requests ≤ 150
 */

test.describe('Jasmine Labs — Performance', () => {

  // ─── TC-023 ──────────────────────────────────────────────────────────────
  test('TC-023 | Page load time < 5 s', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const { loadTime } = await getNavigationTimings(page);
    expect(
      loadTime,
      `Page load took ${loadTime} ms (threshold: ${PERFORMANCE.pageLoadMs} ms)`
    ).toBeLessThan(PERFORMANCE.pageLoadMs);
  });

  // ─── TC-024 ──────────────────────────────────────────────────────────────
  test('TC-024 | DOM interactive time < 3 s', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const { domInteractive } = await getNavigationTimings(page);
    expect(
      domInteractive,
      `DOM interactive at ${domInteractive} ms (threshold: ${PERFORMANCE.domInteractiveMs} ms)`
    ).toBeLessThan(PERFORMANCE.domInteractiveMs);
  });

  // ─── TC-025 ──────────────────────────────────────────────────────────────
  test('TC-025 | First Contentful Paint < 2.5 s', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const fcp = await getFirstContentfulPaint(page);
    // FCP of 0 means unavailable — skip rather than fail
    if (fcp === 0) {
      console.warn('TC-025: FCP metric unavailable in this browser — skipping assertion');
      return;
    }
    expect(
      fcp,
      `FCP was ${fcp} ms (threshold: ${PERFORMANCE.fcpMs} ms)`
    ).toBeLessThan(PERFORMANCE.fcpMs);
  });

  // ─── TC-026 ──────────────────────────────────────────────────────────────
  test('TC-026 | Largest Contentful Paint < 4 s', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const lcp = await getLargestContentfulPaint(page);
    if (lcp === 0) {
      console.warn('TC-026: LCP metric unavailable in this browser — skipping assertion');
      return;
    }
    expect(
      lcp,
      `LCP was ${lcp} ms (threshold: ${PERFORMANCE.lcpMs} ms)`
    ).toBeLessThan(PERFORMANCE.lcpMs);
  });

  // ─── TC-027 ──────────────────────────────────────────────────────────────
  test('TC-027 | Total network requests during load ≤ 150', async ({ page }) => {
    const { getCount } = attachRequestCounter(page);

    const homePage = new HomePage(page);
    await homePage.open();

    const count = getCount();
    expect(
      count,
      `Made ${count} requests (threshold: ${PERFORMANCE.maxRequests})`
    ).toBeLessThanOrEqual(PERFORMANCE.maxRequests);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SECURITY TESTS  (TC-028 → TC-033)
// ════════════════════════════════════════════════════════════════════════════

/**
 * TC-028 | Site is served over HTTPS
 *   Steps    : 1. Open homepage
 *   Expected : page.url() starts with "https://"
 *
 * TC-029 | Required security response headers are present
 *   Steps    : 1. Request homepage via Playwright API  2. Read response headers
 *   Expected : x-content-type-options and x-frame-options headers present
 *
 * TC-030 | No mixed content (HTTP resources on HTTPS page)
 *   Steps    : 1. Open homepage  2. Inspect all resource URLs in the DOM
 *   Expected : No src/href attribute starts with "http://"
 *
 * TC-031 | External _blank links have rel="noopener noreferrer"
 *   Steps    : 1. Open homepage  2. Inspect all <a target="_blank"> pointing off-site
 *   Expected : Each such link has rel containing both noopener and noreferrer
 *
 * TC-032 | No sensitive secrets exposed in page HTML
 *   Steps    : 1. Open homepage  2. Scan innerHTML for key/token patterns
 *   Expected : No API key, bearer token, or private key block patterns found
 *
 * TC-033 | Cookies set by homepage have SameSite attribute
 *   Steps    : 1. Open homepage  2. Inspect Set-Cookie response headers
 *   Expected : All Set-Cookie headers include "SameSite"
 */

test.describe('Jasmine Labs — Security', () => {

  // ─── TC-028 ──────────────────────────────────────────────────────────────
  test('TC-028 | Site is served over HTTPS', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    expect(
      isHTTPS(page),
      `Page URL is not HTTPS: ${page.url()}`
    ).toBe(true);
  });

  // ─── TC-029 ──────────────────────────────────────────────────────────────
  // FAIL REASON: https://reqres.in does not send the following HTTP security headers:
  //
  //   • x-content-type-options — without this, browsers may MIME-sniff responses
  //     and execute malicious files disguised as safe content (e.g. an image
  //     that is actually JavaScript), enabling XSS attacks.
  //
  //   • x-frame-options — without this, the site can be embedded in an <iframe>
  //     on any external domain, enabling clickjacking attacks where users are
  //     tricked into clicking hidden UI elements.
  //
  // FIX: Add these headers via Next.js headers() config, CDN rules, or a reverse
  // proxy (e.g. nginx add_header). This test will pass automatically once fixed.
  test('TC-029 | Required security response headers are present', async ({ request }) => {
    const headers = await getResponseHeaders(request, BASE_URL);
    const presentHeaders = Object.keys(headers);

    for (const requiredHeader of SECURITY.requiredHeaders) {
      expect(
        presentHeaders,
        `Missing response header: "${requiredHeader}"`
      ).toContain(requiredHeader);
    }
  });

  // ─── TC-030 ──────────────────────────────────────────────────────────────
  test('TC-030 | No mixed content (HTTP resources on HTTPS page)', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const mixedUrls = await getMixedContentUrls(page);
    expect(
      mixedUrls,
      `Mixed content URLs found:\n${mixedUrls.join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-031 ──────────────────────────────────────────────────────────────
  test('TC-031 | External _blank links have rel="noopener noreferrer"', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const unsafeLinks = await getUnsafeExternalLinks(page, BASE_URL);
    expect(
      unsafeLinks,
      `External links missing noopener/noreferrer:\n${JSON.stringify(unsafeLinks, null, 2)}`
    ).toHaveLength(0);
  });

  // ─── TC-032 ──────────────────────────────────────────────────────────────
  test('TC-032 | No sensitive secrets exposed in page HTML', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const found = await detectExposedSecrets(page);
    expect(
      found,
      `Potential secrets detected in HTML:\n${found.join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-033 ──────────────────────────────────────────────────────────────
  test('TC-033 | Cookies set by homepage have SameSite attribute', async ({ page }) => {
    const homePage = new HomePage(page);
    const response = await homePage.gotoFull(BASE_URL, 'domcontentloaded');

    const badCookies = getCookiesMissingSameSite(response);
    expect(
      badCookies,
      `Cookies missing SameSite:\n${badCookies.join('\n')}`
    ).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS  (TC-034 → TC-040)
// ════════════════════════════════════════════════════════════════════════════

/**
 * TC-034 | All images have non-empty alt attributes
 *   Steps    : 1. Open homepage  2. Inspect every <img> element
 *   Expected : No <img> is missing alt or has alt=""
 *
 * TC-035 | Page has exactly one <h1> element
 *   Steps    : 1. Open homepage  2. Count <h1> tags
 *   Expected : Exactly 1 <h1>
 *
 * TC-036 | <html> element has a lang attribute
 *   Steps    : 1. Open homepage  2. Read document.documentElement.lang
 *   Expected : lang is non-empty (e.g. "en")
 *
 * TC-037 | Required ARIA landmarks are present
 *   Steps    : 1. Open homepage  2. Check for nav, main, footer/contentinfo
 *   Expected : All three landmarks found via role or semantic tag
 *
 * TC-038 | No links have non-descriptive text ("click here", "read more")
 *   Steps    : 1. Open homepage  2. Scan all <a> text content
 *   Expected : No link matches the non-descriptive pattern list
 *
 * TC-039 | Form inputs have associated labels
 *   Steps    : 1. Open homepage  2. Check all inputs for label/aria-label
 *   Expected : Every visible input has an accessible label
 *
 * TC-040 | No elements use a positive tabindex (tab-order anti-pattern)
 *   Steps    : 1. Open homepage  2. Find all [tabindex] > 0
 *   Expected : No element has tabindex > 0
 */

test.describe('Jasmine Labs — Accessibility', () => {

  // ─── TC-034 ──────────────────────────────────────────────────────────────
  test('TC-034 | All images have non-empty alt attributes', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const violations = await getImagesWithoutAlt(page);
    expect(
      violations,
      `Images missing alt:\n${violations.map((v) => v.src).join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-035 ──────────────────────────────────────────────────────────────
  test('TC-035 | Page has exactly one <h1> element', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const count = await getH1Count(page);
    expect(count, `Expected 1 <h1>, found ${count}`).toBe(1);
  });

  // ─── TC-036 ──────────────────────────────────────────────────────────────
  test('TC-036 | <html> element has a valid lang attribute', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const lang = await getHTMLLang(page);
    expect(lang, '<html> is missing a lang attribute').not.toBe('');
    expect(lang, `Expected lang to start with "${A11Y.expectedHtmlLang}"`).toMatch(
      new RegExp(`^${A11Y.expectedHtmlLang}`, 'i')
    );
  });

  // ─── TC-037 ──────────────────────────────────────────────────────────────
  test('TC-037 | Required ARIA landmarks are present (nav, main, footer)', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const missing = await getMissingAriaLandmarks(page);
    expect(
      missing,
      `Missing ARIA landmarks: ${missing.join(', ')}`
    ).toHaveLength(0);
  });

  // ─── TC-038 ──────────────────────────────────────────────────────────────
  test('TC-038 | No links have non-descriptive text ("click here", "read more")', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const badLinks = await getLinksWithPoorText(page);
    expect(
      badLinks,
      `Non-descriptive links found:\n${badLinks.map((l) => `"${l.text}" → ${l.href}`).join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-039 ──────────────────────────────────────────────────────────────
  test('TC-039 | All form inputs have accessible labels', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const unlabelled = await getInputsWithoutLabel(page);
    expect(
      unlabelled,
      `Inputs missing labels:\n${unlabelled.map((i) => JSON.stringify(i)).join('\n')}`
    ).toHaveLength(0);
  });

  // ─── TC-040 ──────────────────────────────────────────────────────────────
  test('TC-040 | No elements have a positive tabindex', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const violations = await getPositiveTabindexElements(page);
    expect(
      violations,
      `Elements with positive tabindex:\n${violations.map((v) => JSON.stringify(v)).join('\n')}`
    ).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SEO TESTS  (TC-041 → TC-047)
// ════════════════════════════════════════════════════════════════════════════

/**
 * TC-041 | Meta description is present and meets minimum length
 *   Steps    : 1. Open homepage  2. Read <meta name="description"> content
 *   Expected : Non-empty, ≥ 50 characters
 *
 * TC-042 | Open Graph title tag is present
 *   Steps    : 1. Open homepage  2. Read <meta property="og:title">
 *   Expected : og:title has a non-empty value
 *
 * TC-043 | Open Graph description tag is present
 *   Steps    : 1. Open homepage  2. Read <meta property="og:description">
 *   Expected : og:description has a non-empty value
 *
 * TC-044 | Open Graph image tag is present
 *   Steps    : 1. Open homepage  2. Read <meta property="og:image">
 *   Expected : og:image has a non-empty value (URL)
 *
 * TC-045 | Canonical URL tag is present and points to homepage
 *   Steps    : 1. Open homepage  2. Read <link rel="canonical">
 *   Expected : canonical href contains https://reqres.in
 *
 * TC-046 | Robots meta tag does not block indexing
 *   Steps    : 1. Open homepage  2. Read <meta name="robots">
 *   Expected : Content does not contain "noindex" or "none"
 *
 * TC-047 | JSON-LD structured data is present
 *   Steps    : 1. Open homepage  2. Find <script type="application/ld+json">
 *   Expected : At least one valid JSON-LD block present
 */

test.describe('Jasmine Labs — SEO', () => {

  // ─── TC-041 ──────────────────────────────────────────────────────────────
  test('TC-041 | Meta description is present and meets minimum length', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const description = await getMetaDescription(page);
    expect(description, 'Meta description is missing').not.toBe('');
    expect(
      description.length,
      `Meta description too short (${description.length} chars, min ${SEO.minDescriptionLength})`
    ).toBeGreaterThanOrEqual(SEO.minDescriptionLength);
  });

  // ─── TC-042 ──────────────────────────────────────────────────────────────
  // KNOWN SEO FINDING: og:title is not present on https://reqres.in
  test('TC-042 | Open Graph title (og:title) is present', async ({ page }) => {
    test.fail(true, 'SEO FINDING: <meta property="og:title"> is missing — limits social sharing preview');

    const homePage = new HomePage(page);
    await homePage.open();

    const ogTitle = await getOgTag(page, 'og:title');
    expect(ogTitle, 'og:title meta tag is missing or empty').not.toBe('');
  });

  // ─── TC-043 ──────────────────────────────────────────────────────────────
  // KNOWN SEO FINDING: og:description is not present
  test('TC-043 | Open Graph description (og:description) is present', async ({ page }) => {
    test.fail(true, 'SEO FINDING: <meta property="og:description"> is missing');

    const homePage = new HomePage(page);
    await homePage.open();

    const ogDesc = await getOgTag(page, 'og:description');
    expect(ogDesc, 'og:description meta tag is missing or empty').not.toBe('');
  });

  // ─── TC-044 ──────────────────────────────────────────────────────────────
  // KNOWN SEO FINDING: og:image is not present
  test('TC-044 | Open Graph image (og:image) is present', async ({ page }) => {
    test.fail(true, 'SEO FINDING: <meta property="og:image"> is missing — no preview image for social shares');

    const homePage = new HomePage(page);
    await homePage.open();

    const ogImage = await getOgTag(page, 'og:image');
    expect(ogImage, 'og:image meta tag is missing or empty').not.toBe('');
  });

  // ─── TC-045 ──────────────────────────────────────────────────────────────
  // KNOWN SEO FINDING: canonical tag is not present
  test('TC-045 | Canonical URL tag is present', async ({ page }) => {
    test.fail(true, 'SEO FINDING: <link rel="canonical"> is missing — duplicate content risk');

    const homePage = new HomePage(page);
    await homePage.open();

    const canonical = await getCanonicalUrl(page);
    expect(canonical, 'Canonical link tag is missing').not.toBe('');
    expect(canonical, 'Canonical URL should point to https://reqres.in').toContain('https://reqres.in');
  });

  // ─── TC-046 ──────────────────────────────────────────────────────────────
  test('TC-046 | Robots meta does not block search engine indexing', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const robots = await getRobotsMeta(page);
    // Empty robots tag = default (index, follow) — acceptable
    for (const blocked of SEO.blockedRobotsValues) {
      expect(
        robots.toLowerCase(),
        `Robots meta contains "${blocked}" — page will not be indexed`
      ).not.toContain(blocked);
    }
  });

  // ─── TC-047 ──────────────────────────────────────────────────────────────
  // KNOWN SEO FINDING: no JSON-LD structured data present
  test('TC-047 | JSON-LD structured data is present', async ({ page }) => {
    test.fail(true, 'SEO FINDING: No <script type="application/ld+json"> found — search engines lack structured context');

    const homePage = new HomePage(page);
    await homePage.open();

    const jsonLd = await getJsonLdScripts(page);
    expect(jsonLd, 'No JSON-LD structured data blocks found').not.toHaveLength(0);
  });
});
