/**
 * securityHelper.js
 * -----------------
 * Utilities for asserting security properties of a web page:
 * HTTPS enforcement, response headers, mixed content, and link safety.
 */

/**
 * Checks whether the current page URL uses HTTPS.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {boolean}
 */
export function isHTTPS(page) {
  return page.url().startsWith('https://');
}

/**
 * Fetches the response headers for a given URL using Playwright's request API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url
 * @returns {Promise<Record<string, string>>}
 */
export async function getResponseHeaders(request, url) {
  const response = await request.get(url);
  return response.headers();
}

/**
 * Returns a list of HTTP (non-HTTPS) resource URLs found on the page.
 * Covers <img>, <script>, <link>, <iframe> src/href attributes.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
export async function getMixedContentUrls(page) {
  return page.evaluate(() => {
    const selectors = [
      ...Array.from(document.querySelectorAll('img[src]')).map((el) => el.src),
      ...Array.from(document.querySelectorAll('script[src]')).map((el) => el.src),
      ...Array.from(document.querySelectorAll('link[href]')).map((el) => el.href),
      ...Array.from(document.querySelectorAll('iframe[src]')).map((el) => el.src),
    ];
    return selectors.filter((url) => url.startsWith('http://'));
  });
}

/**
 * Returns external links that are missing rel="noopener" or rel="noreferrer".
 * Only checks links with target="_blank".
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL  - the site's own origin (e.g. `${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}`)
 * @returns {Promise<Array<{ href: string, rel: string }>>}
 */
export async function getUnsafeExternalLinks(page, baseURL) {
  return page.evaluate((origin) => {
    return Array.from(document.querySelectorAll('a[target="_blank"]'))
      .filter((a) => !a.href.startsWith(origin))
      .filter((a) => {
        const rel = (a.getAttribute('rel') || '').split(' ');
        return !rel.includes('noopener') || !rel.includes('noreferrer');
      })
      .map((a) => ({ href: a.href, rel: a.getAttribute('rel') || '' }));
  }, baseURL);
}

/**
 * Scans the page HTML for patterns that suggest accidentally exposed secrets.
 * Returns the matched patterns (NOT their values).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
export async function detectExposedSecrets(page) {
  return page.evaluate(() => {
    const html  = document.documentElement.innerHTML;
    const patterns = [
      { label: 'API key pattern',    re: /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i },
      { label: 'Bearer token',       re: /bearer\s+[a-z0-9\-._~+/]{20,}/i },
      { label: 'Private key block',  re: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
      { label: 'AWS access key',     re: /AKIA[0-9A-Z]{16}/ },
    ];
    return patterns
      .filter(({ re }) => re.test(html))
      .map(({ label }) => label);
  });
}

/**
 * Inspects document.cookie strings (readable from JS — HttpOnly excluded).
 * Returns cookies that are missing the "SameSite" attribute declaration in Set-Cookie headers.
 * This checks via response headers for the initial page request.
 *
 * @param {import('@playwright/test').Response} response  - the response returned from page.goto()
 * @returns {string[]}  cookie strings that lack SameSite
 */
export function getCookiesMissingSameSite(response) {
  const setCookieHeader = response.headers()['set-cookie'];
  if (!setCookieHeader) return [];

  return setCookieHeader
    .split('\n')
    .filter((cookie) => !/samesite/i.test(cookie));
}
