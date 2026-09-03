/**
 * Wait Helper
 * Custom wait conditions and utilities
 */

/**
 * Wait for element to be stable (no position changes)
 * @param {import('@playwright/test').Locator} locator - Element locator
 * @param {number} duration - Duration to wait for stability (ms)
 */
async function waitForElementStable(locator, duration = 1000) {
  let previousRect = await locator.boundingBox();
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    await locator.page().waitForTimeout(100);
    const currentRect = await locator.boundingBox();

    if (!previousRect || !currentRect) {
      previousRect = currentRect;
      continue;
    }

    // Check if position changed
    if (previousRect.x !== currentRect.x || previousRect.y !== currentRect.y) {
      // Position changed, reset timer
      previousRect = currentRect;
      continue;
    }

    previousRect = currentRect;
  }
}

/**
 * Wait for animation to complete
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - Element selector
 */
async function waitForAnimationComplete(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      const animations = element.getAnimations();
      return animations.length === 0 || animations.every(anim => anim.playState === 'finished');
    },
    selector,
    { timeout: 5000 }
  );
}

/**
 * Wait for network idle (no requests for specified duration)
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {number} idleTime - Time with no requests (ms)
 */
async function waitForNetworkIdle(page, idleTime = 500) {
  let requestCount = 0;
  /**
   * @type {string | number | NodeJS.Timeout | undefined}
   */
  let idleTimer;

  const requestListener = () => {
    requestCount++;
    clearTimeout(idleTimer);
  };

  page.on('request', requestListener);

  await new Promise((resolve) => {
    const checkIdle = () => {
      if (requestCount === 0) {
        idleTimer = setTimeout(() => {
          page.off('request', requestListener);
          resolve(true);
        }, idleTime);
      } else {
        requestCount = 0;
        setTimeout(checkIdle, idleTime);
      }
    };
    checkIdle();
  });
}

/**
 * Wait for API response
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} urlPattern - URL pattern to match
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForApiResponse(page, urlPattern, timeout = 10000) {
  return await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Wait for element count to change
 * @param {import('@playwright/test').Locator} locator - Element locator
 * @param {number} expectedCount - Expected count
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForElementCount(locator, expectedCount, timeout = 5000) {
  await locator.page().waitForFunction(
    ({ selector, count }) => {
      // @ts-ignore
      const elements = document.querySelectorAll(selector);
      return elements.length === count;
    },
    { selector: locator, count: expectedCount },
    { timeout }
  );
}

/**
 * Wait for text to appear in element
 * @param {import('@playwright/test').Locator} locator - Element locator
 * @param {string} text - Text to wait for
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForTextInElement(locator, text, timeout = 5000) {
  await locator.page().waitForFunction(
    ({ sel, txt }) => {
      // @ts-ignore
      const element = document.querySelector(sel);
      return element && element.textContent.includes(txt);
    },
    { sel: locator, txt: text },
    { timeout }
  );
}

/**
 * Wait for element to disappear
 * @param {import('@playwright/test').Locator} locator - Element locator
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForElementDisappear(locator, timeout = 5000) {
  await locator.waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for scroll to complete
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function waitForScrollComplete(page) {
  await page.waitForFunction(() => {
    return new Promise((resolve) => {
      let lastScrollY = window.scrollY;
      const checkScroll = () => {
        if (window.scrollY === lastScrollY) {
          resolve(true);
        } else {
          lastScrollY = window.scrollY;
          setTimeout(checkScroll, 100);
        }
      };
      setTimeout(checkScroll, 100);
    });
  }, { timeout: 3000 });
}

/**
 * Wait for page to be fully loaded including fonts
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function waitForPageFullyLoaded(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Wait for fonts to load
  await page.evaluate(() => {
    return document.fonts.ready;
  });
}

/**
 * Wait for localStorage item to be set
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} key - localStorage key
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForLocalStorageItem(page, key, timeout = 5000) {
  await page.waitForFunction(
    (storageKey) => {
      return localStorage.getItem(storageKey) !== null;
    },
    key,
    { timeout }
  );
}

/**
 * Wait for video to be ready
 * @param {import('@playwright/test').Locator} videoLocator - Video element locator
 */
async function waitForVideoReady(videoLocator) {
  await videoLocator.page().waitForFunction(
    (selector) => {
      // @ts-ignore
      const video = document.querySelector(selector);
      // @ts-ignore
      return video && video.readyState >= 3; // HAVE_FUTURE_DATA or greater
    },
    videoLocator,
    { timeout: 10000 }
  );
}

/**
 * Wait for audio to be ready
 * @param {import('@playwright/test').Locator} audioLocator - Audio element locator
 */
async function waitForAudioReady(audioLocator) {
  await audioLocator.page().waitForFunction(
    (selector) => {
      // @ts-ignore
      const audio = document.querySelector(selector);
      // @ts-ignore
      return audio && audio.readyState >= 3; // HAVE_FUTURE_DATA or greater
    },
    audioLocator,
    { timeout: 10000 }
  );
}

/**
 * Wait with exponential backoff
 * @param {Function} condition - Condition function to check
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 */
async function waitWithBackoff(condition, maxAttempts = 5, initialDelay = 100) {
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await condition()) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // Exponential backoff
  }

  throw new Error('Condition not met after maximum attempts');
}

/**
 * Smart wait - combines multiple wait strategies
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function smartWait(page) {
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.waitForLoadState('domcontentloaded'),
    page.evaluate(() => document.fonts.ready)
  ]);
}

module.exports = {
  waitForElementStable,
  waitForAnimationComplete,
  waitForNetworkIdle,
  waitForApiResponse,
  waitForElementCount,
  waitForTextInElement,
  waitForElementDisappear,
  waitForScrollComplete,
  waitForPageFullyLoaded,
  waitForLocalStorageItem,
  waitForVideoReady,
  waitForAudioReady,
  waitWithBackoff,
  smartWait
};
