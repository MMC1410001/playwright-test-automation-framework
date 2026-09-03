const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Add authentication cookies to access the protected page
  await page.context().addCookies([
    {
      name: '__Host-next-auth.csrf-token',
      value: '4aef20547d017f46014287e13c9ffb0fc1e2a5d064419845fc02d2dd15cf5422%7C14289716e8df044583ae8ef32fa6afd975d8f3cb59af4f74f3447e28bb87d064',
      domain: 'https://www.saucedemo.com',
      path: '/',
      secure: true,
      httpOnly: false
    },
    {
      name: '__Secure-next-auth.callback-url',
      value: '%3A%2F%2',
      domain: 'https://www.saucedemo.com',
      path: '/',
      secure: true,
      httpOnly: false
    },
    {
      name: '__Secure-next-auth.session-token',
      value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..8_ZBqixz0RwL5zo_.gy0xPF-DcRha1MIFjfiOBtFhmbyOCS1nLOFz5F64rwvvwWaXo5Tx4fQuuEKN1QAuRXrWNZE1lD9vXGS5wg64quZ3gyYg4Rh437Xn1BP1jYj7Pzpl9c91pWvdw1fFXBQmaKN_1I1urn13M1P3iiVviG_ZqeRhvJEhbDBZHrWqKFqwiHYJkyzzDojvyK_gFfKW3HK5feHOVW0pryrj6yBlBYzB17DArc2XKNsVGSrWWvdNVKkgxzzHwDlGv0ExHjFTYHHbU0--yLSzlyLTQKHreNr8Xfc1beWRNBnl730Ynw1UYDvsfaX-zRiiFj0vcra1QgpQ_6YfxdBZ05MOBZKnpi0Nr0m_n0ElsPUwn9ycAHARmATE8W0z-9W50zOZca9FOifQ7Az35CkKnn7qIUgEWWHrgpL5QBTvxLyU7Pu_8Dj6sJQFhPDppYPPBbUPvjHpJUMRodUSE1T_xIxqS79XkPJvtn10ReSSC5lCR73U2u908Jh9sf_UM--O8rxWM8cPsDO9RhZkHW_pTkHbQ-M4VXoYcSru73W2du5PrwWDBfZ3M23sVmJPnBMP_DERLsHVj7yww_MXEYQ4_RTmFm1RhW3LEABV0oFvnT8nakh4hVIvXiIGb5DbfCWkKc0oBvRIUsRaonjsW4TZtmNNrUJ01Nn-y_vUaX9YGLP2PTFQCYiLcd7wNnsE7s7EbjVMCV3tSo0XXXAQAeBdPPlN4kpEO_xfHjq2nJKl43YHfiGH_kvqiPCdmgoukAW8X0OcuR_l0UXcoLDTM8oKYXjtQJdc-hzjOC8fP-07naWmJYIgxpoL0InaER1tisp9BMqvsFTkFAwh9dxmo5Lotrt4eWL7eAWgCrQy5iaxLs--mBXk7T0g-o0LKYthcOZSXUniYHw7fcQuk86i8w1vpGLL3ypycikNh7XyfEqU1LoT_EhfaMrNN28r_OIksuOR_h9aCU60MXfsi_GPQdw4jNVN5AEJKy6RDeC2.f7Mt5kBVodx1DaaMqgbowA',
      domain: 'https://www.saucedemo.com',
      path: '/',
      secure: true,
      httpOnly: true
    }
  ]);

  // Navigate to the homepage
  await page.goto(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`);
  await page.waitForLoadState('networkidle');
  });

test.describe('PharmaAI Homepage Tests', () => {

  test('PH_TC_01_should load homepage successfully', async ({ page }) => {
  // Test 1: Verify homepage loads successfully
  await expect(page).toHaveURL(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`);
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  await expect(page.locator('p:has-text("Real-time pharmaceutical intelligence and insights")')).toBeVisible();
  });

  // Putting this on hold as there will be changes on this page
  test('PH_TC_01.01_should verify login page layout', async ({ page }) => {
      // Navigate to login page and verify layout elements
      await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
      const logoutButton = page.locator('button:has-text("Logout")');
      await logoutButton.isVisible();
      await logoutButton.click();
      await page.locator('h1:has-text("Login Page")').isVisible();
    });

  test('PH_TC_02_should display Pharma logo and title of application on homepage', async ({ page }) => {
  // Locating the logo of application
  // Locate the SVG by its class (lucide-zap) with white text color (header logo)
  const zapIcon = page.locator('svg.lucide-zap.text-white').first();

  // Assert that the SVG is visible
  await expect(zapIcon).toBeVisible();

  // Optionally, validate its size (width & height attributes)
  await expect(zapIcon).toHaveAttribute('width', '24');
  await expect(zapIcon).toHaveAttribute('height', '24');

  // Locate Application heading and sub heading
  await expect(page.locator('h1:has-text("PharmaAI")')).toBeVisible();
  await expect(page.locator('p:has-text("Analytics Hub")')).toBeVisible();
  });

  test('PH_TC_03_should display vertical sidebar tabs with icons and labels', async ({ page }) => {
  // Test 5: Verify vertical sidebar containing multiple tabs
  const sidebar = page.locator('nav.flex-1');
  await expect(sidebar).toBeVisible();

  // Tab definitions (label + expected SVG class)
  const tabs = [
  { label: 'Signals', svgClass: 'lucide-zap' },
  { label: 'Chat', svgClass: 'lucide-bot' },
  { label: 'Jasmine', svgClass: 'lucide-audio-lines' },
  { label: 'Audio Logs', svgClass: 'lucide-disc3' },
  ];

  for (const { label, svgClass } of tabs) {
  const button = sidebar.locator('button', {
  has: page.locator('span', { hasText: label }),
  });

  // Ensure button is visible
  await expect(button).toBeVisible();

  // Ensure SVG icon exists inside button
  const icon = button.locator(`svg.${svgClass}`);
  await expect(icon).toBeVisible();

  // Ensure label is correct
  const labelSpan = button.locator('span');
  await expect(labelSpan).toHaveText(label);
  }
  });

  test('PH_TC_04_should display Signals tab heading, sub-heading, and confirm it is selected', async ({ page }) => {
  // Locate the sidebar
  const sidebar = page.locator('nav.flex-1');

  // Locate the Signals tab button
  const signalsTab = sidebar.locator('button', {
  has: page.locator('span', { hasText: 'Signals' }),
  });

  // Assert it is visible and selected (by bg-blue-600 class)
  await signalsTab.click();
  await expect(signalsTab).toBeVisible();
  await expect(signalsTab).toHaveClass(/bg-blue-600/); // active background
  await expect(signalsTab).toHaveClass(/text-white/);  // active text color
  // Test 6 & 7: Verify Signals tab heading and sub-heading
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  await expect(page.locator('p:has-text("Real-time pharmaceutical intelligence and insights")')).toBeVisible();
  });

  test('PH_TC_04_should verify social media sharing metadata', async ({ page }) => {
  // Test 4: Verify logo and project name for social media sharing
  const title = await page.title();
  expect(title).toContain('PharmaAI');

  // Check for meta description
  const metaDescription = page.locator('meta[name="description"]');
  await expect(metaDescription).toHaveAttribute('content', 'Modern Sales Control Center Dashboard for Pharmacy Companies');
  });

  // Test case 8 and 9
  test('PH_TC_05_should display filters section with Region and Product dropdowns', async ({ page }) => {
  // Check Filters heading
  await expect(page.locator('h2:has-text("Filters")')).toBeVisible();

  // Region Filter
  const regionFilter = page.locator('select').first();
  await expect(regionFilter).toBeVisible();

  const regionOptions = await regionFilter.locator('option').allTextContents();
  expect(regionOptions).toContain('All');
  expect(regionOptions).toContain('Delhi');
  expect(regionOptions).toContain('Mumbai');

  // Product Filter
  const productFilter = page.locator('select').nth(1);
  await expect(productFilter).toBeVisible();

  const productOptions = await productFilter.locator('option').allTextContents();
  expect(productOptions).toContain('ALL Products');
  expect(productOptions).toContain('Virilex');
  expect(productOptions).toContain('Osopaan-D');
  expect(productOptions).toContain('Zithrocin');
  expect(productOptions).toContain('Zymora-AP');
  });  

  // Test 10: Verify analytics dashboard with icons, numbers and percentage changes
  test('PH_TC_06_should display analytics dashboard with metrics', async ({ page }) => {
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  const cards = page.locator('.rounded-lg.p-6'); // All 4 cards
  await expect(cards).toHaveCount(4);

  const expectedCards = [
  { label: 'Signals',        percentage: '+12%', iconClass: 'lucide-zap'            },
  { label: 'Actions',        percentage: '+8%',  iconClass: 'lucide-trending-up'    },
  { label: 'Adverse Events', percentage: '-5%',  iconClass: 'lucide-triangle-alert'},
  { label: 'FAQs',           percentage: '+15%', iconClass: 'lucide-file-text'     },
  ];

  for (let i = 0; i < expectedCards.length; i++) {
  const card = cards.nth(i);
  const { label, percentage, iconClass } = expectedCards[i];

  // Card visible
  await expect(card).toBeVisible();

  // Icon SVG presence and correct class
  await expect(card.locator(`svg.${iconClass}`)).toBeVisible();

  // Percentage change
  await expect(card.locator(`text=${percentage}`)).toBeVisible();

  // Value is an integer
  const numberText = await card.locator('.text-3xl.font-bold').innerText();
  expect(Number.isInteger(parseInt(numberText, 10))).toBeTruthy();

  // Label text
  await expect(card.locator(`text=${label}`)).toBeVisible();
  await console.log(label);
  }
  });


  test('PH_TC_07_should reset filters to ALL when refresh button is clicked', async ({ page }) => {
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  // Locate Region and Product filters
  const regionFilter = page.locator('select').first();
  const productFilter = page.locator('select').nth(1);

  // 1. Assert both filters are set to ALL by default : 'All' for Region and 'ALL Products' for product
  const regionDefault = await regionFilter.inputValue();
  const productDefault = await productFilter.inputValue();
  expect(regionDefault).toContain('All');
  expect(productDefault).toContain('ALL Products');

  // 2. Select Mumbai in Region and Virilex in Product
  await regionFilter.selectOption({ label: 'Mumbai' });
  await expect(regionFilter).toHaveValue('Mumbai');
  await productFilter.selectOption({ label: 'Virilex' });
  await expect(productFilter).toHaveValue('Virilex');

  // 3. Click the Refresh button
  const refreshButton = page.locator('button:has-text("Refresh")');
  await refreshButton.click();
  await page.waitForTimeout(1000); // Wait for UI to update

  // 4. Assert both filters are reset to ALL
  const regionAfter = await regionFilter.inputValue();
  const productAfter = await productFilter.inputValue();
  expect(regionAfter).toContain('All');
  expect(productAfter).toContain('ALL Products');
  });

  test('PH_TC_08_should display Product Signals and FAQs tabs', async ({ page }) => {
  // Test 12: Verify Product Signals and FAQs tabs
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await productSignalsTab.click();

  // Validate FAQ tab is highlighted in blue
  await expect(productSignalsTab).toHaveClass(/bg-blue-500/);
  await expect(productSignalsTab).toHaveClass(/text-white/);

  // Validate Product Signals tab has white background
  await expect(faqTab).toHaveClass(/bg-gray/);
  });

  test('PH_TC_09_should display product cards with insights', async ({ page }) => {
  // Test 13: Verify Product Signals section
  const productSignalsButton = page.locator('button:has-text("Product Signals")');
  await expect(productSignalsButton).toBeVisible();
  await productSignalsButton.click();
  // Check that the button is highlighted (blue background and white text)
  await expect(productSignalsButton).toHaveClass(/bg-blue-500/);
  await expect(productSignalsButton).toHaveClass(/text-white/);
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  await expect(productCards).toHaveCount(4);

  // Check for specific products
  await expect(page.locator('h3:has-text("Osopaan-D")')).toBeVisible();
  await expect(page.locator('h3:has-text("Virilex")')).toBeVisible();
  await expect(page.locator('h3:has-text("Zithrocin")')).toBeVisible();
  await expect(page.locator('h3:has-text("Zymora-AP")')).toBeVisible();

  // Check for "View Detail Insights" buttons
  const detailButtons = page.locator('button:has-text("View Detail Insights →")');
  await expect(detailButtons).toHaveCount(4);
  });

  test('PH_TC_10_should display Product cards containing FAQs and count on FAQs tabs', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Validate FAQ tab is highlighted in blue
  await expect(faqTab).toHaveClass(/bg-blue-500/);
  await expect(faqTab).toHaveClass(/text-white/);

  // Validate Product Signals tab has white background
  await expect(productSignalsTab).toHaveClass(/bg-gray/);

  // Collect all product cards data
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const cardCount = await productCards.count();
  const cardData = [];

  for (let i = 0; i < cardCount; i++) {
  const card = productCards.nth(i);
  const header = card.locator('div').first();
  const name = await card.locator('h3').innerText();
  const className = await header.getAttribute('class');
  const colorClass = className.match(/bg-\w+-\d+/)?.[0] || '';

  console.log(`Card ${i + 1}: ProductName="${name}", Color="${colorClass}"`);
  cardData.push({ name, color: colorClass });

  // Check each question has a count
  const questions = card.locator('.bg-gray-100.p-3.rounded.flex.justify-between.items-center');
  const questionCount = await questions.count();

  for (let j = 0; j < questionCount; j++) {
  const questionText = await questions.nth(j).locator('span.text-gray-800').innerText();
  const questionCountBadge = questions.nth(j).locator('.bg-gray-800.text-white.text-sm.px-3.py-1.rounded-full');
  await expect(questionCountBadge).toBeVisible();
  const countText = await questionCountBadge.innerText();
  console.log(`  ${name} - Question: "${questionText}" | Count: ${countText}`);
  expect(Number(countText)).toBeGreaterThan(0);
  }
  }

  // Check for duplicate colors
  const colors = cardData.map(card => card.color);
  const uniqueColors = [...new Set(colors)];
  expect(uniqueColors.length).toBe(colors.length);

  // Check for duplicate names
  const names = cardData.map(card => card.name);
  const uniqueNames = [...new Set(names)];
  expect(uniqueNames.length).toBe(names.length);

  });

  test('PH_TC_11_should validate View Detail Insights button for all products & Validate back button works for Detail Insight ', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Validate each product card has View Detail Insights button
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const cardCount = await productCards.count();

  for (let i = 0; i < cardCount; i++) {
  const card = productCards.nth(i);
  const name = await card.locator('h3').innerText();
  const detailButton = card.locator('button:has-text("View Detail Insights →")');

  // Validate view button has correct classes
  await expect(detailButton).toHaveClass(/text-blue-600/);
  await expect(detailButton).toHaveClass(/text-sm/);
  await expect(detailButton).toHaveClass(/font-medium/);
  await expect(detailButton).toHaveClass(/hover:underline/);

  // Test hover effect by hovering over button
  await detailButton.hover();
  console.log(`${name} - View Detail Insights button validated with hover effect`);

  // Click View Detail Insights button for each product
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title for each product
  await expect(page.locator(`h1:has-text("${name} Detail View")`)).toBeVisible();
  console.log(`${name} Detail View title validated`);

  // Click back button to return to main page
  const backButton = page.locator('svg.lucide-arrow-left');
  await backButton.click();
  await page.waitForTimeout(1000);
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  }
  });

  test('PH_TC_11.1_should validate Download Report button on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate Download Report button and logo
  const downloadButton = page.locator('button:has-text("Download Report")');
  await expect(downloadButton).toBeVisible();
  await expect(downloadButton).toHaveClass(/bg-blue-600/);
  await expect(downloadButton.locator('svg.lucide-download')).toBeVisible();
  console.log('Download Report button and logo validated');

  // Click Download Report button
  await downloadButton.click();
  console.log('Download Report button clicked');
  });

  test('PH_TC_11.2_should validate Filters are available and working on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate Filters section
  await expect(page.locator('h3:has-text("Filters")')).toBeVisible();

  // Validate Region filter
  await expect(page.locator('label:has-text("Region")')).toBeVisible();
  const regionSelect = page.locator('select').first();
  const regionOptions = await regionSelect.locator('option').allTextContents();
  expect(regionOptions).toEqual(['ALL', 'Delhi', 'Mumbai']);

  // Validate Occurrence filter
  await expect(page.locator('label:has-text("Occurrence")')).toBeVisible();
  const occurrenceSelect = page.locator('select').nth(1);
  const occurrenceOptions = await occurrenceSelect.locator('option').allTextContents();
  expect(occurrenceOptions).toEqual(['> 1', '> 5', '> 10', '> 20']);

  // Test hover effect on Region filter options
  await regionSelect.click();
  await page.waitForTimeout(500);
  await regionSelect.selectOption('Delhi');
  await expect(regionSelect).toHaveValue('Delhi');
  console.log('Region filter: Delhi option selected and highlighted');

  // Test hover effect on Occurrence filter options
  await occurrenceSelect.click();
  await page.waitForTimeout(500);
  await occurrenceSelect.selectOption('5');
  await expect(occurrenceSelect).toHaveValue('5');
  console.log('Occurrence filter: > 5 option selected and highlighted');

  console.log('Filters validated: Region and Occurrence with correct options and selection highlighting');

  });

  test('PH_TC_11.3_should validate analytics are visible on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate analytics cards
  const analyticsCards = page.locator('.grid.grid-cols-4.gap-6 > div');
  await expect(analyticsCards).toHaveCount(4);

  // Validate Insights card
  const insightsCard = analyticsCards.nth(0);
  await expect(insightsCard).toHaveClass(/bg-blue-100/);
  const insightsValue = await insightsCard.locator('.text-3xl.font-bold.text-blue-600').innerText();
  await expect(insightsCard.locator('text=Insights')).toBeVisible();
  expect(Number(insightsValue)).toBeGreaterThan(0);
  console.log(`Insights: ${insightsValue}`);

  // Validate Actions card
  const actionsCard = analyticsCards.nth(1);
  await expect(actionsCard).toHaveClass(/bg-purple-100/);
  const actionsValue = await actionsCard.locator('.text-3xl.font-bold.text-purple-600').innerText();
  await expect(actionsCard.locator('text=Actions')).toBeVisible();
  expect(Number(actionsValue)).toBeGreaterThan(0);
  console.log(`Actions: ${actionsValue}`);

  // Validate Adverse Event card
  const adverseCard = analyticsCards.nth(2);
  await expect(adverseCard).toHaveClass(/bg-purple-100/);
  const adverseValue = await adverseCard.locator('.text-3xl.font-bold.text-purple-600').innerText();
  await expect(adverseCard.locator('text=Adverse Event')).toBeVisible();
  expect(Number(adverseValue)).toBeGreaterThan(0);
  console.log(`Adverse Event: ${adverseValue}`);

  // Validate Sentiment Score card
  const sentimentCard = analyticsCards.nth(3);
  await expect(sentimentCard).toHaveClass(/bg-green-100/);
  const sentimentValue = await sentimentCard.locator('.text-3xl.font-bold.text-green-600').innerText();
  await expect(sentimentCard.locator('text=Sentiment Score')).toBeVisible();
  expect(sentimentValue).toContain('%');
  console.log(`Sentiment Score: ${sentimentValue}`);

  console.log('Analytics validated: All 4 metrics displayed with correct values');

  });

  test('PH_TC_11.4_should validate Weekly Product Summary & Action section are visible on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate sections on detail insight page
  await expect(page.locator('h3:has-text("Weekly Product Summary")')).toBeVisible();
  await expect(page.locator('h4:has-text("Action")')).toBeVisible();
  });

  test('PH_TC_11.5_should validate Insights & Recommendations section on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate 3 tabs: Insights & Recommendations, FAQs, All Recordings
  const tabsContainer = page.locator('.flex.space-x-4.mb-6');
  await expect(tabsContainer).toBeVisible();

  const insightsTab = tabsContainer.locator('button:has-text("Insights & Recommendations")');
  const faqsTab = tabsContainer.locator('button:has-text("FAQs")');
  const recordingsTab = tabsContainer.locator('button:has-text("All Recordings")');

  await expect(insightsTab).toBeVisible();
  await expect(faqsTab).toBeVisible();
  await expect(recordingsTab).toBeVisible();

  // Validate Insights tab is highlighted in blue
  await expect(insightsTab).toHaveClass(/bg-blue-600/);
  await expect(insightsTab).toHaveClass(/text-white/);
  console.log('Insights & Recommendations tab is highlighted in blue');

  // Validate cards in Insights section
  const cards = page.locator('.bg-blue-50.p-6.rounded-lg');
  const cardCount = await cards.count();

  for (let i = 0; i < cardCount; i++) {
  const card = cards.nth(i);
  const title = await card.locator('h4.font-semibold.text-gray-900').innerText();
  const count = await card.locator('.bg-gray-800.text-white.text-sm.px-2.py-1.rounded-full').innerText();
  const productInfo = await card.locator('.text-xs.text-gray-500.mb-2').innerText();

  console.log(`Card ${i + 1}: Title="${title}", Count=${count}, Product="${productInfo}"`);
  }
  console.log(`Total cards found: ${cardCount}`);
  });

  test('PH_TC_11.6_should validate FAQs section on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate 3 tabs: Insights & Recommendations, FAQs, All Recordings
  const tabsContainer = page.locator('.flex.space-x-4.mb-6');
  await expect(tabsContainer).toBeVisible();

  const insightsTab = tabsContainer.locator('button:has-text("Insights & Recommendations")');
  const faqsTab = tabsContainer.locator('button:has-text("FAQs")');
  const recordingsTab = tabsContainer.locator('button:has-text("All Recordings")');

  await expect(insightsTab).toBeVisible();
  await expect(faqsTab).toBeVisible();
  await expect(recordingsTab).toBeVisible();

  await faqsTab.click();
  // Validate FAQs tab is highlighted in blue
  await expect(faqsTab).toHaveClass(/bg-blue-600/);
  await expect(faqsTab).toHaveClass(/text-white/);
  console.log('FAQs tab is highlighted in blue');

  // Validate FAQ questions and counts
  const faqItems = page.locator('.flex.justify-between.items-center.p-4.border-b.border-gray-200');
  const faqCount = await faqItems.count();

  for (let i = 0; i < faqCount; i++) {
  const faqItem = faqItems.nth(i);
  const question = await faqItem.locator('span.text-gray-800').innerText();
  const count = await faqItem.locator('.bg-gray-800.text-white.text-sm.px-3.py-1.rounded-full').innerText();

  console.log(`FAQ ${i + 1}: Question="${question}", Count=${count}`);
  expect(Number(count)).toBeGreaterThan(0);
  }

  console.log(`Total FAQ items found: ${faqCount}`);
  });

  test('PH_TC_11.7_should validate All Recordings section on Detail Insight for product', async ({ page }) => {
  // Store locators in variables
  const productSignalsTab = page.locator('button:has-text("Product Signals")');
  const faqTab = page.locator('button:has-text("FAQs")');

  await expect(productSignalsTab).toBeVisible();
  await expect(faqTab).toBeVisible();

  // Click FAQ tab
  await faqTab.click();

  // Get first product card
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const firstCard = productCards.first();
  const firstName = await firstCard.locator('h3').innerText();
  const detailButton = firstCard.locator('button:has-text("View Detail Insights →")');

  // Click first product's View Detail Insights button
  await detailButton.click();
  await page.waitForTimeout(1000);

  // Validate detail view title
  await expect(page.locator(`h1:has-text("${firstName} Detail View")`)).toBeVisible();
  console.log(`${firstName} Detail View title validated`);

  // Validate 3 tabs: Insights & Recommendations, FAQs, All Recordings
  const tabsContainer = page.locator('.flex.space-x-4.mb-6');
  await expect(tabsContainer).toBeVisible();

  const insightsTab = tabsContainer.locator('button:has-text("Insights & Recommendations")');
  const faqsTab = tabsContainer.locator('button:has-text("FAQs")');
  const recordingsTab = tabsContainer.locator('button:has-text("All Recordings")');

  await expect(insightsTab).toBeVisible();
  await expect(faqsTab).toBeVisible();
  await expect(recordingsTab).toBeVisible();

  await recordingsTab.click();
  // Validate FAQs tab is highlighted in blue
  await expect(recordingsTab).toHaveClass(/bg-blue-600/);
  await expect(recordingsTab).toHaveClass(/text-white/);
  console.log('All Recordings tab is highlighted in blue');

  // Validate All Recordings tab content
      
      // Currently code is pending as Recordings are not visible on UI due to a bug
  });

  test('PH_TC_12_should display Trending Signals section', async ({ page }) => {
  // Test 12: Verify Trending Signals section
  await expect(page.locator('h3:has-text("Trending Signals")')).toBeVisible();

  // Check for trending signal cards
  const trendingCards = page.locator('.bg-gray-50.border.border-gray-200.rounded-lg');
  const count = await trendingCards.count();
  expect(count).toBeGreaterThan(0);

  // Validate first trending signal card details
  const firstCard = trendingCards.first();
  // Description: should be non-empty
  const description = await firstCard.locator('p.text-sm.text-gray-800').innerText();
  expect(description.length).toBeGreaterThan(0);

  // Date: should match 'ddth Month yyyy' format (e.g., 10th June 2025)
  const dateText = await firstCard.locator('span').nth(0).innerText();
  expect(dateText).toMatch(/^\d{1,2}(st|nd|rd|th) [A-Za-z]+ \d{4}$/);

  // Role of person (e.g., RSM)
  const roleText = await firstCard.locator('span').nth(1).innerText();
  expect(roleText.length).toBeGreaterThan(0);

  // Region (e.g., Mumbai)
  const regionText = await firstCard.locator('span').nth(2).innerText();
  expect(regionText.length).toBeGreaterThan(0);

  // Insight point (e.g., Marketing Mention)
  const insightText = await firstCard.locator('span').nth(3).innerText();
  expect(insightText.length).toBeGreaterThan(0);

  // Priority with count (e.g., Priority: 10)
  const priorityLabel = await firstCard.locator('span.text-xs.text-gray-500').last().innerText();
  expect(priorityLabel).toContain('Priority:');
  const priorityCount = await firstCard.locator('span.text-blue-600.font-medium.text-sm').innerText();
  expect(Number(priorityCount)).toBeGreaterThan(0);
  });

  test('PH_TC_13_should verify PharmaAI logo redirects to homepage when clicked', async ({ page }) => {
  // Navigate to Chat tab first
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);
  await expect(page.locator('text=How can I help you today?')).toBeVisible();
  // Click on PharmaAI logo
  await page.locator('h1:has-text("PharmaAI")').click();
  await page.waitForTimeout(1000);

  // Verify redirected to homepage (Signals tab should be active)
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  });

  test('PH_TC_14_should verify send button is disabled without input', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Verify send button is disabled initially
  const sendButton = page.locator('button[aria-label="Send message"]');
  await expect(sendButton).toBeDisabled();

  // Type message and verify button becomes enabled
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.fill('Test');
  await expect(sendButton).not.toBeDisabled();
  });

  test('PH_TC_15_should verify user can send message using Enter key', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Type message and press Enter
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.fill('Hi');
  await chatInput.press('Enter');
  await page.waitForTimeout(2000);

  // Verify message was sent (input should be cleared)
  await expect(chatInput).toHaveValue('');
  });

  test('PH_TC_16_should verify trending signals have priority and role information', async ({ page }) => {
  // Verify trending signal cards contain required elements
  const trendingCards = page.locator('.bg-gray-50.border.border-gray-200.rounded-lg');
  const firstCard = trendingCards.first();

  // Verify priority section exists
  await expect(firstCard.locator('text=Priority:')).toBeVisible();

  // Verify priority value is displayed
  await expect(firstCard.locator('.text-blue-600.font-medium')).toBeVisible();

  // Verify role indicator (orange dot)
  await expect(firstCard.locator('.bg-orange-500.rounded-full')).toBeVisible();

  // Verify region indicator (gray square)
  await expect(firstCard.locator('.bg-gray-300.rounded-sm')).toBeVisible();

  // Verify classification indicator (green square)
  await expect(firstCard.locator('.bg-green-500.rounded-sm')).toBeVisible();
  });

  test('PH_TC_17_should verify product cards have different background colors', async ({ page }) => {
  const productCards = page.locator('.bg-white.rounded-lg.shadow-sm');
  const cardCount = await productCards.count();

  const cardData = [];

  for (let i = 0; i < cardCount; i++) {
  const card = productCards.nth(i);
  const header = card.locator('div').first();
  const name = await card.locator('h3').innerText();
  const className = await header.getAttribute('class');
  const colorClass = className.match(/bg-\w+-\d+/)?.[0] || '';

  console.log(`Card ${i + 1}: Name="${name}", Color="${colorClass}"`);
  cardData.push({ name, color: colorClass });
  }

  // Check for duplicate colors
  const colors = cardData.map(card => card.color);
  const uniqueColors = [...new Set(colors)];
  expect(uniqueColors.length).toBe(colors.length);

  // Check for duplicate names
  const names = cardData.map(card => card.name);
  const uniqueNames = [...new Set(names)];
  expect(uniqueNames.length).toBe(names.length);
  });

  test('PH_TC_18_should verify filters section has filter icon', async ({ page }) => {
  // Verify filters section has filter icon
  const filtersSection = page.locator('h2:has-text("Filters")');
  await expect(filtersSection.locator('..').locator('svg')).toBeVisible();
  });

  test('PH_TC_19_should verify refresh button has correct icon', async ({ page }) => {
  // Verify refresh button has refresh-cw icon
  const refreshButton = page.locator('button:has-text("Refresh")');
  await expect(refreshButton.locator('svg.lucide-refresh-cw')).toBeVisible();
  });

  test('PH_TC_24_should have chat section at bottom of page', async ({ page }) => {
  // Test 24: Verify chat section is available
  await expect(page.locator('h3:has-text("Trending Signals")')).toBeVisible();

  const chatSection = page.locator('.fixed.bottom-0');
  await expect(chatSection).toBeVisible();

  // Check for chat input elements
  await expect(page.locator('textarea[placeholder="Send a message..."]')).toBeVisible();
  await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
  await expect(page.locator('button[aria-label="Attach file"]')).toBeVisible();
  await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();

  // Check for warning message
  await expect(page.locator('text=Bot can make mistakes. Check important info.')).toBeVisible();
  });

  test('PH_TC_26_should navigate to Chat tab', async ({ page }) => {
  // Test 26-27: Verify Chat tab functionality
  const chatButton = page.locator('button:has-text("Chat")');
  await chatButton.click();

  // Wait for chat page to load
  await page.waitForTimeout(1000);

  // Check for welcome message
  await expect(page.locator('text=How can I help you today?')).toBeVisible();
  await expect(page.locator('text=Start a conversation or try one of the examples below')).toBeVisible();
  });

  test('PH_TC_27_should test chat functionality', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Test chat input
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.fill('Hi');

  // Check that send button becomes enabled
  const sendButton = page.locator('button[aria-label="Send message"]');
  await expect(sendButton).not.toBeDisabled();

  // Send message
  await sendButton.click();

  // Wait for response
  await page.waitForTimeout(5000);

  // Validate user message has human icon in chat
  const humanIcon = page.locator('svg.lucide-user');
  await expect(humanIcon).toBeVisible();
  // Simple check: 'Hi' message is visible anywhere on the UI
  await expect(page.locator('text=Hi').first()).toBeVisible();

  // Validate chatbot response contains expected intro text
  const roboIcon = page.locator('svg.lucide-bot');
  await expect(roboIcon).toBeVisible();

  // More flexible validation - check for any chatbot response
  const roboMessageBubble = roboIcon.locator('xpath=ancestor::div[contains(@class, "flex")]');

  // Wait for any chatbot response to appear
  await page.waitForTimeout(2000);

  // Check for common chatbot greeting patterns
  const possibleGreetings = [
  'Hello',
  'Hi',
  'Welcome',
  'I\'m here',
  'insights',
  'help',
  'assist'
  ];

  let foundResponse = false;
  for (const greeting of possibleGreetings) {
  try {
  const responseElement = roboMessageBubble.locator(`text=${greeting}`);
  if (await responseElement.count() > 0) {
  foundResponse = true;
  console.log(`Found chatbot response containing: ${greeting}`);
  break;
  }
  } catch (e) {
  // Continue to next greeting
  }
  }

  // If no specific greeting found, just verify there's some text in the chatbot bubble
  if (!foundResponse) {
  const allText = await roboMessageBubble.innerText();
  expect(allText.length).toBeGreaterThan(0);
  console.log(`Chatbot response text: ${allText}`);
  }
  });

  // Due to existing bug not yet completed
  test('PH_TC_29_should test file upload functionality in chat', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Test file attachment button
  const attachButton = page.locator('button[aria-label="Attach file"]');
  await expect(attachButton).toBeVisible();

  // Click attach button (file dialog will open)
  await attachButton.click();
  await page.waitForTimeout(500);
  });

  // Cant automate voice input testing yet
  test('PH_TC_30_should test voice input functionality', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Test voice input button
  const micButton = page.locator('button[aria-label="Start recording"]');
  await expect(micButton).toBeVisible();

  // Click mic button to test voice input
  await micButton.click();
  await page.waitForTimeout(500);
  });

  test('PH_TC_34_should display user profile information', async ({ page }) => {
  // Test 34: Verify user profile name and image
  const profileSection = page.locator('.p-4.border-t.border-slate-700');
  await expect(profileSection).toBeVisible();

  // Check for user name
  await expect(page.locator('text=Mayur Chaudhary')).toBeVisible();

  // Check for profile image
  const profileImage = page.locator('img[src*="googleusercontent.com"]');
  await expect(profileImage).toBeVisible();

  // Check for logout button
  await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('PH_TC_35_should test theme toggle functionality', async ({ page }) => {
  // Navigate to Chat tab to access theme toggle
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Look for theme toggle button (moon/sun icon)
  const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="Theme"]');
  if (await themeButton.isVisible()) {
  // Verify initial moon icon (light mode)
  await expect(themeButton.locator('svg.lucide-moon')).toBeVisible();

  await themeButton.click();
  await page.waitForTimeout(500);
  await expect(page.locator('html')).toHaveClass(/dark/);
  // Verify sun icon appears (dark mode)
  await expect(themeButton.locator('svg.lucide-sun')).toBeVisible();

  await themeButton.click(); // Toggle back
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  // Verify moon icon returns (light mode)
  await expect(themeButton.locator('svg.lucide-moon')).toBeVisible();
  }
  });

  test('PH_TC_36_should test new chat functionality', async ({ page }) => {
  // Navigate to Chat tab
  await page.locator('button:has-text("Chat")').click();
  await page.waitForTimeout(1000);

  // Send a message first
  const chatInput = page.locator('textarea[placeholder="Send a message..."]');
  await chatInput.fill('Test message');
  await page.locator('button[aria-label="Send message"]').click();
  await page.waitForTimeout(2000);

  // Look for New Chat button
  const newChatButton = page.locator('button:has-text("New chat")');
  if (await newChatButton.isVisible()) {
  await newChatButton.click();
  await page.waitForTimeout(1000);
  // Check for welcome message
  await expect(page.locator('text=How can I help you today?')).toBeVisible();
  }
  });

  test('PH_TC_37_should test logout functionality', async ({ page }) => {
  // Test logout button
  const logoutButton = page.locator('button:has-text("Logout")');
  await expect(logoutButton).toBeVisible();

  // Hover over logout button to test highlighting
  await logoutButton.hover();
  await page.waitForTimeout(500);
  await expect(logoutButton).toHaveClass(/hover:bg-slate-700/);
  await logoutButton.click();
  await page.waitForTimeout(1000);
  await expect(page.locator('h3:has-text("Login with")')).toBeVisible();

  });

  test('PH_TC_51_should navigate to Jasmine tab', async ({ page }) => {
  // Test 51: Verify Jasmine tab navigation
  const jasmineButton = page.locator('button:has-text("Jasmine")');
  await jasmineButton.click();

  // Wait for navigation
  await page.waitForTimeout(1000);
  });

  test('PH_TC_52_should navigate to Audio Logs tab', async ({ page }) => {
  // Test 52-53: Verify Audio Logs tab navigation
  const audioLogsButton = page.locator('button:has-text("Audio Logs")');
  await audioLogsButton.click();

  // Wait for page to load
  await page.waitForTimeout(1000);

  // Check for Audio Logs heading
  await expect(page.locator('h1:has-text("Audio Logs")')).toBeVisible();
  });

  test('PH_TC_53_should test pagination in Audio Logs', async ({ page }) => {
  // Navigate to Audio Logs
  await page.locator('button:has-text("Audio Logs")').click();
  await page.waitForTimeout(1000);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Verify initial pagination state
  await expect(page.locator('text=Showing 1 to 10 of 142 results')).toBeVisible();

  // Look for pagination elements
  const nextButton = page.locator('button:has-text("Next")').first();
  const prevButton = page.locator('button:has-text("Previous")').first();

  if (await nextButton.isVisible()) {
  await nextButton.click();
  await page.waitForTimeout(1000);
  // Verify pagination changed to second page
  await expect(page.locator('text=Showing 11 to 20 of 142 results')).toBeVisible();
  }

  if (await prevButton.isVisible()) {
  await prevButton.click();
  await page.waitForTimeout(1000);
  // Verify pagination changed to first page
  await expect(page.locator('text=Showing 1 to 10 of 142 results')).toBeVisible();
  }
  });

  test('PH_TC_54_should test audio recording functionality', async ({ page }) => {
  // Navigate to Audio Logs
  await page.locator('button:has-text("Audio Logs")').click();
  await page.waitForTimeout(1000);

  // Look for Upload Recording button
  const uploadButton = page.locator('button:has-text("Upload Recording")');
  if (await uploadButton.isVisible()) {
  await uploadButton.click();
  await page.waitForTimeout(1000);
  }
  });

  test('PH_TC_55_should verify data consistency on audio logs page', async ({ page }) => {
  await page.locator('button:has-text("Audio Logs")').click();
  await page.waitForTimeout(1000);

  // Verify audio logs metrics
  const recordingsCount = await page.locator('text=142').first().textContent();
  const transcriptionCount = await page.locator('text=131').first().textContent();
  const translationCount = await page.locator('text=131').nth(1).textContent();
  const insightsCount = await page.locator('text=120').textContent();

  // Verify metric labels
  await expect(page.locator('div.text-gray-600:has-text("Recordings")')).toBeVisible();
  await expect(page.locator('text=Transcription Completed')).toBeVisible();
  await expect(page.locator('text=Translation Completed')).toBeVisible();
  await expect(page.locator('text=Insights Extracted')).toBeVisible();

  // All metrics should be numeric
  expect(parseInt(recordingsCount)).toBeGreaterThan(0);
  expect(parseInt(transcriptionCount)).toBeGreaterThan(0);
  expect(parseInt(translationCount)).toBeGreaterThan(0);
  expect(parseInt(insightsCount)).toBeGreaterThan(0);
  });

  test('PH_TC_75_should verify accessibility features', async ({ page }) => {
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  // Test focus indicators
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toBeVisible();
  });

  test('PH_TC_76_should test error handling', async ({ page }) => {
  // Test with invalid URL
  try {
  await page.goto(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/invalid-page`);
  await page.waitForTimeout(2000);
  } catch (error) {
  // Expected error for invalid page
  console.log('Expected error for invalid page navigation');
  }
  });

  test('PH_TC_77_should verify page performance', async ({ page }) => {
  // Test 77: Verify website loads within acceptable time
  const startTime = Date.now();
  await page.goto(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`);
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  // Assert that page loads within 3 seconds (3000ms)
  expect(loadTime).toBeLessThan(3000);
  });

  test('PH_TC_78_should test mobile responsiveness', async ({ page }) => {
  // Test 78: Verify mobile compatibility
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

  // Check if sidebar is responsive
  const sidebar = page.locator('nav');
  await expect(sidebar).toBeVisible();

  // Check if main content is accessible
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();

  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('PH_TC_78_should test responsive design breakpoints', async ({ page }) => {
  // Test different screen sizes
  const breakpoints = [
  { width: 320, height: 568 },   // Small mobile
  { width: 768, height: 1024 },  // Tablet
  { width: 1024, height: 768 },  // Small desktop
  { width: 1920, height: 1080 }  // Large desktop
  ];

  for (const breakpoint of breakpoints) {
  await page.setViewportSize(breakpoint);
  await page.waitForTimeout(500);

  // Verify page is still functional
  await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  }

  // Reset to default
  await page.setViewportSize({ width: 1280, height: 720 });
  });

});
