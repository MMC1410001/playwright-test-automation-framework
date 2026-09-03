const { BasePage } = require('./base.page');
const { expect } = require('@playwright/test');

/**
 * Calculator Page Object
 * Handles all interactions with the LLM Calculator page
 */
class CalculatorPage extends BasePage {
  constructor(page) {
    super(page);

    // Input fields
    this.inputTokensField = page.getByRole('spinbutton').nth(0);
    this.outputTokensField = page.getByRole('spinbutton').nth(1);
    this.apiCallsField = page.getByRole('spinbutton').nth(2);

    // Model Preference buttons (filters)
    this.filterAll = page.getByRole('button', { name: 'All' });
    this.filterSmartest = page.getByRole('button', { name: 'Smartest' });
    this.filterCheapest = page.getByRole('button', { name: 'Cheapest' });
    this.filterFastest = page.getByRole('button', { name: 'Fastest' });

    // Provider dropdown
    this.providerDropdown = page.locator('select#provider, select[name="provider"], select[id*="provider"]').first();

    // Results table
    this.resultsTable = page.locator('table tbody tr');
    this.tableHeaders = page.locator('table thead th');
    this.tableBody = page.locator('table tbody');

    // Cost cells
    this.totalCostCells = page.locator('table tbody tr td:last-child');
  }

  /**
   * Navigate to the Calculator page
   */
  async navigateToCalculator() {
    await this.navigate('/calculator');
  }

  /**
   * Set input tokens value
   * @param {number} value - The number of input tokens
   */
  async setInputTokens(value) {
    await this.inputTokensField.clear();
    await this.inputTokensField.fill(String(value));
    await this.page.waitForTimeout(500); // Wait for calculations
  }

  /**
   * Set output tokens value
   * @param {number} value - The number of output tokens
   */
  async setOutputTokens(value) {
    await this.outputTokensField.clear();
    await this.outputTokensField.fill(String(value));
    await this.page.waitForTimeout(500); // Wait for calculations
  }

  /**
   * Set API calls value
   * @param {number} value - The number of API calls
   */
  async setApiCalls(value) {
    await this.apiCallsField.clear();
    await this.apiCallsField.fill(String(value));
    await this.page.waitForTimeout(500); // Wait for calculations
  }

  /**
   * Set all calculator inputs at once
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @param {number} apiCalls - API calls
   */
  async setAllInputs(inputTokens, outputTokens, apiCalls) {
    await this.setInputTokens(inputTokens);
    await this.setOutputTokens(outputTokens);
    await this.setApiCalls(apiCalls);
  }

