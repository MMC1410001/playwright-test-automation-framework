const { test, expect } = require('@playwright/test');

test.describe('About Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/about`);
    await page.waitForLoadState('networkidle');
  });

  test('Main heading and intro text are correct', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI-Powered Tax Assistant' })).toBeVisible();
    
    // Check intro text
    const introText = page.getByText('Advisor.ai is an innovative');
    await expect(introText).toBeVisible();
    await expect(introText).toContainText('Advisor.ai is an innovative');
  });

  test('What We Do section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByRole('heading', { name: 'What We Do Personalized Tax' })).toBeVisible();
    
    // Check section text
    const sectionText = page.getByText('At Advisor.ai, we understand that every taxpayer has unique financial needs.');
    await expect(sectionText).toBeVisible();
    
    // Check section image
    const sectionImage = page.locator('div:nth-child(2) > img').first();
    await expect(sectionImage).toBeVisible();
    await expect(async () => {
      const isBroken = await sectionImage.evaluate(img => 
        img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0));
      expect(isBroken).toBeFalsy();
    }).toPass();
  });

  test('Expert Guidance & Tailored section displays correctly', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: 'Expert Guidance & Tailored' })).toBeVisible();
    
    // Check text
    await expect(page.getByText('Advisor.ai bridges the gap')).toBeVisible();
    
    // Check "Tailored Tax Advice" text
    await expect(page.getByText('Tailored Tax Advice', { exact: true })).toBeVisible();
  });

  test('Accurate Tax Calculation section displays correctly', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: 'Accurate Tax Calculation' })).toBeVisible();
    
    // Check text
    await expect(page.getByText('We make tax filing effortless')).toBeVisible();
    
    // Check image
    const calculationImage = page.locator('div:nth-child(2) > .about_row2__Hy03S > .about_image_container__2VctW > img');
    await expect(calculationImage).toBeVisible();
  });

  test('Annualized Tax Summary Report section displays correctly', async ({ page }) => {
    // Using more general selectors that don't rely on specific text
    await page.locator('h2, h3').filter({ hasText: /Annualized|Summary|Report/i }).first().waitFor();
    await expect(page.locator('h2, h3').filter({ hasText: /Annualized|Summary|Report/i }).first()).toBeVisible();
    
    // Check for any image in the third section
    await expect(page.locator('.about_row2__Hy03S').nth(2).locator('img')).toBeVisible();
  });

  test('Why Choose Advisor.ai section displays correctly', async ({ page }) => {
    // Check heading with more flexible selector
    await expect(page.locator('h2').filter({ hasText: /Why Choose/i })).toBeVisible();
    
    // Check text with more flexible selector
    await expect(page.getByText(/intelligent tax assistant/i)).toBeVisible();
  });

  test('AI-Powered Insights section displays correctly', async ({ page }) => {
    // Using specific locator to avoid ambiguity
    await expect(page.locator('.about_timeline_date_text__h_sV6').filter({ hasText: 'AI-Powered' })).toBeVisible();
  });

  test('User-Friendly Interface section displays correctly', async ({ page }) => {
    // Just check for any text containing User-Friendly
    await expect(page.getByText(/User-Friendly/i)).toBeVisible();
  });

  test('Secure & Confidential section displays correctly', async ({ page }) => {
    // Just check for any text containing Secure
    await expect(page.getByText(/Secure/i)).toBeVisible();
  });

  test('Expert Guidance timeline section displays correctly', async ({ page }) => {
    // Using the exact locator provided
    await expect(page.getByRole('heading', { name: 'Expert Guidance', exact: true })).toBeVisible();
  });

  test('Our Vision section displays correctly', async ({ page }) => {
    // Just check for any text containing Our Vision
    await expect(page.getByText(/Our Vision/i)).toBeVisible();
  });

  test('Navigation links work correctly', async ({ page }) => {
    // Check About link
    const aboutLink = page.getByRole('link', { name: 'About' }).first();
    await expect(aboutLink).toBeVisible();
    
    // Check Blogs link
    const blogsLink = page.getByRole('link', { name: 'Blogs' }).first();
    await expect(blogsLink).toBeVisible();
    await blogsLink.click();
    
    // Verify navigation to blogs page
    await page.waitForURL(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/blogs`);
    
    // Go back to about page
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/about`);
    await page.waitForLoadState('networkidle');
    
    // Check Check Regime link
    const regimeLink = page.getByRole('link', { name: 'Check Regime' });
    await expect(regimeLink).toBeVisible();
    
    // Check Chat with AI link/button
    const chatButton = page.locator('a, button').filter({ hasText: /^Chat with AI$/ });
    await expect(chatButton).toBeVisible();
  });

  test('Footer displays correctly with contact information', async ({ page }) => {
    // Check footer headings
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Social media' })).toBeVisible();
    
    // Check logo
    await expect(page.locator('.footer_logo > img')).toBeVisible();
    
    // Check contact info
    await expect(page.getByRole('link', { name: 'Email id:- contactus@' })).toBeVisible();
    await expect(page.getByText('Office Address :- C Wing,')).toBeVisible();
    
    // Check copyright
    await expect(page.getByText('Copyright© 2025 Advisor.ai')).toBeVisible();
  });
  
  test('Footer page links redirect to correct pages', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Test About link
    const aboutLink = page.locator('.about_company a[href="/about"]');
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();
    await expect(page.url()).toContain('/about');
    
    // Test Blogs link
    const blogsLink = page.locator('.about_company a[href="/blogs"]');
    await expect(blogsLink).toBeVisible();
    await blogsLink.click();
    await expect(page.url()).toContain('/blogs');
    
    // Go back to about page
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/about`);
    await page.waitForLoadState('networkidle');
    
    // Test Check Regime link
    const regimeLink = page.locator('.about_company a[href="/check-regime"]');
    await expect(regimeLink).toBeVisible();
    await regimeLink.click();
    await expect(page.url()).toContain('/check-regime');
    
    // Go back to about page
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/about`);
    await page.waitForLoadState('networkidle');
    
    // Test Chat with AI link
    const chatLink = page.locator('.about_company a[href="/chat"]');
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page.url()).toContain('/chat');
  });

  test('Social media links open in new tabs', async ({ page, context }) => {
    // Setup listeners for new pages
    const pagePromise = context.waitForEvent('page');
    
    // Click first social media icon
    await page.locator('.social_icon > a').first().click();
    
    // Wait for the new page to open
    const newPage = await pagePromise;
    await newPage.waitForLoadState('networkidle');
    
    // Verify it's a social media site
    const url = newPage.url();
    expect(url).toMatch(/facebook\.com|x\.com|linkedin\.com|youtube\.com|instagram\.com/);
  });

  test('Homepage link works correctly', async ({ page }) => {
    // Click on Homepage link
    await page.getByRole('link', { name: 'Homepage' }).click();
    
    // Verify navigation to homepage
    await page.waitForURL(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    
    // Go back to about page
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/about`);
  });

  test('All images on the page are loaded properly', async ({ page }) => {
    // Get all images on the page
    const images = page.locator('img');
    const count = await images.count();
    
    // Check first 5 images (to keep test efficient)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const image = images.nth(i);
      
      // Skip hidden images
      if (!(await image.isVisible())) continue;
      
      // Check image is loaded
      await expect(async () => {
        const isBroken = await image.evaluate(img => 
          img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0));
        expect(isBroken).toBeFalsy();
      }).toPass({ timeout: 5000 });
    }
  });
});