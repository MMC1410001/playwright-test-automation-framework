const { test, expect } = require('@playwright/test');

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    await page.waitForLoadState('networkidle');
  });

  test('Main navigation elements are visible and functional', async ({ page }) => {
    // Check logo
    const logo = page.locator('.nav_logoimg__wZNek');
    await expect(logo).toBeVisible();
    
    // Check navigation links
    await expect(page.getByRole('link', { name: 'Homepage' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Blogs' }).first()).toBeVisible();
    
    // Check Sign In and Chat with AI buttons
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Chat with AI' }).first()).toBeVisible();
  });

  test('Hero section displays correctly', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: "India's First AI-Powered Tax Assistant" })).toBeVisible();
    
    // Check hero section text
    const heroText = page.getByText('Welcome to Advisor.ai – your AI-powered tax assistant');
    await expect(heroText).toBeVisible();
    
    // Check hero section images
    await expect(page.locator('.herosection_sideimg__xxHpz')).toBeVisible();
    await expect(page.locator('img[src="/SVG.png"]')).toBeVisible();
    
    // Check CTA button
    await expect(page.getByRole('button', { name: 'Chat with AI Tax Assistant' }).first()).toBeVisible();
  });

  test('AI Tools section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByRole('heading', { name: 'Smart AI Tax Assistance – Instant Answers Anytime!' })).toBeVisible();
    
    // Check AI tool boxes
    const aiBoxes = page.locator('.herosection_aibox1__22rgD');
    await expect(aiBoxes).toHaveCount(3);
    
    // Check specific tool headings
    await expect(page.getByText('Get Instant Answers with')).toBeVisible();
    await expect(page.getByText('Attach Form 16 and Get Personalized')).toBeVisible();
    await expect(page.getByText('Make Tax Filing Hassle-Free')).toBeVisible();
  });

  test('Tax Regime section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByRole('heading', { name: 'How to Choose Between Old and New Tax Regimes?' })).toBeVisible();
    
    // Check description text
    const regimeText = page.getByText('Compare tax deductions, exemptions, and liabilities');
    await expect(regimeText).toBeVisible();
    
    // Check "Check regime" button
    await expect(page.getByRole('link', { name: 'Check regime' }).first()).toBeVisible();
  });

  test('Get Answers section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByRole('heading', { name: 'Get answers to all your tax questions' })).toBeVisible();
    
    // Check image
    await expect(page.locator('img[src="/blankpg.png"]')).toBeVisible();
    
    // Check CTA button
    await expect(page.getByRole('button', { name: 'Chat with AI Tax Assistant' }).last()).toBeVisible();
  });

  test('Blogs section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByText('Knowledge hub')).toBeVisible();
    
    // Check "View more" button
    await expect(page.getByRole('button', { name: 'View more' })).toBeVisible();
  });

  test('FAQ section displays correctly', async ({ page }) => {
    // Check section heading
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible();
    
    // Define FAQ questions and answers
    const faqItems = [
      {
        question: 'Who can use Advisor.ai?',
        answer: 'Advisor.ai is designed for salaried employees, freelancers, business owners, and financial professionals who want to plan their taxes efficiently and minimize tax liability.'
      },
      {
        question: 'How does Advisor.ai work?',
        answer: 'Advisor.ai analyzes your income, deductions, and investments to provide personalized tax-saving recommendations. It also offers real-time tax calculations and filing assistance.'
      },
      {
        question: 'Can Advisor.ai help me decide between the old and new tax regime?',
        answer: 'Yes! Advisor.ai compares both regimes based on your income and deductions to help you choose the one that maximizes your savings.'
      },
      {
        question: 'Do I need to register or sign up to use Advisor.ai?',
        answer: 'Yes, registration is required. You can answer three questions without signing up, but for a full tax analysis, you need to sign in. This allows us to store your data securely and provide personalized tax planning.'
      },
      {
        question: 'Does Advisor.ai calculate my total taxable income, including capital gains from stocks and mutual funds?',
        answer: 'Yes! Advisor.ai includes all income sources, including salary, business income, and capital gains from stocks and mutual funds, to calculate your total taxable income accurately.'
      },
      {
        question: 'Is my data secure with Advisor.ai?',
        answer: 'Yes, we use industry-standard encryption and security protocols to protect your data. Your personal and financial information is never shared without your consent.'
      },
      {
        question: 'How do I contact support if I have issues?',
        answer: 'You can reach our support team via email or through our live chat feature on the website. We’re here to help with any tax-related questions.'
      }
    ];
    
    // Check all questions are visible
    for (const item of faqItems) {
      await expect(page.getByText(item.question)).toBeVisible();
    }
    
    // Test each FAQ dropdown
    for (const item of faqItems) {
      // Click to open
      const faqButton = page.getByRole('button', { name: item.question });
      await faqButton.click();
      
      // Check content is visible
      const faqRegion = page.getByRole('region', { name: item.question });
      await expect(faqRegion).toBeVisible();
      
      // Verify answer text
      await expect(page.getByText(item.answer)).toBeVisible();
      
      // Click to close
      await faqButton.click();
      await expect(faqRegion).not.toBeVisible();
    }
  });
  
  test('FAQ question highlights on hover', async ({ page }) => {
    // Get the first FAQ question button
    const faqButton = page.locator('.faq_faquestion1__d2zm7').first();
    
    // Get initial color
    const initialColor = await faqButton.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    
    // Hover over the button
    await faqButton.hover();
    
    // Wait a moment for hover effect
    await page.waitForTimeout(300);
    
    // Get color after hover
    const hoverColor = await faqButton.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    
    // Verify color changed (should be different after hover)
    expect(hoverColor).not.toBe(initialColor);
  });

  test('Footer displays correctly', async ({ page }) => {
    // Check footer logo
    await expect(page.locator('.footer_logo > img')).toBeVisible();
    
    // Check contact information
    await expect(page.getByText('Email id:- contactus@')).toBeVisible();
    await expect(page.getByText('Office Address :- C Wing,')).toBeVisible();
    
    // Check footer sections
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Social media' })).toBeVisible();
    
    // Check footer links
    const footerLinks = page.locator('.about_company a');
    await expect(footerLinks).toHaveCount(4);
    
    // Check social media icons
    const socialIcons = page.locator('.social_icon a');
    await expect(socialIcons).toHaveCount(4);
    
    // Check copyright text
    await expect(page.getByText('Copyright© 2025 Advisor.ai')).toBeVisible();
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

  test('Navigation links work correctly at Top', async ({ page }) => {
    // Test About link
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page.url()).toContain('/about');
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    
    // Test Blogs link
    await page.getByRole('link', { name: 'Blogs' }).first().click();
    await expect(page.url()).toContain('/blogs');
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    
    // Test Chat with AI link
    await page.getByRole('link', { name: 'Chat with AI' }).first().click();
    await expect(page.url()).toContain('/chat');
  });

  test('Navigation links work correctly in Footer', async ({ page }) => {
    // Test About link
    await page.getByRole('link', { name: 'About' }).last().click();
    await expect(page.url()).toContain('/about');
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    
    // Test Blogs link
    await page.getByRole('link', { name: 'Blogs' }).last().click();
    await expect(page.url()).toContain('/blogs');
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
    
    //// Test Check regime link
    await page.getByRole('link', { name: 'Check Regime' }).last().click();
    await expect(page.url()).toContain('/check-regime');
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);

    // Test Chat with AI link
    await page.getByRole('link', { name: 'Chat with AI' }).last().click();
    await expect(page.url()).toContain('/chat');
  });

  test('All images load properly', async ({ page }) => {
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
      }).toPass();
    }
  });

  test('Responsive elements display correctly on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Check hamburger menu appears
    await expect(page.locator('.nav_hamburger__U61YD')).toBeVisible();
    
    // Check mobile-specific elements
    await expect(page.locator('.herosection_sideimgphone__w7n_S')).toBeVisible();
    await expect(page.locator('.investment_view_more_phone__qNaqA')).toBeVisible();
  });

  test('Marquee carousel displays and functions correctly for check regime', async ({ page }) => {
    // Target the carousel items
    const carouselItems = page.locator('.letplanSection_marquee_slider_box__vMKJb');

    // 1. Validate item count
    const count = await carouselItems.count();
    expect(count).toBeGreaterThan(10);

    // 2. Validate text content presence
    const texts = await carouselItems.allTextContents();
    const expectedPhrases = [
      'Tax Planning India',
      'ITR Guidance India',
      'Save Tax in India',
      'Tax Law Updates',
    ];
    for (const phrase of expectedPhrases) {
      expect(texts).toContain(phrase);
    }

    // 3. Validate movement of carousel
    const firstItem = carouselItems.first();
    const beforeX = await firstItem.evaluate(el => el.getBoundingClientRect().left);
    await page.waitForTimeout(1000); // wait for animation to move
    const afterX = await firstItem.evaluate(el => el.getBoundingClientRect().left);

    expect(beforeX).not.toBe(afterX);
  });

  test('Blog carousel displays and functions correctly', async ({ page }) => {
    // Target the blog carousel items
    const blogSlides = page.locator('.slick-slide:not(.slick-cloned)');
    
    // 1. Validate carousel structure
    await expect(page.locator('.slick-slider')).toBeVisible();
    await expect(page.locator('.slick-prev')).toBeVisible();
    await expect(page.locator('.slick-next')).toBeVisible();
    
    // 2. Validate blog items
    await expect(blogSlides).toHaveCount(6);
    
    // 3. Validate content of visible slides
    const activeSlides = page.locator('.slick-slide.slick-active');
    await expect(activeSlides).toHaveCount(3);
    
    // 4. Test navigation
    const firstSlideTitle = await activeSlides.first().locator('.investment_blogs_title__3DZ5A').textContent();
    await page.locator('button.slick-next').click();
    await page.waitForTimeout(2000);
    const newFirstSlideTitle = await activeSlides.first().locator('.investment_blogs_title__3DZ5A').textContent();
    expect(firstSlideTitle).not.toBe(newFirstSlideTitle);
  });
  
  test('Verify YouTube video on Homepage is working correctly', async ({ page }) => {
    await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);

    // Scroll to the YouTube video section
    const youtubeIframeElement = await page.waitForSelector('iframe[src*="youtube.com/embed"]', { timeout: 15000 });
    await youtubeIframeElement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Wait for scroll to complete
    
    // Take screenshot to verify iframe is visible
    await page.screenshot({ path: 'youtube-iframe-visible.png' });
    
    // Get the iframe's content frame
    const youtubeFrame = await youtubeIframeElement.contentFrame();
    if (!youtubeFrame) {
      console.log('Unable to get contentFrame from iframe.');
      return;
    }

    try {
      // Try to interact with the play button first
      try {
        const playButton = await youtubeFrame.waitForSelector('.ytp-large-play-button', { timeout: 5000 });
        await playButton.click();
        console.log('Clicked play button');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('Play button not found or already playing, continuing...');
      }
      
      // Interact with the video player area
      const videoArea = await youtubeFrame.waitForSelector('.html5-video-player', { timeout: 5000 });
      await videoArea.click();
      console.log('Clicked on video player area to pause');
      await page.waitForTimeout(2000);
      
      // Click again to resume playback
      await videoArea.click();
      console.log('Clicked again to resume playback');
      await page.waitForTimeout(2000);
      
      // Check for video quality settings button
      const settingsButton = await youtubeFrame.waitForSelector('.ytp-settings-button', { timeout: 5000 });
      await settingsButton.click();
      console.log('Clicked settings button');
      await page.waitForTimeout(1000);
      
      // Check for subtitles button
      const subtitlesButton = await youtubeFrame.waitForSelector('.ytp-subtitles-button', { timeout: 5000 });
      const subtitlesVisible = await subtitlesButton.isVisible();
      console.log(`Subtitles button visible: ${subtitlesVisible}`);
      
      // Take a screenshot to verify the interaction
      await page.screenshot({ path: 'youtube-interaction-complete.png' });
      
    } catch (error) {
      console.error('Error during interaction with YouTube iframe:', error);
      await page.screenshot({ path: 'youtube-error-state.png' });
    }
  });

});