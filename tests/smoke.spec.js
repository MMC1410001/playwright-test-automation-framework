// Smoke test — confirms the toolchain and default target work before anything heavier.
//   npx playwright test tests/smoke.spec.js
// Runs against saucedemo.com, so it needs no credentials and no local app.
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://www.saucedemo.com';

test.describe('smoke @smoke', () => {
  test('login page renders its form controls', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#user-name')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-button')).toBeVisible();
  });

  test('rejects an unknown user with an error', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#user-name').fill('no_such_user');
    await page.locator('#password').fill('wrong_password');
    await page.locator('#login-button').click();
    await expect(page.locator('[data-test="error"]')).toContainText('do not match');
  });

  test('accepts the documented demo credentials', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('#login-button').click();
    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator('.inventory_item')).toHaveCount(6);
  });
});
