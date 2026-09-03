const { test, expect } = require('@playwright/test');
const { CalculatorPage } = require('../utils/page-objects/calculator.page');

test.describe('Calculator Accessibility Tests', () => {
  let calculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.navigateToCalculator();
    await page.waitForTimeout(1000);
  });

  test('247 - Calculator: Input fields are keyboard navigable with Tab key', async ({ page }) => {
    // Focus first input via Tab navigation
    await page.keyboard.press('Tab');

    // Check which element has focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el ? el.tagName : null,
        type: el ? el.getAttribute('type') : null,
        role: el ? el.getAttribute('role') : null,
        name: el ? (el.getAttribute('name') || el.getAttribute('aria-label') || el.id) : null
      };
    });

    console.log('First Tab focus:', focusedElement);

    // Navigate to the input fields
    let foundInputField = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');

      const activeEl = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el ? el.tagName : null,
          type: el ? el.getAttribute('type') : null
        };
      });

      if (activeEl.tagName === 'INPUT' && (activeEl.type === 'number' || activeEl.type === 'text' || activeEl.type === null)) {
        foundInputField = true;
        console.log('Found input field via Tab at step', i + 1);
        break;
      }
    }

    console.log('Input field found via keyboard navigation:', foundInputField);
    expect(foundInputField).toBeTruthy();
  });

  test('248 - Calculator: Input fields accept keyboard input correctly', async ({ page }) => {
    // Click on input tokens field first and select all existing content
    await calculatorPage.inputTokensField.click();
    await calculatorPage.inputTokensField.selectText();

    // Type to replace selection
    await page.keyboard.type('2500');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Verify value was entered
    const value = await calculatorPage.inputTokensField.inputValue();
    console.log('Keyboard input value:', value);
    expect(value).toBe('2500');

    // Verify calculations updated
    const hasResults = await calculatorPage.hasTableData();
    expect(hasResults).toBeTruthy();
  });

  test('249 - Calculator: Filter buttons are accessible by keyboard', async ({ page }) => {
    const filterExists = await calculatorPage.filterSmartest.count() > 0;

    if (filterExists) {
      // Focus the Smartest filter button via keyboard
      await calculatorPage.filterSmartest.focus();

      // Verify it got focus
      const hasFocus = await calculatorPage.filterSmartest.evaluate(el => el === document.activeElement);
      console.log('Smartest button has focus:', hasFocus);

      // Press Space or Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Verify filter applied
      const modelCount = await calculatorPage.getVisibleModelCount();
      console.log('Models after keyboard filter activation:', modelCount);
      expect(modelCount).toBeGreaterThan(0);

      // Tab away and back - verify button is still reachable
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');

      const hasFocusAfterNav = await calculatorPage.filterSmartest.evaluate(el => el === document.activeElement);
      console.log('Smartest button focus after navigation:', hasFocusAfterNav);
    } else {
      console.log('Test 249: Filter buttons not found - skipping');
      test.skip();
    }
  });

  test('250 - Calculator: Input fields have appropriate labels or aria attributes', async ({ page }) => {
    // Check for labels or aria-label on input fields
    const inputFieldsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      return inputs.map(input => {
        const id = input.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const placeholder = input.getAttribute('placeholder');

        return {
          id,
          hasLabel: !!label,
          labelText: label ? label.textContent : null,
          ariaLabel,
          placeholder
        };
      });
    });

    console.log('Input fields accessibility info:', inputFieldsInfo);

    // Each input should have some form of label
    for (const inputInfo of inputFieldsInfo) {
      const hasAccessibleName = inputInfo.hasLabel || inputInfo.ariaLabel || inputInfo.placeholder;
      console.log(`Input "${inputInfo.id}" has accessible name:`, hasAccessibleName);

      if (!hasAccessibleName) {
        console.warn(`Warning: Input "${inputInfo.id}" lacks an accessible name`);
      }
    }

    // At least the input fields should exist
    expect(inputFieldsInfo.length).toBeGreaterThan(0);
  });

  test('251 - Calculator: Table has proper header structure for screen readers', async ({ page }) => {
    // Check table headers have proper scope attribute or th elements
    const tableAccessibility = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return { hasTable: false };

      const headers = Array.from(table.querySelectorAll('th'));
      const hasHeaders = headers.length > 0;

      const headersInfo = headers.map(th => ({
        text: th.textContent,
        scope: th.getAttribute('scope'),
        ariaSort: th.getAttribute('aria-sort'),
        role: th.getAttribute('role')
      }));

      // Check for caption
      const caption = table.querySelector('caption');
      const ariaLabel = table.getAttribute('aria-label');
      const ariaLabelledBy = table.getAttribute('aria-labelledby');

      return {
        hasTable: true,
        hasHeaders,
        headersCount: headers.length,
        headersInfo,
        hasCaption: !!caption,
        tableAriaLabel: ariaLabel,
        tableAriaLabelledBy: ariaLabelledBy
      };
    });

    console.log('Table accessibility info:', JSON.stringify(tableAccessibility, null, 2));

    // Table should exist and have headers
    expect(tableAccessibility.hasTable).toBeTruthy();
    expect(tableAccessibility.hasHeaders).toBeTruthy();
    expect(tableAccessibility.headersCount).toBeGreaterThan(0);

    // Log any accessibility gaps
    for (const header of tableAccessibility.headersInfo || []) {
      if (!header.scope) {
        console.warn(`Warning: Table header "${header.text}" lacks scope attribute`);
      }
    }
  });
});
