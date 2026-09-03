/**
 * seoHelper.js
 * ------------
 * Utilities for asserting SEO-related meta tags and structured data.
 * All functions operate on the current page state after navigation.
 */

/**
 * Returns the content of the <meta name="description"> tag.
 * Returns empty string if not present.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getMetaDescription(page) {
  return page.evaluate(() => {
    const el = document.querySelector('meta[name="description"]');
    return el ? el.getAttribute('content') || '' : '';
  });
}

/**
 * Returns the content of an Open Graph <meta property="og:*"> tag.
 * Returns empty string if not present.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} property  e.g. 'og:title', 'og:description', 'og:image'
 * @returns {Promise<string>}
 */
export async function getOgTag(page, property) {
  return page.evaluate((prop) => {
    const el = document.querySelector(`meta[property="${prop}"]`);
    return el ? el.getAttribute('content') || '' : '';
  }, property);
}

/**
 * Returns the href value of <link rel="canonical">.
 * Returns empty string if not present.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getCanonicalUrl(page) {
  return page.evaluate(() => {
    const el = document.querySelector('link[rel="canonical"]');
    return el ? el.getAttribute('href') || '' : '';
  });
}

/**
 * Returns the content of <meta name="robots"> tag.
 * Returns empty string if not present (default = index,follow).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getRobotsMeta(page) {
  return page.evaluate(() => {
    const el = document.querySelector('meta[name="robots"]');
    return el ? el.getAttribute('content') || '' : '';
  });
}

/**
 * Returns all JSON-LD script blocks found on the page as parsed objects.
 * Returns empty array if none present.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object[]>}
 */
export async function getJsonLdScripts(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((el) => {
        try { return JSON.parse(el.textContent); }
        catch { return null; }
      })
      .filter(Boolean);
  });
}

/**
 * Returns the page <title> text.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getPageTitle(page) {
  return page.evaluate(() => document.title);
}

/**
 * Returns all Twitter Card <meta name="twitter:*"> tag values as an object.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Record<string, string>>}
 */
export async function getTwitterCardTags(page) {
  return page.evaluate(() => {
    const tags = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
      tags[el.getAttribute('name')] = el.getAttribute('content') || '';
    });
    return tags;
  });
}
