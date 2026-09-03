const { test, expect } = require('@playwright/test');

test('Chatbot page initializes correctly', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/chatbot`);
  await expect(page.locator('#chatbot-container')).toBeVisible();
});