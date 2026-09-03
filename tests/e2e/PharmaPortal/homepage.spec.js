const { test, expect } = require('@playwright/test');

test.describe('Homepage Tests', () => {
test.beforeEach(async ({ page }) => {
  // Inject authentication cookies directly into the browser context
  await page.context().addCookies([
    {
      name: '_ga',
      value: 'GA1.1.1740182063.1761707848',
      domain: 'https://reqres.in',
      path: '/',
      secure: true,
      httpOnly: false,
    },
    {
      name: '_ga_65P7F4TMBM',
      value: 'GS2.1.s1762238727$o2$g0$t1762238727$j60$l0$h0',
      domain: 'https://reqres.in',
      path: '/',
      secure: true,
      httpOnly: false,
    },
    {
      name: '_ga_H8SS6RSGZL',
      value: 'GS2.1.s1763351582$o31$g1$t1763355502$j60$l0$h0',
      domain: 'https://reqres.in',
      path: '/',
      secure: true,
      httpOnly: false,
    },
    {
      name: '_dd_s',
      value:
        'logs=1&id=cec32dd6-51e9-4a95-ad94-c55eea4848db&created=1763355439819&expire=1763357099127',
      domain: 'https://reqres.in',
      path: '/',
      secure: true,
      httpOnly: false,
    },
  ]);

  // Navigate to the target host after cookies are set
  await page.goto('https://reqres.in');
  await page.waitForLoadState('networkidle');
});

  test('Main navigation elements are visible and functional', async ({ page }) => {
    // Check logo
    const logo = page.locator('./pharma_portal logo.png');
    await expect(logo).toBeVisible();
   
  });

});