  /**
   * Select a model preference filter
   * @param {'All'|'Smartest'|'Cheapest'|'Fastest'} preference - The preference to select
   */
  async selectModelPreference(preference) {
    const filterMap = {
      'All': this.filterAll,
      'Smartest': this.filterSmartest,
      'Cheapest': this.filterCheapest,
      'Fastest': this.filterFastest
    };

    const button = filterMap[preference];
    if (!button) {
      throw new Error(`Unknown preference: ${preference}`);
    }

    await button.click();
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  /**
   * Select a provider from dropdown
   * @param {string} provider - Provider name (e.g., 'OpenAI', 'Anthropic', 'Meta')
   */
  async selectProvider(provider) {
    await this.providerDropdown.selectOption(provider);
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  /**
   * Get the count of visible model rows
   * @returns {Promise<number>} Number of visible models
   */
  async getVisibleModelCount() {
    return await this.resultsTable.count();
  }

  /**
   * Get the total cost from the first row
   * @returns {Promise<string>} The total cost as string
   */
  async getFirstRowTotalCost() {
    const costCell = this.resultsTable.first().locator('td').last();
    return await costCell.textContent();
  }

  /**
   * Get all total costs from the table
   * @returns {Promise<number[]>} Array of costs as numbers
   */
  async getAllTotalCosts() {
    return await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const lastCell = row.cells[row.cells.length - 1];
        const text = lastCell.textContent || '';
        return parseFloat(text.replace('$', '').replace(',', ''));
      });
    });
  }

  /**
   * Get model name from a specific row
   * @param {number} rowIndex - The row index (0-based)
   * @returns {Promise<string>} The model name
   */
  async getModelName(rowIndex) {
    const modelCell = this.resultsTable.nth(rowIndex).locator('td').nth(1); // Assuming model name is in 2nd column
    return await modelCell.textContent();
  }

  /**
   * Get provider name from a specific row
   * @param {number} rowIndex - The row index (0-based)
   * @returns {Promise<string>} The provider name
   */
  async getProviderName(rowIndex) {
    const providerCell = this.resultsTable.nth(rowIndex).locator('td').nth(0); // Assuming provider is in 1st column
    return await providerCell.textContent();
  }

  /**
   * Get the index of a column by its header text (partial match)
   * @param {string} headerText - Partial text of the header
   * @returns {Promise<number>} - 0-based index of the column
   */
  async getColumnIndex(headerText) {
    const headers = await this.tableHeaders.allTextContents();
    const index = headers.findIndex(h => h.toLowerCase().includes(headerText.toLowerCase()));
    if (index === -1) {
      throw new Error(`Column with header "${headerText}" not found. Available headers: ${headers.join(', ')}`);
    }
    return index;
  }

  /**
   * Sort table by column name
   * @param {string} columnName - Column name to sort by (e.g., 'Total Cost', 'Input/1k')
   */
  async sortByColumn(columnName) {
    const headers = await this.tableHeaders.allTextContents();
    const index = headers.findIndex(h => h.toLowerCase().includes(columnName.toLowerCase()));
    
    if (index !== -1) {
      await this.tableHeaders.nth(index).click();
      await this.page.waitForTimeout(500); // Wait for sort to apply
    } else {
      throw new Error(`Could not find column header matching "${columnName}" to sort.`);
    }
  }

  /**
   * Verify row hover effect
   * @returns {Promise<string>} Background color on hover
   */
  async verifyRowHoverEffect() {
    const firstRow = this.resultsTable.first();
    await firstRow.hover();
    await this.page.waitForTimeout(200); // Wait for hover effect
    const bgColor = await firstRow.evaluate(el => getComputedStyle(el).backgroundColor);
    return bgColor;
  }

  /**
   * Get column styling (color) for a specific column
   * @param {string} columnName - Column name
   * @returns {Promise<string>} The color value
   */
  async getColumnColor(columnName) {
    const header = this.tableHeaders.filter({ hasText: columnName });
    const color = await header.evaluate(el => getComputedStyle(el).color);
    return color;
  }

  /**
   * Check if table has data
   * @returns {Promise<boolean>} True if table has rows
   */
  async hasTableData() {
    const rowCount = await this.getVisibleModelCount();
    return rowCount > 0;
  }

  /**
   * Get all table headers
   * @returns {Promise<string[]>} Array of header texts
   */
  async getTableHeaders() {
    return await this.tableHeaders.allTextContents();
  }

  /**
   * Get input field values
   * @returns {Promise<Object>} Object with inputTokens, outputTokens, apiCalls
   */
  async getInputValues() {
    return {
      inputTokens: await this.inputTokensField.inputValue(),
      outputTokens: await this.outputTokensField.inputValue(),
      apiCalls: await this.apiCallsField.inputValue()
    };
  }

  /**
   * Verify numeric formatting (e.g., $0.0000)
   * @param {string} value - The value to check
   * @returns {boolean} True if format is correct
   */
  verifyNumericFormat(value) {
    // Check if value matches pattern like $0.0000 or $1,234.5678
    const pattern = /^\$\d{1,3}(,\d{3})*\.\d{4}$/;
    return pattern.test(value);
  }

  /**
   * Get "Best for" description for a specific row
   * @param {number} rowIndex - The row index (0-based)
   * @returns {Promise<string>} The "Best for" description
   */
  async getBestForDescription(rowIndex) {
    // Adjust column index based on actual table structure
    const bestForCell = this.resultsTable.nth(rowIndex).locator('td').nth(2);
    return await bestForCell.textContent();
  }

  /**
   * Check if all provider options are available in dropdown
   * @returns {Promise<string[]>} Array of available providers
   */
  async getAvailableProviders() {
    return await this.providerDropdown.locator('option').allTextContents();
  }

  /**
   * Verify if calculations update within expected time
   * @param {number} maxTime - Maximum time in ms (default 100ms)
   * @returns {Promise<boolean>} True if update was within time limit
   */
  async verifyCalculationSpeed(maxTime = 100) {
    const startTime = Date.now();
    await this.setInputTokens(5000);
    const endTime = Date.now();
    return (endTime - startTime) <= maxTime;
  }
}

module.exports = { CalculatorPage };
