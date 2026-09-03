/**
 * accessibilityHelper.js
 * ----------------------
 * DOM-level accessibility checks — no external axe dependency required.
 * All functions return arrays of violations (empty = passing).
 */

/**
 * Returns <img> elements with a missing or empty alt attribute.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ src: string, alt: string|null }>>}
 */
export async function getImagesWithoutAlt(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '')
      .map((img) => ({ src: img.src, alt: img.getAttribute('alt') }))
  );
}

/**
 * Returns the number of <h1> elements on the page.
 * Accessibility best practice: exactly one <h1> per page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getH1Count(page) {
  return page.evaluate(() => document.querySelectorAll('h1').length);
}

/**
 * Returns the value of the lang attribute on the <html> element.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getHTMLLang(page) {
  return page.evaluate(() => document.documentElement.lang || '');
}

/**
 * Returns missing ARIA landmark roles.
 * Checks for: navigation, main, contentinfo (footer).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}  array of missing role names
 */
export async function getMissingAriaLandmarks(page) {
  return page.evaluate(() => {
    const required = ['navigation', 'main', 'contentinfo'];
    return required.filter((role) => {
      const byRole  = document.querySelector(`[role="${role}"]`);
      const byTag   = {
        navigation:  document.querySelector('nav'),
        main:        document.querySelector('main'),
        contentinfo: document.querySelector('footer'),
      }[role];
      return !byRole && !byTag;
    });
  });
}

/**
 * Returns <a> elements with non-descriptive visible text such as
 * "click here", "read more", "here", "link", "more".
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ text: string, href: string }>>}
 */
export async function getLinksWithPoorText(page) {
  return page.evaluate(() => {
    const badPatterns = /^(click here|read more|here|link|more|learn more|this|go)$/i;
    return Array.from(document.querySelectorAll('a'))
      .filter((a) => {
        const text = (a.textContent || '').trim();
        return badPatterns.test(text);
      })
      .map((a) => ({ text: a.textContent.trim(), href: a.href }));
  });
}

/**
 * Returns <input> and <textarea> elements that have no associated <label>
 * (neither via for/id pairing, aria-label, nor aria-labelledby).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ type: string, name: string, id: string }>>}
 */
export async function getInputsWithoutLabel(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'))
      .filter((el) => {
        const hasAriaLabel     = el.hasAttribute('aria-label') && el.getAttribute('aria-label').trim() !== '';
        const hasAriaLabelledBy= el.hasAttribute('aria-labelledby');
        const hasForLabel      = el.id && document.querySelector(`label[for="${el.id}"]`);
        const hasWrappingLabel = el.closest('label');
        const hasPlaceholderOnly = el.hasAttribute('placeholder') && !hasAriaLabel && !hasForLabel && !hasWrappingLabel;
        return !hasAriaLabel && !hasAriaLabelledBy && !hasForLabel && !hasWrappingLabel;
      })
      .map((el) => ({
        type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : el.type,
        name: el.name || '',
        id:   el.id   || '',
      }))
  );
}

/**
 * Returns elements with a positive tabindex (> 0), which disrupts
 * the natural tab order and is an accessibility anti-pattern.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ tag: string, tabindex: string, text: string }>>}
 */
export async function getPositiveTabindexElements(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[tabindex]'))
      .filter((el) => parseInt(el.getAttribute('tabindex'), 10) > 0)
      .map((el) => ({
        tag:      el.tagName.toLowerCase(),
        tabindex: el.getAttribute('tabindex'),
        text:     (el.textContent || '').trim().slice(0, 60),
      }))
  );
}
