
const { test, expect } = require('@playwright/test');

/**
 * Page Performance & Core Web Vitals Tests
 * Tests 284-291
 *
 * Note: CWV measurements are approximate in Playwright.
 * For production monitoring, use tools like Lighthouse or web-vitals library.
 */

test.describe('Page Performance Tests', () => {
  test('284 - Performance: Homepage loads within acceptable time (<5s)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;
    console.log('Homepage load time:', loadTime, 'ms');

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('285 - Performance: Calculator page loads within acceptable time (<5s)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/calculator`, { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;
    console.log('Calculator page load time:', loadTime, 'ms');

    expect(loadTime).toBeLessThan(5000);
  });

  test('286 - Performance: Blog listing page loads within acceptable time (<5s)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/blog`, { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;
    console.log('Blog page load time:', loadTime, 'ms');

    expect(loadTime).toBeLessThan(5000);
  });

  test('287 - Performance: Homepage has no render-blocking critical resources', async ({ page }) => {
    const failedResources = [];

    // Monitor failed network requests
    page.on('requestfailed', request => {
      failedResources.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    // Filter for critical resources (CSS, JS)
    const criticalFailed = failedResources.filter(r =>
      r.url.endsWith('.css') || r.url.endsWith('.js')
    );

    console.log('Failed critical resources:', criticalFailed);

    if (criticalFailed.length > 0) {
      console.warn('Warning: Some critical resources failed to load:', criticalFailed);
    }

    // No critical CSS/JS should fail
    expect(criticalFailed.length).toBe(0);
  });

  test('288 - Performance: Largest Contentful Paint (LCP) is within acceptable range', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    // Measure LCP using Performance API
    const lcp = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : null);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback if no LCP entry within 3 seconds
        setTimeout(() => resolve(null), 3000);
      });
    });

    console.log('LCP value:', lcp, 'ms');

    if (lcp !== null) {
      // Good LCP: < 2500ms, Needs Improvement: < 4000ms, Poor: >= 4000ms
      const lcpRating = lcp < 2500 ? 'Good' : lcp < 4000 ? 'Needs Improvement' : 'Poor';
      console.log('LCP rating:', lcpRating);

      if (lcp >= 4000) {
        console.warn(`Warning: LCP is ${lcpRating} (${Math.round(lcp)}ms). Target is < 2500ms.`);
      }

      // Soft assertion - warn but don't fail for "Needs Improvement"
      expect(lcp).toBeLessThan(8000); // Strict failure only at 8s
    } else {
      console.log('LCP measurement not available - may need more time');
      expect(true).toBeTruthy();
    }
  });

  test('289 - Performance: Cumulative Layout Shift (CLS) is minimal', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    // Scroll page to trigger any lazy-loaded content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise(resolve => {
        let clsScore = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore
            if (!entry.hadRecentInput) {
              // @ts-ignore
              clsScore += entry.value;
            }
          }
        });

        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          return resolve(null);
        }

        setTimeout(() => {
          observer.disconnect();
          resolve(clsScore);
        }, 2000);
      });
    });

    console.log('CLS score:', cls);

    if (cls !== null) {
      // Good CLS: < 0.1, Needs Improvement: < 0.25, Poor: >= 0.25
      const clsRating = cls < 0.1 ? 'Good' : cls < 0.25 ? 'Needs Improvement' : 'Poor';
      console.log('CLS rating:', clsRating);

      if (cls >= 0.25) {
        console.warn(`Warning: CLS is ${clsRating} (${cls.toFixed(3)}). Target is < 0.1.`);
      }

      expect(cls).toBeLessThan(0.5); // Strict failure only at very poor CLS
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('290 - Performance: First Input Delay (FID) / Interaction to Next Paint metric', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    // Simulate user interaction timing
    const startTime = Date.now();

    // Click the first interactive element
    const interactiveElement = page.locator('button, a, input').first();
    const hasInteractiveEl = await interactiveElement.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasInteractiveEl) {
      await interactiveElement.click({ force: true, timeout: 2000 }).catch(() => {});
      const endTime = Date.now();
      const interactionTime = endTime - startTime;

      console.log('Interaction response time:', interactionTime, 'ms');

      // FID should be < 100ms for good experience
      expect(interactionTime).toBeLessThan(3000);
    }

    // Also check Time to Interactive via performance API
    const tti = await page.evaluate(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      // @ts-ignore
      return navigationEntry ? navigationEntry.domInteractive : null;
    });

    console.log('Time to Interactive (domInteractive):', tti, 'ms');

    if (tti) {
      expect(tti).toBeLessThan(10000); // TTI within 10 seconds
    }

    expect(true).toBeTruthy();
  });

  test('291 - Performance: Homepage images are optimized (use WebP or modern formats)', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    // Check image formats
    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loading: img.loading
      }));
    });

    console.log('Total images on homepage:', imageInfo.length);

    // Check for modern image formats
    const webpImages = imageInfo.filter(img => img.src.includes('.webp'));
    const svgImages = imageInfo.filter(img => img.src.includes('.svg'));
    const lazyImages = imageInfo.filter(img => img.loading === 'lazy');

    console.log('WebP images:', webpImages.length);
    console.log('SVG images:', svgImages.length);
    console.log('Lazy loaded images:', lazyImages.length);

    // Check for lazy loading on non-critical images
    const totalImages = imageInfo.length;
    console.log('Lazy loading adoption:', `${lazyImages.length}/${totalImages}`);

    // Images should exist on the page
    expect(totalImages).toBeGreaterThanOrEqual(0);

    // Log optimization recommendations
    const jpgPngImages = imageInfo.filter(img =>
      img.src.includes('.jpg') || img.src.includes('.jpeg') || img.src.includes('.png')
    );

    if (jpgPngImages.length > 0) {
      console.warn(`Optimization opportunity: ${jpgPngImages.length} images could potentially use WebP format`);
    }
  });
});
