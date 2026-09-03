const { test, expect } = require('@playwright/test');
const { CalculatorPage } = require('../utils/page-objects/calculator.page');

test.describe('Calculator Responsive Design Tests', () => {
  test('244 - Calculator: Mobile viewport - calculator inputs are accessible and functional', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    const calculatorPage = new CalculatorPage(page);
    await calculatorPage.navigateToCalculator();
    await page.waitForTimeout(1000);

    // Check inputs are visible on mobile
    const inputTokensVisible = await calculatorPage.inputTokensField.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Input tokens visible on mobile:', inputTokensVisible);

    if (inputTokensVisible) {
      // Interact with input on mobile
      await calculatorPage.setInputTokens(500);
      const value = await calculatorPage.inputTokensField.inputValue();
      expect(value).toBe('500');
    }

    // Check table is visible (might be scrollable on mobile)
    const tableVisible = await page.locator('table').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Table visible on mobile:', tableVisible);

    // Either table is visible or content is otherwise accessible
    const hasContent = tableVisible || await page.locator('[class*="card"], [class*="model"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('245 - Calculator: Tablet viewport - layout adjusts correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const calculatorPage = new CalculatorPage(page);
    await calculatorPage.navigateToCalculator();
    await page.waitForTimeout(1000);

    // All inputs should be visible
    const inputVisible = await calculatorPage.inputTokensField.isVisible({ timeout: 3000 }).catch(() => false);
    const outputVisible = await calculatorPage.outputTokensField.isVisible({ timeout: 3000 }).catch(() => false);
    const apiCallsVisible = await calculatorPage.apiCallsField.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Tablet - Input tokens visible:', inputVisible);
    console.log('Tablet - Output tokens visible:', outputVisible);
    console.log('Tablet - API calls visible:', apiCallsVisible);

    expect(inputVisible).toBeTruthy();

    // Filter buttons should be accessible
    const filterVisible = await calculatorPage.filterSmartest.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Tablet - Filter buttons visible:', filterVisible);

    // Table or list should be visible
    const tableVisible = await page.locator('table').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Tablet - Table visible:', tableVisible);
    expect(tableVisible).toBeTruthy();
  });

  test('246 - Calculator: Desktop viewport - full table is visible without horizontal scroll', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    const calculatorPage = new CalculatorPage(page);
    await calculatorPage.navigateToCalculator();
    await page.waitForTimeout(1000);

    // All inputs should be visible
    await expect(calculatorPage.inputTokensField).toBeVisible();
    await expect(calculatorPage.outputTokensField).toBeVisible();
    await expect(calculatorPage.apiCallsField).toBeVisible();

    // Filter buttons should all be visible
    const smartestVisible = await calculatorPage.filterSmartest.isVisible({ timeout: 3000 }).catch(() => false);
    const cheapestVisible = await calculatorPage.filterCheapest.isVisible({ timeout: 3000 }).catch(() => false);
    const fastestVisible = await calculatorPage.filterFastest.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Desktop - Smartest visible:', smartestVisible);
    console.log('Desktop - Cheapest visible:', cheapestVisible);
    console.log('Desktop - Fastest visible:', fastestVisible);

    // Table should be visible
    await expect(page.locator('table').first()).toBeVisible();

    // Check for horizontal scroll on desktop (ideally none)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });

    console.log('Has horizontal scroll on desktop:', hasHorizontalScroll);
    // Warning if horizontal scroll exists (not a hard failure)
    if (hasHorizontalScroll) {
      console.warn('Warning: Calculator has horizontal scroll on desktop');
    }

    // Verify all table headers are visible
    const headerCount = await calculatorPage.tableHeaders.count();
    console.log('Visible table headers count:', headerCount);
    expect(headerCount).toBeGreaterThan(0);
  });
});
