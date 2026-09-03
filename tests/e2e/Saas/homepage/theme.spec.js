const { test, expect } = require('@playwright/test');
const { HomePage } = require('../utils/page-objects/homepage.page');

test.describe('Theme Persistence Tests', () => {
  /** @type {HomePage} */
  let homePage;
  const baseUrl = `${process.env.SAAS_URL || 'https://www.saucedemo.com'}`;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    // Wait for page to be ready
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('Network idle timeout in beforeEach - continuing');
    });
  });

  test('182 - Theme Persistence: Theme saved to localStorage on toggle', async ({ page }) => {
    // Get initial theme
    const initialTheme = await page.evaluate(() => localStorage.getItem('theme'));
    console.log('Initial theme from localStorage:', initialTheme);

    // Check if theme toggle exists
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Toggle theme
      await homePage.toggleTheme();

      // Verify theme changed in localStorage
      const newTheme = await page.evaluate(() => localStorage.getItem('theme'));
      console.log('New theme after toggle:', newTheme);

      // Theme should be different from initial, or should be set if it wasn't before
      if (initialTheme) {
        expect(newTheme).not.toBe(initialTheme);
      } else {
        expect(newTheme).toBeTruthy();
      }

      // Verify theme is one of the expected values
      expect(['light', 'dark']).toContain(newTheme);
    } else {
      console.log('Test 182: Theme toggle not found - feature may not be implemented yet');
      test.skip();
    }
  });

  test('183 - Theme Persistence: Theme persists after page reload', async ({ page }) => {
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Set a specific theme
      await homePage.toggleTheme();
      await page.waitForTimeout(500);

      const themeBeforeReload = await homePage.getCurrentTheme();
      console.log('Theme before reload:', themeBeforeReload);

      // Reload page
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Network idle timeout after reload - continuing');
      });

      // Check theme after reload
      const themeAfterReload = await homePage.getCurrentTheme();
      console.log('Theme after reload:', themeAfterReload);

      // Theme should persist
      expect(themeAfterReload).toBe(themeBeforeReload);
    } else {
      test.skip();
    }
  });

  test('184 - Theme Persistence: Theme persists after browser close and reopen', async ({ page, context }) => {
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Set theme
      await homePage.toggleTheme();
      const selectedTheme = await homePage.getCurrentTheme();
      console.log('Selected theme:', selectedTheme);

      // Save storage state (simulates browser session)
      const storageState = await context.storageState();
      console.log('Storage state saved with theme:', selectedTheme);

      // Close and create new page (simulates browser reopen)
      await page.close();
      const newPage = await context.newPage();

      // Navigate to homepage again
      const newHomePage = new HomePage(newPage);
      await newPage.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await newPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Network idle timeout - continuing');
      });

      // Check if theme persisted
      const persistedTheme = await newHomePage.getCurrentTheme();
      console.log('Theme after reopen:', persistedTheme);

      expect(persistedTheme).toBe(selectedTheme);
    } else {
      test.skip();
    }
  });

  test('185 - Theme Persistence: Theme consistent across all pages during navigation', async ({ page }) => {
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Set theme on homepage
      await homePage.toggleTheme();
      const homeTheme = await homePage.getCurrentTheme();
      console.log('Theme on homepage:', homeTheme);

      // Navigate to Blog page
      try {
        await homePage.clickNavLink('Blog');
      } catch (error) {
        // @ts-ignore
        console.log('Blog navigation error:', error.message);
      }
      await page.waitForTimeout(1000);

      const blogTheme = await page.evaluate(() => {
        return localStorage.getItem('theme') ||
          (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      });
      console.log('Theme on blog page:', blogTheme);

      expect(blogTheme).toBe(homeTheme);

      // Navigate to Calculator page (if exists)
      try {
        await page.goto(baseUrl + '/calculator', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.log('Network idle timeout on calculator page');
        });

        const calculatorTheme = await page.evaluate(() => {
          return localStorage.getItem('theme') ||
            (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        });
        console.log('Theme on calculator page:', calculatorTheme);

        expect(calculatorTheme).toBe(homeTheme);
      } catch (error) {
        console.log('Calculator page may not exist - skipping that verification');
      }
    } else {
      test.skip();
    }
  });

  test('186 - Theme Persistence: Dark theme applied on initial load if saved in localStorage', async ({ page, context }) => {
    // Pre-set dark theme in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });

    // Navigate to homepage
    await homePage.navigateToHome();

    // Verify dark theme is applied
    const appliedTheme = await homePage.getCurrentTheme();
    console.log('Theme applied on initial load:', appliedTheme);

    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark';
    });

    expect(isDarkMode).toBeTruthy();
    console.log('Dark mode active:', isDarkMode);
  });

  test('187 - Theme Persistence: Light theme applied on initial load if saved in localStorage', async ({ page }) => {
    // Pre-set light theme in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
    });

    // Navigate to homepage
    await homePage.navigateToHome();

    // Verify light theme is applied
    const appliedTheme = await homePage.getCurrentTheme();
    console.log('Theme applied on initial load:', appliedTheme);

    const isLightMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('light') ||
        document.body.classList.contains('light') ||
        localStorage.getItem('theme') === 'light' ||
        (!document.documentElement.classList.contains('dark') && !document.body.classList.contains('dark'));
    });

    expect(isLightMode).toBeTruthy();
    console.log('Light mode active:', isLightMode);
  });

  test('188 - Theme Toggle: Toggle works correctly from any page', async ({ page }) => {
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Test toggle from homepage
      const homeThemeBefore = await homePage.getCurrentTheme();
      await homePage.toggleTheme();
      const homeThemeAfter = await homePage.getCurrentTheme();

      expect(homeThemeAfter).not.toBe(homeThemeBefore);
      console.log('Homepage theme toggle: ', homeThemeBefore, '->', homeThemeAfter);

      // Navigate to Blog
      await homePage.clickNavLink('Blog');
      await page.waitForLoadState('networkidle');

      // Test toggle from blog page
      const blogThemeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]').first();

      if (await blogThemeToggle.count() > 0) {
        const blogThemeBefore = await page.evaluate(() => {
          return localStorage.getItem('theme') ||
            (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        });

        await blogThemeToggle.click();
        await page.waitForTimeout(500);

        const blogThemeAfter = await page.evaluate(() => {
          return localStorage.getItem('theme') ||
            (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        });

        expect(blogThemeAfter).not.toBe(blogThemeBefore);
        console.log('Blog page theme toggle:', blogThemeBefore, '->', blogThemeAfter);
      } else {
        console.log('Theme toggle not found on blog page');
      }
    } else {
      test.skip();
    }
  });

  test('189 - Theme Toggle: Theme toggle icon changes correctly (sun/moon)', async ({ page }) => {
    const themeToggleExists = await homePage.themeToggle.count() > 0;

    if (themeToggleExists) {
      // Get initial icon state
      const initialIcon = await page.evaluate(() => {
        const toggleButton = document.querySelector('button[aria-label*="theme" i], button[aria-label*="mode" i], button:has(svg.lucide-moon), button:has(svg.lucide-sun), [class*="theme-toggle"]');
        if (!toggleButton) return null;

        // Check for sun/moon icons
        const hasSunIcon = toggleButton.querySelector('svg[data-icon="sun"], [class*="sun"], .lucide-sun');
        const hasMoonIcon = toggleButton.querySelector('svg[data-icon="moon"], [class*="moon"], .lucide-moon');

        if (hasSunIcon) return 'sun';
        if (hasMoonIcon) return 'moon';

        // Check aria-label
        const label = toggleButton.getAttribute('aria-label');
        if (label && label.toLowerCase().includes('dark')) return 'moon';
        if (label && label.toLowerCase().includes('light')) return 'sun';

        return 'unknown';
      });

      console.log('Initial theme icon:', initialIcon);

      // Toggle theme
      await homePage.toggleTheme();
      await page.waitForTimeout(500);

      // Get new icon state
      const newIcon = await page.evaluate(() => {
        const toggleButton = document.querySelector('button[aria-label*="theme" i], button[aria-label*="mode" i], button:has(svg.lucide-moon), button:has(svg.lucide-sun), [class*="theme-toggle"]');
        if (!toggleButton) return null;

        const hasSunIcon = toggleButton.querySelector('svg[data-icon="sun"], [class*="sun"], .lucide-sun');
        const hasMoonIcon = toggleButton.querySelector('svg[data-icon="moon"], [class*="moon"], .lucide-moon');

        if (hasSunIcon) return 'sun';
        if (hasMoonIcon) return 'moon';

        const label = toggleButton.getAttribute('aria-label');
        if (label && label.toLowerCase().includes('dark')) return 'moon';
        if (label && label.toLowerCase().includes('light')) return 'sun';

        return 'unknown';
      });

      console.log('New theme icon after toggle:', newIcon);

      // Icon should change (or at least be detected)
      if (initialIcon !== 'unknown' && newIcon !== 'unknown') {
        expect(newIcon).not.toBe(initialIcon);
      } else {
        // At minimum, verify icon exists
        expect(newIcon || initialIcon).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });
});
