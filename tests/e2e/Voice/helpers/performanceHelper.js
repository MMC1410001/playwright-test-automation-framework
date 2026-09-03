/**
 * performanceHelper.js
 * --------------------
 * Utilities for capturing and asserting browser performance metrics
 * using the Navigation Timing API and PerformanceObserver.
 */

/**
 * Returns core timing metrics after the page has fully loaded.
 * Must be called AFTER page.goto() resolves.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ loadTime: number, domInteractive: number, domContentLoaded: number }>}
 */
export async function getNavigationTimings(page) {
  return page.evaluate(() => {
    const t = performance.timing;
    return {
      loadTime:          t.loadEventEnd         - t.navigationStart,
      domInteractive:    t.domInteractive        - t.navigationStart,
      domContentLoaded:  t.domContentLoadedEventEnd - t.navigationStart,
    };
  });
}

/**
 * Returns First Contentful Paint (FCP) in ms.
 * Returns 0 if the metric is unavailable.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getFirstContentfulPaint(page) {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('paint');
    const fcp = entries.find((e) => e.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  });
}

/**
 * Returns Largest Contentful Paint (LCP) in ms using buffered PerformanceObserver.
 * Works even when called after page load (buffered: true captures past entries).
 * Times out at 5 s and returns 0 if unavailable.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getLargestContentfulPaint(page) {
  return page.evaluate(() =>
    new Promise((resolve) => {
      // If already buffered, return immediately
      const buffered = performance.getEntriesByType('largest-contentful-paint');
      if (buffered.length > 0) {
        resolve(buffered[buffered.length - 1].startTime);
        return;
      }
      // Otherwise wait for the observer (with buffered: true)
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          obs.disconnect();
          resolve(entries[entries.length - 1].startTime);
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        resolve(0); // browser does not support LCP entry type
      }
      setTimeout(() => resolve(0), 5000);
    })
  );
}

/**
 * Captures the total number of network requests fired during page load.
 * Must be called BEFORE page.goto() — attach the listener first, then navigate.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {{ getCount: () => number }}
 */
export function attachRequestCounter(page) {
  let count = 0;
  page.on('request', () => { count++; });
  return { getCount: () => count };
}
