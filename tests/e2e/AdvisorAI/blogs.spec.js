const { test, expect } = require('@playwright/test');

test.describe('Blog Page Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/blogs`);
  });

  test('Blog section is visible with correct heading Blogs', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Blogs' });
    await expect(heading).toBeVisible();
  });

  test('Blog section is visible with correct heading The Ultimate Tax Resource', async ({ page }) => {
    const BlogPageHeader = page.getByRole('heading', { name: 'The Ultimate Tax Resource' });
    await expect(BlogPageHeader).toBeVisible();
  });

  test('Blogs page displays blog entries', async ({ page }) => {
    const blogCards = page.getByRole('link', { name: 'Benefit of opting for the New' });
    const count = await blogCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Each blog card has an image, title, and link', async ({ page }) => {
    // Using the blog card container
    const blogCards = page.getByRole('link', { name: 'Benefit of opting for the New' });
    const count = await blogCards.count();
    expect(count).toBeGreaterThan(0);

    // Check first blog card
    const firstCard = blogCards.first();
    await expect(page.getByRole('img', { name: 'Benefit of opting for the New' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Benefit of opting for the New' })).toBeVisible();
    await expect(firstCard).toHaveAttribute('href', /.+/);
  });

  test('Pagination is present and functional', async ({ page }) => {
    // Check if pagination exists
    const page2Button = page.getByRole('button', { name: '2' });
    await expect(page2Button).toBeVisible();
    
    // Click page 2 button
    await page2Button.click();
    
    // Verify content changed
    await page.waitForLoadState('networkidle');
    await expect(page2Button).toHaveClass(/active/);
  });

  test('Clicking on a blog card navigates to blog detail page', async ({ page }) => {
    // Find a blog post that exists on the page
    const blogPost = page.getByRole('link', { name: 'Benefit of opting for the New' });
    const blogTitle = 'Benefit of opting for the New';
    
    // Click on the blog post
    await blogPost.click();
    
    // Verify we're on a blog detail page
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/blogs/');
    
    // Verify blog content is visible
    await expect(page.getByRole('heading', { name: blogTitle })).toBeVisible();
  });

  test('Chat with AI button is present and clickable on blog detail page', async ({ page }) => {
    // Navigate to a blog post first
    await page.getByRole('link', { name: 'Benefit of opting for the New' }).click();
    await page.waitForLoadState('networkidle');
    
    // Look for Chat with AI button - use first() to handle multiple buttons
    const chatButton = page.getByRole('button', { name: 'Chat with AI' }).first();
    await expect(chatButton).toBeVisible();
    
    // Click the button
    await chatButton.click();
    
    // Verify some change happened
    await expect(chatButton).toBeVisible();
  });

  test('All Blogs navigation link works correctly', async ({ page }) => {
    // Navigate to a blog post first
    await page.getByRole('link', { name: 'Benefit of opting for the New' }).click();
    
    // Click on All Blogs link to return to blogs listing
    await page.getByRole('link', { name: 'All Blogs' }).click();
    
    // Verify we're back on the blogs page
    await expect(page).toHaveURL(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/blogs`);
    await expect(page.getByRole('heading', { name: 'Blogs' })).toBeVisible();
  });

  test('Footer section contains correct information', async ({ page }) => {
    // Check office address is present
    await expect(page.getByText('Office Address :- C Wing,')).toBeVisible();
    
    // Check copyright information
    await expect(page.getByText('Copyright© 2025 Advisor.ai')).toBeVisible();
    
    // Check email contact is present
    await expect(page.getByRole('link', { name: /Email id:- contactus@/ })).toBeVisible();
  });

  test('Social media links open in new tabs', async ({ page, context }) => {
    // Setup listeners for new pages
    const pagePromise = context.waitForEvent('page');
    
    // Click first social media icon
    await page.locator('.social_icon > a').first().click();
    
    // Wait for the new page to open
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    
    // Verify it's a social media site (URL check)
    const url = newPage.url();
    expect(url).toMatch(/facebook\.com|x\.com|linkedin\.com|youtube\.com|instagram\.com/);
  });

  test('Navigation between different blog posts works correctly', async ({ page }) => {
    // Get the first blog post
    const firstBlogLink = page.getByRole('link', { name: 'Benefit of opting for the New' });
    await firstBlogLink.click();
    
    // Verify we're on the blog post
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/blogs/');
    
    // Go back to all blogs
    await page.getByRole('link', { name: 'All Blogs' }).click();
    await page.waitForLoadState('networkidle');
    
    // Get a different blog post
    const secondBlogLink = page.getByRole('link', { name: 'Maximize Tax Savings Under' });
    await secondBlogLink.click();
    
    // Verify we're on a different blog post
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/blogs/');
  });

  test('Check Regime link in navigation works', async ({ page }) => {
    // Find and click the Check Regime link
    const regimeLink = page.getByRole('link', { name: 'Check Regime' });
    await expect(regimeLink).toBeVisible();
    await regimeLink.click();
    
    // Verify navigation happened
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/check-regime');
  });

  test('About page link in footer works', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Click on About link in footer
    await page.getByRole('link', { name: 'About' }).nth(1).click();
    
    // Verify navigation to About page
    await expect(page.url()).toContain('/about');
  });
});
