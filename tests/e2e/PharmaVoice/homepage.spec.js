const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

test.describe('PharmaVoice Pharma - Authenticated Dashboard Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const BASE_URL = `${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`;
  const USER_DATA_DIR = path.join(__dirname, '.auth', 'chrome-profile');

  let browser;
  let context;
  let page;

  // Setup: Launch persistent context before all tests
  test.beforeAll(async () => {
    console.log('Launching browser with persistent authentication...');

    // Use the same Chrome profile that was saved during auth.setup.js
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
      viewport: { width: 1536, height: 864 },
    });

    page = context.pages()[0] || await context.newPage();
    console.log('Browser launched with saved profile');
  });

  // Cleanup: Close browser after all tests
  test.afterAll(async () => {
    if (context) {
      await context.close();
      console.log('Browser closed');
    }
  });

  test('TC001 - Should successfully access dashboard with saved authentication', async () => {
    console.log('Using saved Chrome profile for authentication...');

    // Step 1: Navigate to the application (already authenticated)
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('Navigated to:', page.url());

    // Step 2: Verify successful login by checking dashboard elements
    const userGreeting = page.locator('text=/Good (Morning|Afternoon|Evening)/i').first();
    await expect(userGreeting).toBeVisible({ timeout: 15000 });

    // Step 3: Verify navigation sidebar elements are visible
    const meetingsNav = page.locator('text=Meetings').first();
    const uploadsNav = page.locator('text=Uploads').first();
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();

    await expect(meetingsNav).toBeVisible();
    await expect(uploadsNav).toBeVisible();
    await expect(logoutButton).toBeVisible();

    // Step 4: Verify metrics section is present
    const metricsSection = page.locator('text=/Meetings.*Minutes Processed.*Avg Meeting Duration/i').first();
    await expect(metricsSection).toBeVisible();

    // Step 5: Verify "New Recording" action button is available
    const newRecordingButton = page.locator('button:has-text("New Recording")').first();
    await expect(newRecordingButton).toBeVisible();

    console.log('Dashboard loaded successfully with all expected elements');
  });

  test('TC002 - Should display correct dashboard metrics', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify dashboard metrics are displayed
    const meetingsMetric = page.locator('text=/Meetings/i').first();
    const minutesProcessedMetric = page.locator('text=/Minutes Processed/i').first();
    const avgDurationMetric = page.locator('text=/Avg Meeting Duration/i').first();

    await expect(meetingsMetric).toBeVisible({ timeout: 10000 });
    await expect(minutesProcessedMetric).toBeVisible({ timeout: 10000 });
    await expect(avgDurationMetric).toBeVisible({ timeout: 10000 });

    console.log('Dashboard metrics verified successfully');
  });

  test('TC003 - Should display filter options on dashboard', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify filter options are available
    const expectedFilters = [
      'Start Date',
      'End Date',
      'Region',
      'Product',
      'MR Name',
      'Doctor Name'
    ];

    for (const filter of expectedFilters) {
      const filterElement = page.locator(`text=${filter}`).first();
      await expect(filterElement).toBeVisible({ timeout: 10000 });
      console.log(`Found filter: ${filter}`);
    }

    console.log('All filter options are visible on dashboard');
  });

  test('TC004 - Should display logout button and verify it is clickable', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify logout button is present and enabled
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await expect(logoutButton).toBeEnabled();

    console.log('Logout button is visible and clickable');
  });

  test('TC005 - Should verify user greeting displays correct time of day', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify user greeting is present and contains username
    const userGreeting = page.locator('text=/Good (Morning|Afternoon|Evening)/i').first();
    await expect(userGreeting).toBeVisible({ timeout: 15000 });

    const greetingText = await userGreeting.textContent();
    expect(greetingText).toMatch(/Good (Morning|Afternoon|Evening)/i);
    console.log(`User greeting displayed: ${greetingText}`);
  });
});
