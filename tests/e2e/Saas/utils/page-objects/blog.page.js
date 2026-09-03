const { BasePage } = require('./base.page');
const { expect } = require('@playwright/test');

/**
 * Blog Page Object
 * Handles blog listing, articles, search, pagination, and social sharing
 */
class BlogPage extends BasePage {
  constructor(page) {
    super(page);

    // Blog listing elements
    this.articleCards = page.locator('article, [class*="blog-card"], [class*="post-card"]');
    this.searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    this.searchButton = page.getByRole('button', { name: /search/i }).first();
    this.categoryButtons = page.locator('button[class*="category"], [data-category], a[class*="category"]');
    this.viewAllButton = page.getByRole('button', { name: /view all|all/i }).first();
    this.backButton = page.getByRole('button', { name: /back/i }).or(page.getByRole('link', { name: /back/i })).first();

    // Pagination elements
    this.nextButton = page.getByRole('button', { name: /next/i }).first();
    this.prevButton = page.getByRole('button', { name: /previous|prev/i }).first();
    this.pageNumbers = page.locator('[class*="pagination"] button[data-page], [class*="pagination"] a[href*="page"]');
    this.paginationContainer = page.locator('[class*="pagination"], nav[aria-label*="pagination" i]').first();

    // Individual article elements
    this.articleTitle = page.locator('h1').first();
    this.articleImage = page.locator('article img, [class*="article"] img').first();
    this.publishDate = page.locator('[class*="date"], [class*="published"], time').first();
    this.readTime = page.locator('[class*="read-time"], [class*="reading-time"]').first();
    this.authorName = page.locator('[class*="author"], [rel="author"]').first();
    this.lastUpdated = page.locator('[class*="updated"], [class*="last-updated"]').first();

    // Table of Contents (TOC)
    this.tableOfContents = page.locator('[class*="table-of-contents"], nav:has-text("Table of Contents"), [class*="toc"]').first();
    this.tocItems = page.locator('[class*="table-of-contents"] a, nav:has-text("Table of Contents") a, [class*="toc"] a');
    this.tocSection = page.locator('text="Table of Contents"').first();

    // Social share elements
    this.copyLinkButton = page.locator('button[aria-label*="Copy" i], [data-share="copy"], button:has-text("Copy Link")').first();
    this.linkedinShareButton = page.locator('a[href*="linkedin.com/share"], a[aria-label*="LinkedIn" i]').first();
    this.facebookShareButton = page.locator('a[href*="facebook.com/share"], a[aria-label*="Facebook" i]').first();
    this.twitterShareButton = page.locator('a[href*="twitter.com/intent"], a[href*="x.com"], a[aria-label*="Twitter" i], a[aria-label*="X" i]').first();
    this.instagramShareButton = page.locator('a[href*="instagram.com"], a[aria-label*="Instagram" i]').first();

    // Category tags
    this.categoryTags = page.locator('[class*="category"], [class*="tag"], a[href*="/category/"]');

    // Newsletter subscription
    this.newsletterEmailInput = page.locator('footer input[type="email"], input[placeholder*="email" i]').last();
    this.subscribeButton = page.locator('footer button:has-text("Subscribe"), button:has-text("Subscribe")').last();
    this.newsletterSection = page.locator('section:has-text("Newsletter"), section:has-text("Subscribe")').first();
    this.termsWarning = page.locator('text=/terms|conditions|privacy/i').last();
  }

  /**
   * Navigate to Blog page
   */
  async navigateToBlog() {
    await this.navigate('/blog');
  }

  /**
   * Search for articles by keyword
   * @param {string} keyword - Search keyword
   */
  async searchArticles(keyword) {
    await this.searchInput.fill(keyword);

    // Try clicking search button, or press Enter if no button
    const hasSearchButton = await this.searchButton.count() > 0;
    if (hasSearchButton) {
      await this.searchButton.click();
    } else {
      await this.searchInput.press('Enter');
    }

    await this.page.waitForTimeout(1000); // Wait for results
  }

