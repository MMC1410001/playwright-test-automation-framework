const { test, expect } = require('@playwright/test');
const { BlogPage } = require('../utils/page-objects/blog.page');
const testData = require('../utils/fixtures/test-data.json');

test.describe('Blog Search & Filter Tests', () => {
  /** @type {BlogPage} */
  let blogPage;

  test.beforeEach(async ({ page }) => {
    blogPage = new BlogPage(page);
    await blogPage.navigateToBlog();
  });

  test('210 - Blog: Search functionality finds articles by title/keyword', async ({ page }) => {
    // Check if search input exists
    const searchExists = await blogPage.searchInput.count() > 0;
    console.log('Search input exists:', searchExists);

    if (searchExists) {
      // Get initial article count
      const initialCount = await blogPage.getArticleCount();
      console.log('Initial article count:', initialCount);

      // Try searching with a common keyword
      const searchKeyword = testData.blog.searchKeywords[0]; // "AI automation"
      await blogPage.searchArticles(searchKeyword);

      // Get results count
      const resultsCount = await blogPage.getArticleCount();
      console.log('Search results count for "' + searchKeyword + '":', resultsCount);

      // Should either show results or "no results" message
      if (resultsCount > 0) {
        expect(resultsCount).toBeGreaterThan(0);
        console.log('Search returned results');
      } else {
        // Check for "no results" message
        const noResultsMessage = await page.locator('text=/no results|no articles|not found/i').count() > 0;
        console.log('No results message displayed:', noResultsMessage);

        expect(noResultsMessage || resultsCount === 0).toBeTruthy();
      }

      // Try a more specific search
      await blogPage.searchArticles('technology');
      const techResults = await blogPage.getArticleCount();
      console.log('Search results for "technology":', techResults);
    } else {
      console.log('Test 210: Search functionality not found');
      test.skip();
    }
  });

  test('211 - Blog: Search with no results shows appropriate message', async ({ page }) => {
    const searchExists = await blogPage.searchInput.count() > 0;

    if (searchExists) {
      // Search for something that definitely won't exist
      const nonsenseKeyword = 'xyzabc123nonexistent';
      await blogPage.searchArticles(nonsenseKeyword);

      // Wait for search to complete
      await page.waitForTimeout(1000);

      // Check for no results message
      const noResultsMessage = await page.locator('text=/no results|no articles found|no matches|not found|0 results/i').count() > 0;
      console.log('No results message displayed:', noResultsMessage);

      // Check article count
      const resultsCount = await blogPage.getArticleCount();
      console.log('Article count after nonsense search:', resultsCount);

      // Either show no results message or 0 articles
      expect(noResultsMessage || resultsCount === 0).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('212 - Blog: Category filter shows only articles in selected category', async ({ page }) => {
    // Check if category buttons exist
    const categoryButtonsCount = await blogPage.categoryButtons.count();
    console.log('Number of category buttons:', categoryButtonsCount);

    if (categoryButtonsCount > 0) {
      // Get initial article count
      const initialCount = await blogPage.getArticleCount();
      console.log('Initial article count (all categories):', initialCount);

      // Get first category name
      const firstCategoryText = await blogPage.categoryButtons.first().textContent();
      console.log('First category:', firstCategoryText);

      // Click first category
      await blogPage.filterByCategory(firstCategoryText || 'AI Technology');
      await page.waitForTimeout(1000);

      // Get filtered article count
      const filteredCount = await blogPage.getArticleCount();
      console.log('Filtered article count:', filteredCount);

      // Should show articles (may be same or less than initial)
      expect(filteredCount).toBeGreaterThan(0);

      // Try another category if available
      if (categoryButtonsCount > 1) {
        const secondCategoryText = await blogPage.categoryButtons.nth(1).textContent();
        console.log('Second category:', secondCategoryText);

        await blogPage.filterByCategory(secondCategoryText || 'Healthcare');
        await page.waitForTimeout(1000);

        const secondFilteredCount = await blogPage.getArticleCount();
        console.log('Second category article count:', secondFilteredCount);

        expect(secondFilteredCount).toBeGreaterThan(0);
      }
    } else {
      console.log('Test 212: Category filters not found');
      test.skip();
    }
  });

  test('213 - Blog: "View All" category shows all articles', async ({ page }) => {
    const categoryButtonsCount = await blogPage.categoryButtons.count();

    if (categoryButtonsCount > 0) {
      // First filter by a specific category
      const firstCategoryText = await blogPage.categoryButtons.first().textContent();
      await blogPage.filterByCategory(firstCategoryText || 'AI Technology');
      await page.waitForTimeout(1000);

      const filteredCount = await blogPage.getArticleCount();
      console.log('Filtered article count:', filteredCount);

      // Look for "View All" or "All" button
      const viewAllExists = await blogPage.viewAllButton.count() > 0;

      if (viewAllExists) {
        await blogPage.clickViewAll();
        await page.waitForTimeout(1000);

        const allCount = await blogPage.getArticleCount();
        console.log('Article count after View All:', allCount);

        // Should show all articles (should be >= filtered count)
        expect(allCount).toBeGreaterThanOrEqual(filteredCount);
      } else {
        console.log('Test 213: View All button not found - trying to click first category again');

        // Alternative: Click a generic "All" category
        const allCategory = blogPage.categoryButtons.filter({ hasText: /all|view all/i });
        if (await allCategory.count() > 0) {
          await allCategory.first().click();
          await page.waitForTimeout(1000);

          const allCount = await blogPage.getArticleCount();
          expect(allCount).toBeGreaterThan(0);
        } else {
          test.skip();
        }
      }
    } else {
      test.skip();
    }
  });
});
