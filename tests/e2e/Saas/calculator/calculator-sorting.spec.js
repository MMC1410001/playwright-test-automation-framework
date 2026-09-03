const { test, expect } = require('@playwright/test');
const { CalculatorPage } = require('../utils/page-objects/calculator.page');

test.describe('Calculator Table Sorting Tests', () => {
  /** @type {CalculatorPage} */
  let calculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.navigateToCalculator();

    // Set consistent input values for sorting tests
    await calculatorPage.setAllInputs(1000, 500, 100);
    
    await page.waitForTimeout(1000);
  });

  test('238 - Calculator: Click "Input/1k" column header sorts models by input cost', async ({ page }) => {
    try {
      // Get the correct column index for Input/1k
      const columnIndex = await calculatorPage.getColumnIndex('Input/1k');
      
      // Get costs before sorting
      const getCosts = async () => {
        return await page.evaluate((index) => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(row => {
            const cell = row.cells[index];
            if (!cell || !cell.textContent) return null;
            const text = cell.textContent.replace(/[$,]/g, '');
            return parseFloat(text);
          }).filter((val) => val !== null && !isNaN(val));
        }, columnIndex);
      };

      const costsBeforeSort = await getCosts();
      console.log('Input costs before sort:', costsBeforeSort.slice(0, 5));

      // Click header to sort using specific column name
      await calculatorPage.sortByColumn('Input/1k');
      await page.waitForTimeout(500);

      // Get costs after sorting
      const costsAfterSort = await getCosts();
      console.log('Input costs after sort:', costsAfterSort.slice(0, 5));

      // Verify records were found
      expect(costsAfterSort.length).toBeGreaterThan(0);

      // Verify order is either ascending or descending
      const isAscending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const isDescending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      console.log('Is ascending:', isAscending);
      console.log('Is descending:', isDescending);

      expect(isAscending || isDescending).toBeTruthy();
    } catch (error) {
      console.error('Test 238: Could not sort by Input column - error:', error.message);
      throw error;
    }
  });

  test('239 - Calculator: Click "Output/1k" column header sorts models by output cost', async ({ page }) => {
    try {
      // Get correct column index for Output/1k
      const columnIndex = await calculatorPage.getColumnIndex('Output/1k');
      
      const getCosts = async () => {
        return await page.evaluate((index) => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(row => {
            const cell = row.cells[index];
            if (!cell || !cell.textContent) return null;
            const text = cell.textContent.replace(/[$,]/g, '');
            return parseFloat(text);
          }).filter((val) => val !== null && !isNaN(val));
        }, columnIndex);
      };

      const costsBeforeSort = await getCosts();
      console.log('Output costs before sort:', costsBeforeSort.slice(0, 5));

      // Click header to sort using specific column name
      await calculatorPage.sortByColumn('Output/1k');
      await page.waitForTimeout(500);

      const costsAfterSort = await getCosts();
      console.log('Output costs after sort:', costsAfterSort.slice(0, 5));

      expect(costsAfterSort.length).toBeGreaterThan(0);

      const isAscending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const isDescending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      console.log('Is ascending:', isAscending);
      console.log('Is descending:', isDescending);

      expect(isAscending || isDescending).toBeTruthy();
    } catch (error) {
      console.error('Test 239: Could not sort by Output column - error:', error.message);
      throw error;
    }
  });

  test('240 - Calculator: Click "Cost/Call" column header sorts models by cost per API call', async ({ page }) => {
    try {
      // Get correct column index for Cost/Call
      const columnIndex = await calculatorPage.getColumnIndex('Cost/Call');
      
      const getCosts = async () => {
        return await page.evaluate((index) => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(row => {
            const cell = row.cells[index];
            if (!cell || !cell.textContent) return null;
            const text = cell.textContent.replace(/[$,]/g, '');
            return parseFloat(text);
          }).filter((val) => val !== null && !isNaN(val));
        }, columnIndex);
      };

      const costsBeforeSort = await getCosts();
      console.log('Cost/Call before sort:', costsBeforeSort.slice(0, 5));

      // Click header to sort using specific column name
      await calculatorPage.sortByColumn('Cost/Call');
      await page.waitForTimeout(500);

      const costsAfterSort = await getCosts();
      console.log('Cost/Call after sort:', costsAfterSort.slice(0, 5));

      expect(costsAfterSort.length).toBeGreaterThan(0);

      const isAscending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const isDescending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      expect(isAscending || isDescending).toBeTruthy();
    } catch (error) {
      console.error('Test 240: Could not sort by Cost/Call column - error:', error.message);
      throw error;
    }
  });

  test('241 - Calculator: Click "Total Cost" column header sorts models by total cost', async ({ page }) => {
    try {
      // Get total costs before sorting
      const costsBeforeSort = await calculatorPage.getAllTotalCosts();
      console.log('Total costs before sort:', costsBeforeSort.slice(0, 5));

      // Click header to sort using specific column name
      await calculatorPage.sortByColumn('Total Cost');
      await page.waitForTimeout(500);

      // Get total costs after sorting
      const costsAfterSort = await calculatorPage.getAllTotalCosts();
      console.log('Total costs after sort:', costsAfterSort.slice(0, 5));

      // Verify records were found
      expect(costsAfterSort.length).toBeGreaterThan(0);

      // Verify order is either ascending or descending
      const isAscending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const isDescending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      console.log('Is ascending:', isAscending);
      console.log('Is descending:', isDescending);

      expect(isAscending || isDescending).toBeTruthy();
    } catch (error) {
      console.error('Test 241: Could not sort by Total Cost column - error:', error.message);
      throw error;
    }
  });

  test('242 - Calculator: Clicking column header twice reverses sort order (ascending to descending)', async ({ page }) => {
    try {
      // First click - sort ascending/descending using specific column name
      await calculatorPage.sortByColumn('Total Cost');
      await page.waitForTimeout(500);

      const costsFirstSort = await calculatorPage.getAllTotalCosts();
      console.log('Costs after first click:', costsFirstSort.slice(0, 5));

      // Second click - reverse order
      await calculatorPage.sortByColumn('Total Cost');
      await page.waitForTimeout(500);

      const costsSecondSort = await calculatorPage.getAllTotalCosts();
      console.log('Costs after second click:', costsSecondSort.slice(0, 5));

      // Verify records were found
      expect(costsFirstSort.length).toBeGreaterThan(0);
      expect(costsSecondSort.length).toBeGreaterThan(0);

      // Verify order reversed
      const firstIsAscending = costsFirstSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const secondIsAscending = costsSecondSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);

      console.log('First sort ascending:', firstIsAscending);
      console.log('Second sort ascending:', secondIsAscending);

      // Order should be opposite
      expect(firstIsAscending !== secondIsAscending).toBeTruthy();
    } catch (error) {
      console.error('Test 242: Could not test reverse sorting - error:', error.message);
      throw error;
    }
  });

  test('243 - Calculator: Sorting persists when input values change', async ({ page }) => {
    try {
      // Sort by Total Cost using specific column name
      await calculatorPage.sortByColumn('Total Cost');
      await page.waitForTimeout(500);

      const costsAfterSort = await calculatorPage.getAllTotalCosts();
      expect(costsAfterSort.length).toBeGreaterThan(0);

      // Verify initial sort order
      const initialIsAscending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const initialIsDescending = costsAfterSort.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      console.log('Initial sort ascending:', initialIsAscending);
      console.log('Initial sort descending:', initialIsDescending);

      // Change input values
      await calculatorPage.setInputTokens(5000);
      await calculatorPage.setOutputTokens(2000);
      await page.waitForTimeout(1000);

      // Get costs after input change
      const costsAfterInputChange = await calculatorPage.getAllTotalCosts();

      // Verify sort order is maintained
      const finalIsAscending = costsAfterInputChange.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
      const finalIsDescending = costsAfterInputChange.every((val, i, arr) => i === 0 || arr[i - 1] >= val);

      console.log('Final sort ascending:', finalIsAscending);
      console.log('Final sort descending:', finalIsDescending);

      // Sort order should match (both ascending or both descending)
      expect(initialIsAscending === finalIsAscending || initialIsDescending === finalIsDescending).toBeTruthy();
    } catch (error) {
      console.error('Test 243: Could not verify sorting persistence - error:', error.message);
      throw error;
    }
  });
});