  /**
   * Click the first article card
   */
  async clickFirstArticle() {
    await this.articleCards.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click an article by index
   * @param {number} index - Article index (0-based)
   */
  async clickArticleByIndex(index) {
    await this.articleCards.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the count of visible articles
   * @returns {Promise<number>} Number of articles
   */
  async getArticleCount() {
    return await this.articleCards.count();
  }

  /**
   * Filter articles by category
   * @param {string} categoryName - Category name
   */
  async filterByCategory(categoryName) {
    const categoryButton = this.categoryButtons.filter({ hasText: categoryName });
    await categoryButton.first().click();
    await this.page.waitForTimeout(1000); // Wait for filter
  }

  /**
   * Click View All button to show all categories
   */
  async clickViewAll() {
    await this.viewAllButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click Back button to return to blog listing
   */
  async clickBackButton() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ============ Pagination Methods ============

  /**
   * Click Next Page button
   */
  async clickNextPage() {
    await this.nextButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click Previous Page button
   */
  async clickPreviousPage() {
    await this.prevButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click a specific page number
   * @param {number} pageNumber - Page number to click
   */
  async clickPageNumber(pageNumber) {
    const pageButton = this.pageNumbers.filter({ hasText: String(pageNumber) });
    await pageButton.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if pagination exists
   * @returns {Promise<boolean>} True if pagination is visible
   */
  async hasPagination() {
    try {
      return await this.paginationContainer.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  // ============ Article Page Methods ============

  /**
   * Get article metadata
   * @returns {Promise<Object>} Object with title, date, readTime, author
   */
  async getArticleMetadata() {
    const metadata = {};

    try {
      metadata.title = await this.articleTitle.textContent({ timeout: 5000 });
    } catch (e) {
      metadata.title = null;
    }

    try {
      metadata.publishDate = await this.publishDate.textContent({ timeout: 5000 });
    } catch (e) {
      metadata.publishDate = null;
    }

    try {
      metadata.readTime = await this.readTime.textContent({ timeout: 5000 });
    } catch (e) {
      metadata.readTime = null;
    }

    try {
      metadata.author = await this.authorName.textContent({ timeout: 5000 });
    } catch (e) {
      metadata.author = null;
    }

    try {
      metadata.lastUpdated = await this.lastUpdated.textContent({ timeout: 5000 });
    } catch (e) {
      metadata.lastUpdated = null;
    }

    return metadata;
  }

  /**
   * Check if article has image
   * @returns {Promise<boolean>} True if image is visible
   */
  async hasArticleImage() {
    try {
      return await this.articleImage.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  // ============ Table of Contents Methods ============

  /**
   * Check if TOC exists
   * @returns {Promise<boolean>} True if TOC is visible
   */
  async hasTableOfContents() {
    try {
      return await this.tableOfContents.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Click a TOC item by text
   * @param {string} itemText - The text of the TOC item
   */
  async clickTocItem(itemText) {
    const tocItem = this.tocItems.filter({ hasText: itemText });
    await tocItem.first().click();
    await this.page.waitForTimeout(500); // Wait for scroll
  }

  /**
   * Get all TOC items
   * @returns {Promise<string[]>} Array of TOC item texts
   */
  async getTocItems() {
    return await this.tocItems.allTextContents();
  }

  /**
   * Check which TOC item is currently highlighted
   * @returns {Promise<string|null>} Text of highlighted item or null
   */
  async getHighlightedTocItem() {
    try {
      const highlightedItem = await this.page.locator('[class*="toc"] a[class*="active"], [class*="table-of-contents"] a[class*="active"]').first();
      return await highlightedItem.textContent();
    } catch (error) {
      return null;
    }
  }

  // ============ Social Share Methods ============

  /**
   * Copy article link to clipboard
   * @returns {Promise<string>} The copied URL
   */
  async copyArticleLink() {
    await this.copyLinkButton.click();
    await this.page.waitForTimeout(500);

    // Get clipboard content
    const clipboardText = await this.page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });

    return clipboardText;
  }

  /**
   * Click LinkedIn share button
   * @returns {Promise<Page>} The new LinkedIn page
   */
  async shareOnLinkedIn() {
    const [linkedinPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.linkedinShareButton.click()
    ]);
    return linkedinPage;
  }

  /**
   * Click Facebook share button
   * @returns {Promise<Page>} The new Facebook page
   */
  async shareOnFacebook() {
    const [facebookPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.facebookShareButton.click()
    ]);
    return facebookPage;
  }

  /**
   * Click Twitter/X share button
   * @returns {Promise<Page>} The new Twitter page
   */
  async shareOnTwitter() {
    const [twitterPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.twitterShareButton.click()
    ]);
    return twitterPage;
  }

  /**
   * Click Instagram share button (if available)
   * @returns {Promise<Page>} The new Instagram page
   */
  async shareOnInstagram() {
    const [instagramPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.instagramShareButton.click()
    ]);
    return instagramPage;
  }

  /**
   * Check if social share buttons are available
   * @returns {Promise<Object>} Object with boolean flags for each platform
   */
  async getSocialShareAvailability() {
    return {
      copyLink: await this.copyLinkButton.count() > 0,
      linkedin: await this.linkedinShareButton.count() > 0,
      facebook: await this.facebookShareButton.count() > 0,
      twitter: await this.twitterShareButton.count() > 0,
      instagram: await this.instagramShareButton.count() > 0
    };
  }

  // ============ Category Methods ============

  /**
   * Click category tag at top of article
   */
  async clickCategoryTag() {
    await this.categoryTags.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all category tags from article
   * @returns {Promise<string[]>} Array of category names
   */
  async getCategoryTags() {
    return await this.categoryTags.allTextContents();
  }

  // ============ Newsletter Methods ============

  /**
   * Subscribe to newsletter
   * @param {string} email - Email address
   */
  async subscribeToNewsletter(email) {
    // Scroll to footer
    await this.scrollToBottom();
    await this.page.waitForTimeout(500);

    await this.newsletterEmailInput.fill(email);
    await this.subscribeButton.click();
    await this.page.waitForTimeout(1000); // Wait for submission
  }

  /**
   * Check if newsletter section is visible
   * @returns {Promise<boolean>} True if newsletter section exists
   */
  async hasNewsletterSection() {
    try {
      return await this.newsletterSection.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if terms warning is displayed
   * @returns {Promise<boolean>} True if terms warning is visible
   */
  async hasTermsWarning() {
    try {
      return await this.termsWarning.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Get success/error message after newsletter subscription
   * @returns {Promise<string|null>} Message text or null
   */
  async getSubscriptionMessage() {
    try {
      const message = await this.page.locator('[role="alert"], .success, .error').first();
      return await message.textContent({ timeout: 3000 });
    } catch (error) {
      return null;
    }
  }
}

module.exports = { BlogPage };
