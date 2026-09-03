const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    {
      name: '__Host-next-auth.csrf-token',
      value: 'b84fb8a3b48a03f902b4b2db5e81a90c439a88fe1902ac739d82cf76fbff8de4%7C8ceffff929a435df6a9c81085b2593221e55519c55757336aa98e34a30faf38f',
      domain: 'https://jsonplaceholder.typicode.com',
      path: '/',
      secure: true,
      httpOnly: false
    },
    {
      name: '__Secure-next-auth.callback-url',
      value: '%2Fsearch',
      domain: 'https://jsonplaceholder.typicode.com',
      path: '/',
      secure: true,
      httpOnly: false
    },
    {
      name: '__Secure-next-auth.session-token',
      value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..uitVCHqG9eV1v0fY.eWo22ahZLv_raJ6tG6lrjXE0Fql-p_PBjPGDSsOQr9zzshMRJUdv8bEvZ9_cNd7fVTbo4rBnzaE0G2IJeaC0NLSnPuezYYn0G5vkLMKI5SJRipKJ3-qZtYILg5dXSC47lpb1orZxBIUVbO-XyrQ1ADCI-ddjV57z4ZD1QN50cWcnO8Xl_YrKCi7w_gI4995p8b_bhvZatNrX5DDMger-E-4rS-c1TIMfx75vg3okBTRdwrFar61mFfQLImQnUbvv4lqdsSiFKbbAU6GAP7vZFoV4Wljpm_oy1yjLQ02H7hmlbXPV5O7_7cbaJ6YnGehhJ1UxGwmt_6mZjrxyTkJPOopL8waI6YekizBUOW9qQAOi0kiHNXVEObSVo1Kr-TH6.6N5lgD0Sbno3XXlxSYY7lg',
      domain: 'https://jsonplaceholder.typicode.com',
      path: '/',
      secure: true,
      httpOnly: true
    }
  ]);
  await page.goto(`${process.env.WEALTH_API_URL || 'https://jsonplaceholder.typicode.com'}/search`);
  await page.waitForLoadState('networkidle');
});

test.describe('WEALTH_APP Homepage Tests', () => {
  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveURL(/.*wealth_app\.fintech_co\.app\/search/);
  });

  test('should display Greeting message to user as per time', async ({ page }) => {
    const currentHour = new Date().getHours();
    let greetingaspertime = '';
    if (currentHour >= 5 && currentHour < 12) {
      greetingaspertime = 'Morning';
    } else if (currentHour >= 12 && currentHour < 17) {
      greetingaspertime = 'Afternoon';
    } else if (currentHour >= 17 && currentHour < 21) {
      greetingaspertime = 'Evening';
    } else {
      greetingaspertime = 'Night';
    }
    console.log(await page.locator('h1').textContent());
    const greetingHeader = page.locator(`h1:has-text("Good ${greetingaspertime}, Mayur")`);
    console.log("greetingaspertime is ", greetingaspertime);
    await expect(greetingHeader).toBeVisible();
    
    const helpMessage = page.locator('p:has-text("How can I help you?")');
    await expect(helpMessage).toBeVisible();
  });

  test('Website should not be available on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const desktopMessage = page.locator('text="Can only be access via Desktop"');
    await expect(desktopMessage).toBeVisible();
  });

  test('should ask question to chatbot and get response from General agent', async ({ page }) => {
    const generalAgentButton = page.locator('text="General Agent"');
    await generalAgentButton.click();
    
    const chatInput = page.getByRole('textbox', { name: 'Ask me anything' });
    await chatInput.fill('Hi');
    
    const sendButton = page.locator('button[type="submit"], button:has-text("Send"), [aria-label*="send" i]');
    await sendButton.click();
    
    const response = page.getByText(/(Hello|Hi there)! How can I help you today\?/);
    await expect(response).toBeVisible({ timeout: 10000 });
  });

  test('should click Finance Agent and validate action performed successfully', async ({ page }) => {
    const financeAgentButton = page.locator('text="Finance Agent"');
    await financeAgentButton.click();
    
    const financeInput = page.getByPlaceholder('What finance topic can I help you explore today?');
    await expect(financeInput).toBeVisible();

    const chatInput = page.getByRole('textbox', { name: 'What finance topic can I help you explore today?' });
    await chatInput.fill('Hi');

    const sendButton = page.locator('button[type="submit"], button:has-text("Send"), [aria-label*="send" i]');
    await sendButton.click();

    const response1 = page.getByText(/(Hello|Hi there)! How can I assist you today\?/);
    const response2 = page.getByText('Hello! How can I assist you with finance today? Whether you have questions about investing, budgeting, or anything in between, I\'m here to help!');
    const response3 = page.getByText('Hello! How can I help you today? Whether you have questions about budgeting, investing, or anything else finance-related, I\'m here to assist you with a smile!');
    
    // Check if any of the responses is visible with a timeout
    await Promise.any([
      expect(response1).toBeVisible({ timeout: 10000 }),
      expect(response2).toBeVisible({ timeout: 10000 }),
      expect(response3).toBeVisible({ timeout: 10000 })
    ]).catch(() => {
      // If none is visible after timeout, fail the test
      throw new Error('None of the expected responses was visible after 10 seconds');
    });
  });

  test('should validate UI statistics elements', async ({ page, request }) => {
    const response = await request.get(`${process.env.WEALTH_API_URL || 'https://jsonplaceholder.typicode.com'}/api/v1/kpi`);
    const kpiData = await response.json();
    
    const vuaBlock = page.locator(`div:has-text("vua"):has-text("${kpiData.data.vua}")`).first();
    await expect(vuaBlock).toBeVisible();
    
    const downloadsBlock = page.locator(`div:has-text("downloads"):has-text("${kpiData.data.downloads}")`).first();
    await expect(downloadsBlock).toBeVisible();
    
    const riaBlock = page.locator(`div:has-text("ria"):has-text("${kpiData.data.ria}")`).first();
    await expect(riaBlock).toBeVisible();
    
    const starUsersBlock = page.locator(`div:has-text("starusers"):has-text("${kpiData.data.starUsers}")`).first();
    await expect(starUsersBlock).toBeVisible();
  });

  test('should validate 1 Finance Events section', async ({ page, request }) => {
    const response = await request.get(`${process.env.WEALTH_API_URL || 'https://jsonplaceholder.typicode.com'}/api/v1/our-events`);
    const eventsData = await response.json();
    
    const financeEventsHeader = page.getByText('1 Finance Events');
    await expect(financeEventsHeader).toBeVisible();
    
    for (const event of eventsData) {
      await expect(page.getByText(event.title)).toBeVisible();
      console.log("Event Title is ",event.title)
    }
  });

  test('should validate Latest News section', async ({ page }) => {
    const latestNewsHeader = page.locator('h2:has-text("Latest News")');
    await expect(latestNewsHeader).toBeVisible();
    
    await expect(page.locator('button[role="tab"]:has-text("Top Stories")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("FinTech")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Financial Services")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Insurance")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Policy")')).toBeVisible();
    await expect(page.locator('button:has-text("See more")')).toBeVisible();
  });

  test('should open Economic Times BFSI URL when See more is clicked', async ({ page, context }) => {
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('button:has-text("See more")').click()
    ]);
    
    await expect(newPage).toHaveURL(/^https:\/\/bfsi\.economictimes\.indiatimes\.com\//); 
  });

  // This will fail because recently the api dev was using is not working, and this is a known issue
  test('should validate news headlines for each subsection', async ({ page, request }) => {
    const response = await request.get(`${process.env.WEALTH_API_URL || 'https://jsonplaceholder.typicode.com'}/api/v1/rss`);
    
    const rssData = await response.json();
    const categories = ['Top Stories', 'FinTech', 'Financial Services', 'Insurance', 'Policy'];
    
    for (const category of categories) {
      await page.locator(`button[role="tab"]:has-text("${category}")`).click();
      
      const firstArticle = rssData[category][0];
      const title = firstArticle.title;
      const date = new Date(firstArticle.date);
      const formattedDate = `${date.getDate()} ${date.toLocaleString('en', { month: 'long' })} ${date.getFullYear()}`;
      
      console.log("News title is :", title);
      console.log("News title Date is :", formattedDate);
      await expect(page.getByText(title).first()).toBeVisible();
      await expect(page.locator(`p.text-xs:has-text("${formattedDate}")`).first()).toBeVisible();
    }
  });

  test('should validate user profile image,profile options and theme switching', async ({ page }) => {
    const mayurChaudharyText = page.locator('[data-sidebar="footer"] p:has-text("Mayur Chaudhary")');
    await expect(mayurChaudharyText).toBeVisible();
    
    const userImage = page.locator('img[alt="user image"]');
    await expect(userImage).toBeVisible();
    await userImage.click();

    const heyMayurOption = page.getByText('Hey Mayur', { exact: true });
    await expect(heyMayurOption).toBeVisible({ timeout: 10000 });

    const logoutOption = page.locator('[role="menuitem"]:has-text("Logout")');
    await expect(logoutOption).toBeVisible();
    
    const themeOption = page.getByText('Theme');
    await expect(themeOption).toBeVisible();
    await themeOption.click();
    
    await expect(page.getByText('Dark')).toBeVisible();
    await expect(page.getByText('System')).toBeVisible();
    await expect(page.getByText('Light')).toBeVisible();

    await themeOption.hover();
    const lightOption = page.getByRole('menuitem', { name: 'Light' });
    await expect(lightOption).toBeVisible({ timeout: 5000 });
    await lightOption.click();
    await expect(page.locator('html')).toHaveClass(/light/);
    
    // await userImage.click();   // Added twice as first time click is not working
    await userImage.click();
    await themeOption.click();
    await page.getByText('Dark').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should validate collapsible sidebar toggle', async ({ page }) => {
    const toggleButton = page.locator('button[data-sidebar="trigger"]:has-text("Toggle Sidebar")').first();
    await expect(toggleButton).toBeVisible();
    
    const historyText = page.locator('[data-sidebar="group-label"]:has-text("History")');
    await expect(historyText).toBeVisible();
    
    await toggleButton.click();
    await expect(historyText).toBeHidden();
    
    const openToggleButton = page.locator('button[data-sidebar="trigger"][title="Open sidebar"]:has-text("Toggle Sidebar")').first();
    await expect(openToggleButton).toBeVisible();
    await openToggleButton.click();
    await expect(historyText).toBeVisible();
  });

  // This test is no longer working as this feature is being removed
  test('should Create new space dialog when New Space button is clicked for Generic Chat option', async ({ page }) => {
    const newSpaceButton = page.getByText('New Space');
    await newSpaceButton.click();
    
    const createSpaceDialog = page.locator('[role="dialog"] h2:has-text("Create new space")');
    await expect(createSpaceDialog).toBeVisible();
    
    const dialogDescription = page.locator('[role="dialog"]:has-text("Create a space to organize your conversations and collaborate with others.")');
    await expect(dialogDescription).toBeVisible();
    
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.getByPlaceholder('Space title')).toBeVisible();
    await expect(page.locator('label[for="title"]:has-text("Title")')).toBeVisible();
    
    await page.getByPlaceholder('Space title').fill('Space Created Using Automation');
    
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.getByPlaceholder('What is this space about?')).toBeVisible();
    await expect(page.locator('label[for="description"]:has-text("Description")')).toBeVisible();
    
    await page.getByPlaceholder('What is this space about?').fill('Description Added Using Automation');
    
    await expect(page.locator('label[for="mode"]:has-text("Space Mode")')).toBeVisible();
    
    const spaceModeDropdown = page.locator('button[role="combobox"]#mode');
    await expect(spaceModeDropdown).toBeVisible();
    await expect(spaceModeDropdown).toHaveText('PRFAQ - Problem/Solution format');
    await spaceModeDropdown.click();
    
    await expect(page.locator('select option[value="GENERAL"]:has-text("Generic chat")')).toBeAttached();
    await expect(page.locator('select option[value="PRFAQ"]:has-text("PRFAQ - Problem/Solution format")')).toBeAttached();
    
    await page.getByText('Generic chat').last().click();
    
    await expect(page.locator('button[type="submit"]:has-text("Create Space")')).toBeVisible();
    
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const toast = page.locator('div[data-title]:has-text("PRFAQ Topic is required")');
    await expect(toast).toBeVisible({ timeout: 2000 });
    await expect(createSpaceDialog).toBeVisible();
    // Commented as space will not be created for generic chat now due tp functionality change
    // await expect(createSpaceDialog).toBeHidden();
  });

  test('should delete space named Space Created Using Automation', async ({ page }) => {
    const newSpaceButton = page.locator('button').filter({ hasText: 'New Space' });
    await newSpaceButton.click();
    
    const createSpaceDialog = page.locator('[role="dialog"] h2:has-text("Create new space")');
    await expect(createSpaceDialog).toBeVisible();

    const dialogDescription = page.locator('[role="dialog"]:has-text("Create a space to organize your conversations and collaborate with others.")');
    await expect(dialogDescription).toBeVisible();
    
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.getByPlaceholder('Space title')).toBeVisible();
    await expect(page.locator('label[for="title"]:has-text("Title")')).toBeVisible();
    
    await page.getByPlaceholder('Space title').fill('Thread creation space');
    
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.getByPlaceholder('What is this space about?')).toBeVisible();
    await expect(page.locator('label[for="description"]:has-text("Description")')).toBeVisible();
    
    await page.getByPlaceholder('What is this space about?').fill('Description of space for thread');
    
    await expect(page.locator('label[for="mode"]:has-text("Space Mode")')).toBeVisible();
    
    const spaceModeDropdown = page.locator('button[role="combobox"]#mode');
    await expect(spaceModeDropdown).toBeVisible();
    await expect(spaceModeDropdown).toHaveText('PRFAQ - Problem/Solution format');
    await spaceModeDropdown.click();
    
    await expect(page.locator('select option[value="GENERAL"]:has-text("Generic chat")')).toBeAttached();
    await expect(page.locator('select option[value="PRFAQ"]:has-text("PRFAQ - Problem/Solution format")')).toBeAttached();
    
    await page.getByText('PRFAQ - Problem/Solution format').last().click();
    
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // Validate PRFAQ form dialog
    const titlePRFAQ = page.locator('[role="dialog"] h2:has-text("PRFAQ Details")');
    await expect(titlePRFAQ).toBeVisible();
    const descriptionPRFAQ = page.locator('[role="dialog"]:has-text("Provide additional information for your PRFAQ space.")');
    await expect(descriptionPRFAQ).toBeVisible();
    await expect(page.getByText('Problem Statement')).toBeVisible();
    
    await page.getByPlaceholder('Enter the topic for this PRFAQ').fill('Automation Testing with javascript');
    await expect(page.getByPlaceholder('Describe the problem you\'re addressing')).toBeVisible();
    await page.getByPlaceholder('Describe the problem you\'re addressing').fill('Every topic needs to be seggregated. So that we can classify them as per need and reuse and go in depth');
    await expect(page.getByPlaceholder('Describe your solution')).toBeVisible();
    await page.getByPlaceholder('Describe your solution').fill('Creating different threads for each topic. So that we will be able to go in depth as per topic and get genuine feedback to work on.');
 
    await expect(page.locator('button[type="submit"]:has-text("Create Space")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const newThreadButton = page.locator('button:has-text("New Thread")');
    await expect(newThreadButton).toBeVisible();
    
    const spacesSection = page.locator('[data-sidebar="group"]:has-text("Spaces")');
    await spacesSection.click();
    
    const spaceName = page.getByText('Thread creation space').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();
    
    const spaceOptions = spaceName.locator('..').locator('button[aria-haspopup="menu"]');
    await spaceOptions.click();
    
    const deleteOption = page.locator('[role="menuitem"]:has-text("Delete Space")');
    await deleteOption.click();
    
    const confirmationDialog = page.locator('h2:has-text("Are you sure you want to delete this space?")');
    await expect(confirmationDialog).toBeVisible();

    const deleteOption1 = page.locator('button:has-text("Delete Space")');
    await deleteOption1.click();
    
    await expect(page.locator('[role="alertdialog"]')).toBeHidden();
  });

  test('should Create new space for PRFAQ when New Space button is clicked with selecting PRFAQ option', async ({ page }) => {
    const newSpaceButton = page.locator('button').filter({ hasText: 'New Space' });
    await newSpaceButton.click();
    
    const createSpaceDialog = page.locator('[role="dialog"] h2:has-text("Create new space")');
    await expect(createSpaceDialog).toBeVisible();

    await expect(page.locator('button[type="button"]:has-text("Close")')).toBeVisible();
    await page.locator('button[type="button"]:has-text("Close")').click();
    
    await newSpaceButton.click();
    await expect(createSpaceDialog).toBeVisible();

    const dialogDescription = page.locator('[role="dialog"]:has-text("Create a space to organize your conversations and collaborate with others.")');
    await expect(dialogDescription).toBeVisible();
    
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.getByPlaceholder('Space title')).toBeVisible();
    await expect(page.locator('label[for="title"]:has-text("Title")')).toBeVisible();
    
    await page.getByPlaceholder('Space title').fill('Space Created Using Automation');
    
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.getByPlaceholder('What is this space about?')).toBeVisible();
    await expect(page.locator('label[for="description"]:has-text("Description")')).toBeVisible();
    
    await page.getByPlaceholder('What is this space about?').fill('Description Added Using Automation');
    
    await expect(page.locator('label[for="mode"]:has-text("Space Mode")')).toBeVisible();
    
    const spaceModeDropdown = page.locator('button[role="combobox"]#mode');
    await expect(spaceModeDropdown).toBeVisible();
    await expect(spaceModeDropdown).toHaveText('PRFAQ - Problem/Solution format');
    await spaceModeDropdown.click();
    
    await expect(page.locator('select option[value="GENERAL"]:has-text("Generic chat")')).toBeAttached();
    await expect(page.locator('select option[value="PRFAQ"]:has-text("PRFAQ - Problem/Solution format")')).toBeAttached();
    
    await page.getByText('PRFAQ - Problem/Solution format').last().click();
    
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // Validate PRFAQ form dialog
    const titlePRFAQ = page.locator('[role="dialog"] h2:has-text("PRFAQ Details")');
    await expect(titlePRFAQ).toBeVisible();
    const descriptionPRFAQ = page.locator('[role="dialog"]:has-text("Provide additional information for your PRFAQ space.")');
    await expect(descriptionPRFAQ).toBeVisible();
    await expect(page.getByText('Problem Statement')).toBeVisible();
    await expect(page.locator('button[type="button"]:has-text("Back")')).toBeVisible();
    await page.locator('button[type="button"]:has-text("Back")').click();
    await expect(createSpaceDialog).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();
    await expect(page.getByText('PRFAQ Topic ')).toBeVisible();
    await expect(page.getByPlaceholder('Enter the topic for this PRFAQ')).toBeVisible();
    await page.getByPlaceholder('Enter the topic for this PRFAQ').fill('Automation Testing');
    await expect(page.getByText('Problem Statement')).toBeVisible();
    await expect(page.getByPlaceholder('Describe the problem you\'re addressing')).toBeVisible();
    await page.getByPlaceholder('Describe the problem you\'re addressing').fill('Manual Testing is very slow');
    await expect(page.getByText('Solution ')).toBeVisible();
    await expect(page.getByPlaceholder('Describe your solution')).toBeVisible();
    await page.getByPlaceholder('Describe your solution').fill('Creating Automation Suite');
    await expect(page.getByText('Your Thoughts')).toBeVisible();
    await expect(page.getByPlaceholder('Share your thoughts or additional context about this topic')).toBeVisible();
    await page.getByPlaceholder('Share your thoughts or additional context about this topic').fill('This is a great idea!');
    await expect(page.getByText('File Attachments (Max 4)')).toBeVisible();
    await expect(page.locator('button[type="button"]:has-text("Attach Files")')).toBeEnabled();
    await expect(page.getByText('0/4 files attached')).toBeVisible();
    await expect(page.locator('input[type="file"][accept=".pdf,.docx"][multiple][hidden]').first()).toBeAttached();
    
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button[type="button"]:has-text("Attach Files")').click()
    ]);

    await fileChooser.setFiles('C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Automation_Testing_Overview_for_PRFAQ.pdf');
    await expect(page.getByText('1/4 files attached')).toBeVisible();
    await fileChooser.setFiles('C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample.pdf');
    await expect(page.getByText('2/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('1/4 files attached')).toBeVisible();
    await fileChooser.setFiles('C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample2.pdf');
    await expect(page.getByText('2/4 files attached')).toBeVisible();
    await fileChooser.setFiles('C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample3.pdf');
    await expect(page.getByText('3/4 files attached')).toBeVisible();
    await fileChooser.setFiles('C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample4.pdf');
    await expect(page.getByText('4/4 files attached')).toBeVisible();
    await expect(page.locator('button[type="button"]:has-text("Attach Files")')).toBeDisabled();

    await expect(page.locator('button[type="button"]:has-text("×")').first()).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('3/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('2/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('1/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('0/4 files attached')).toBeVisible();

    await expect(page.locator('button[type="button"]:has-text("Back")')).toBeVisible();
    await page.locator('button[type="button"]:has-text("Back")').click();
    await expect(createSpaceDialog).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();
    await expect(page.getByText('Problem Statement')).toBeVisible();

    const [fileChooserMultiple] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button[type="button"]:has-text("Attach Files")').click()
    ]);
    await fileChooserMultiple.setFiles([
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Automation_Testing_Overview_for_PRFAQ.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample2.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample3.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample4.pdf'
    ]);

    await expect(page.getByText('Only the first 4 files will be processed')).toBeVisible();
    await expect(page.getByText('4/4 files attached')).toBeVisible();

    await expect(page.locator('button[type="button"]:has-text("×")').first()).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('3/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('2/4 files attached')).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').first().click();
    await expect(page.getByText('1/4 files attached')).toBeVisible();

    await expect(page.locator('button[type="button"]:has-text("Back")')).toBeVisible();
    await page.locator('button[type="button"]:has-text("Back")').click();
    await expect(createSpaceDialog).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();
    await expect(page.getByText('Problem Statement')).toBeVisible();

    const [fileChooserMulti] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button[type="button"]:has-text("Attach Files")').click()
    ]);
    await fileChooserMulti.setFiles([
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Automation_Testing_Overview_for_PRFAQ.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample2.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample3.pdf',
      'C:\\Mayur\\PlayWrightQAAutomation\\tests\\e2e\\WEALTH_APP\\Sample4.pdf'
    ]);

    await expect(page.getByRole('listitem').filter({ hasText: 'You can only attach up to 4' })).toBeVisible();
    await expect(page.getByText('4/4 files attached')).toBeVisible();

    await expect(page.getByText('Links')).toBeVisible();
    await expect(page.getByPlaceholder('https://example.com')).toBeVisible();
    await page.getByPlaceholder('https://example.com').fill('https://playwright.dev/docs/intro');
    await expect(page.locator('button[type="button"]:has-text("Add Link")')).toBeVisible();
    await page.locator('button[type="button"]:has-text("Add Link")').click();
    await expect(page.getByPlaceholder('https://example.com').last()).toBeVisible();
    await page.getByPlaceholder('https://example.com').last().fill('https://www.browserstack.com/guide/automation-testing-tutorial');
    await expect(page.locator('button[type="button"]:has-text("×")').last()).toBeVisible();
    await page.locator('button[type="button"]:has-text("×")').last().click();

    await expect(page.locator('button[type="submit"]:has-text("Create Space")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const toast = page.locator('div[data-title]:has-text("Problem statement must be at least 50 characters long")');
    await expect(toast).toBeVisible({ timeout: 2000 });

    await page.evaluate(() => {
    const grid = document.querySelector('div[role="dialog"][class*="overflow-y-auto"]');
    if (grid) grid.scrollTo(0, 0); });
    await page.getByPlaceholder('Describe the problem you\'re addressing').fill('Modified Problem Statement using automation.We will be using this space to discuss the automation testing strategies and best practices.');
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const toast2 = page.locator('div[data-title]:has-text("Solution must be at least 50 characters long")');
    await expect(toast2).toBeVisible({ timeout: 2000 });

    await page.getByPlaceholder('Describe your solution').fill('Creating Automation Suite using Playwright and BrowserStack. This will help us to automate the testing process and improve the efficiency of our testing efforts.');
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const newThreadButton = page.locator('button:has-text("Start a New Thread")');
    await expect(newThreadButton).toBeVisible();
  });

  test('should open Spaces section and edit space named Space Created Using Automation from inside space', async ({ page, context }) => {
    // Click on the 'Spaces' section in the sidebar
    const spacesSection = page.locator('[data-sidebar="group"]').filter({ hasText: 'Spaces' });
    await spacesSection.click();

    // Check if the space exists first
    const spaceName = page.getByText('Space Created Using Automation').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();

    // Wait for the space page to load completely
    await page.waitForLoadState('networkidle');

    const detailsTitle = page.locator('h3:has-text("Space Details")');
    await expect(detailsTitle).toBeVisible();

    const problemStatementTitle = page.locator('h3:has-text("Problem Statement")');
    await expect(problemStatementTitle).toBeVisible();

    const problemStatement = page.getByText('Modified Problem Statement using automation.We will be using this space to discuss the automation testing strategies and best practices.');
    await expect(problemStatement).toBeVisible();

    const solutionTitle = page.locator('h3:has-text("Solution")');
    await expect(solutionTitle).toBeVisible();

    const solution = page.getByText('Creating Automation Suite using Playwright and BrowserStack. This will help us to automate the testing process and improve the efficiency of our testing efforts.');
    await expect(solution).toBeVisible();

    const filesTitle = page.locator('h3:has-text("Files")');
    await expect(filesTitle).toBeVisible();
    
    const fileView = await page.getByRole('button', { name: 'View all 4 files' });
    // await fileView.click(); // Currently due to a bug user is unable to see all the files

    const linksTitle = page.locator('h3:has-text("Links")');
    await expect(linksTitle).toBeVisible();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Visit' }).click()
    ]);
    await expect(newPage).toHaveURL('https://playwright.dev/docs/intro');
    await newPage.close();

    await page.getByRole('button', { name: 'Edit Space Details' }).click();

    const editPageTitle = page.locator('h2:has-text("Edit Space Details")');
    await expect(editPageTitle).toBeVisible();

    const editPageDescription = page.getByText('Update the problem statement, solution, or add files and links to this space.');
    await expect(editPageDescription).toBeVisible();

    await page.locator('button[type="button"]:has-text("Topic")').click();
    await expect(page.locator('label[for="prfaqTopic"]:has-text("PRFAQ Topic")')).toBeVisible();
    await page.getByPlaceholder('Enter the topic for this PRFAQ').fill('Enhanced Automation Testing');

    await expect(page.locator('label[for="thoughts"]:has-text("Your Thoughts")')).toBeVisible();
    await page.getByPlaceholder('Share your thoughts or additional context about this topic').fill('Isn\'t this is a great idea!');
  
    await page.locator('button[type="button"]:has-text("Problem")').click();
    await page.getByPlaceholder('Describe the problem this space addresses...').fill('We Modified the Problem Statement using automation.We will be using this space to discuss the automation testing strategies and best practices.');
  
    await page.locator('button[type="button"]:has-text("Solution")').click();
    await page.getByPlaceholder('Describe the solution to the problem...').fill('Modified creating Automation Suite using Playwright and BrowserStack. This will help us to automate the testing process and improve the efficiency of our testing efforts.');
    
    await page.locator('button[type="button"]:has-text("Files")').click();
    await expect(page.locator('label[for="file-upload"]:has-text("Upload Files")')).toBeVisible();

    await page.locator('button[type="button"]:has-text("Links")').click();
    await page.getByPlaceholder('https://example.com').fill('https://www.selenium.dev/documentation/');
    await page.locator('#newLink').locator('..').locator('button').click();
    
    await page.getByRole('button', {name: 'Save Changes '}).click();

    const modifiedProblemStatementTitle = page.locator('h3:has-text("Problem Statement")');
    await expect(modifiedProblemStatementTitle).toBeVisible();

    const modifiedProblemStatement = page.getByText('We Modified the Problem Statement using automation.We will be using this space to discuss the automation testing strategies and best practices.');
    await expect(modifiedProblemStatement).toBeVisible();

    const modifiedSolutionTitle = page.locator('h3:has-text("Solution")');
    await expect(modifiedSolutionTitle).toBeVisible();

    const modifiedSolution = page.getByText('Modified creating Automation Suite using Playwright and BrowserStack. This will help us to automate the testing process and improve the efficiency of our testing efforts.');
    await expect(modifiedSolution).toBeVisible();

    await expect(linksTitle).toBeVisible();
    const [linkNewPage1] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Visit' }).first().click()
    ]);
    await expect(linkNewPage1).toHaveURL('https://playwright.dev/docs/intro');
    await linkNewPage1.close();

    const [linkNewPage2] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Visit' }).last().click()
    ]);
    await expect(linkNewPage2).toHaveURL('https://www.selenium.dev/documentation/');
    await linkNewPage2.close();

  });

  test('should open Spaces section and validate manage members of space named Space Created Using Automation from inside space', async ({ page, context }) => {
    // Click on the 'Spaces' section in the sidebar
    const spacesSection = page.locator('[data-sidebar="group"]').filter({ hasText: 'Spaces' });
    await spacesSection.click();

    // Check if the space exists first
    const spaceName = page.getByText('Space Created Using Automation').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();

    // Wait for the space page to load completely
    await page.waitForLoadState('networkidle');

    const detailsTitle = page.locator('h3:has-text("Members (1)")');
    await expect(detailsTitle).toBeVisible();
    await expect(page.locator('div.flex.items-center.gap-3:has(div:has-text("Mayur Chaudhary")):has(div:has-text("admin"))')).toBeVisible();

    await expect(page.locator('button:has-text("Manage")')).toBeVisible();
    await page.locator('button:has-text("Manage")').click();
    
    const manageSpaceMembersTitleDialog = page.locator('h2:has-text("Manage space members")');
    await expect(manageSpaceMembersTitleDialog).toBeVisible();

    const manageSpaceMemberDescription = page.getByText('Add or remove members from "Space Created Using Automation"');
    await expect(manageSpaceMemberDescription).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Add Member' })).toBeVisible();
    await page.getByRole('tab', { name: 'Add Member' }).click();

    await expect(page.getByText('Email address')).toBeVisible();
    await expect(page.locator('#email[placeholder="colleague@example.com"]')).toBeVisible();
    await expect(page.getByText('The user must already have an account in the system')).toBeVisible();
    
    await expect(page.getByText('Role')).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'Member (can view and contribute)' })).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Remove Member' })).toBeVisible();
    await page.getByRole('tab', { name: 'Remove Member' }).click();
    
    await expect(page.getByText('Select member to remove')).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'Select a member' })).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(detailsTitle).toBeVisible();
    await expect(page.locator('button:has-text("Manage")')).toBeVisible();
    await page.locator('button:has-text("Manage")').click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(detailsTitle).toBeVisible();
  });

  test('should open Spaces section and add members of space named Space Created Using Automation from inside space', async ({ page, context }) => {
    // Click on the 'Spaces' section in the sidebar
    const spacesSection = page.locator('[data-sidebar="group"]').filter({ hasText: 'Spaces' });
    await spacesSection.click();

    // Check if the space exists first
    const spaceName = page.getByText('Space Created Using Automation').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();

    // Wait for the space page to load completely
    await page.waitForLoadState('networkidle');
    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const detailsTitle = page.locator('h3:has-text("Members (1)")');
    await expect(detailsTitle).toBeVisible();
    await expect(page.locator('div.flex.items-center.gap-3:has(div:has-text("Mayur Chaudhary")):has(div:has-text("admin"))')).toBeVisible();

    await expect(page.locator('button:has-text("Manage")')).toBeVisible();
    await page.locator('button:has-text("Manage")').click();
    
    const manageSpaceMembersTitleDialog = page.locator('h2:has-text("Manage space members")');
    await expect(manageSpaceMembersTitleDialog).toBeVisible();

    const manageSpaceMemberDescription = page.getByText('Add or remove members from "Space Created Using Automation"');
    await expect(manageSpaceMemberDescription).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Add Member' })).toBeVisible();
    await page.getByRole('tab', { name: 'Add Member' }).click();

    await expect(page.getByText('Email address')).toBeVisible();
    await expect(page.locator('#email[placeholder="colleague@example.com"]')).toBeVisible();
    await page.locator('#email[placeholder="colleague@example.com"]').fill('mayur.chaudhary@example.com');
    await expect(page.getByText('The user must already have an account in the system')).toBeVisible();
    
    await expect(page.getByText('Role')).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'Member (can view and contribute)' })).toBeVisible();
    await page.getByRole('combobox').filter({ hasText: 'Member (can view and contribute)' }).click();
    await page.getByRole('option', { name: 'Admin (can manage space and members)' }).click();

    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText('Invitation has been sent to the email address mayur.chaudhary@example.com')).toBeVisible();
    const detailsTitle2 = page.locator('h3:has-text("Members (2)")');
    await expect(detailsTitle2).toBeVisible();
    await expect(page.locator('div.flex.items-center.gap-3:has(div:has-text("Mayur Chaudhary")):has(div:has-text("admin"))')).toHaveCount(2);
    
  });

  test('should open Spaces section and remove members of space named Space Created Using Automation from inside space', async ({ page, context }) => {
   
    const spacesSection = page.locator('[data-sidebar="group"]').filter({ hasText: 'Spaces' });
    await spacesSection.click();

    // Check if the space exists first
    const spaceName = page.getByText('Space Created Using Automation').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();

    // Wait for the space page to load completely
    await page.waitForLoadState('networkidle');

    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const detailsTitle = page.locator('h3:has-text("Members (2)")');
    await expect(detailsTitle).toBeVisible();

    await expect(page.locator('button:has-text("Manage")')).toBeVisible();
    await page.locator('button:has-text("Manage")').click();
    await expect(page.getByRole('tab', { name: 'Remove Member' })).toBeVisible();
    await page.getByRole('tab', { name: 'Remove Member' }).click();
    
    await expect(page.getByText('Select member to remove')).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'Select a member' })).toBeVisible();
    // Click the dropdown to select a member to remove
    await page.getByRole('combobox').filter({ hasText: 'Select a member' }).click();
    await page.getByRole('option', { name: 'Mayur Chaudhary (Admin)' }).last().click();
    await page.getByRole('button', { name: 'Remove Member' }).click();
    await expect(page.getByText('Mayur Chaudhary has been removed from the space')).toBeVisible();

    const detailsTitle2 = page.locator('h3:has-text("Members (1)")');
    await expect(detailsTitle2).toBeVisible();
    await expect(page.locator('div.flex.items-center.gap-3:has(div:has-text("Mayur Chaudhary")):has(div:has-text("admin"))')).toHaveCount(1);
   
  });

  test('should open Spaces section and Delete space named Space Created Using Automation from inside space', async ({ page }) => {
    // Click on the 'Spaces' section in the sidebar
    const spacesSection = page.locator('[data-sidebar="group"]').filter({ hasText: 'Spaces' });
    await spacesSection.click();

    // Check if the space exists first
    const spaceName = page.getByText('Space Created Using Automation').first();
    await expect(spaceName).toBeVisible();
    await spaceName.click();

    // Wait for the space page to load completely
    await page.waitForLoadState('networkidle');

    const spaceNameTitle = page.locator('h1:has-text("Space Created Using Automation")');
    await expect(spaceNameTitle).toBeVisible();

    await expect(page.getByText('Description Added Using Automation')).toBeVisible();
    
    // Find the specific Space options button on top right of page for "Space Created Using Automation" -- Currently there is no unique path
    const spaceOptionsButton = page.locator('div').filter({ hasText: /^Space Created Using AutomationSpace options$/ }).getByRole('button').first();
    await spaceOptionsButton.click();

    const deleteSpaceButton = page.locator('[role="menuitem"]:has-text("Delete Space")');
    await deleteSpaceButton.click();

    // Handle confirmation dialog if it appears
    const confirmationDialog = page.locator('h2:has-text("Are you sure you want to delete this space?")');
    if (await confirmationDialog.isVisible()) {
      const confirmDeleteButton = page.locator('button:has-text("Delete Space")');
      await confirmDeleteButton.click();
    }
    const yourSpacesTitle = page.locator('h1:has-text("Your Spaces")');
    await expect(yourSpacesTitle).toBeVisible();
  });

  test('should open Spaces section and create new thread under space', async ({ page }) => {
    const newSpaceButton = page.locator('button').filter({ hasText: 'New Space' });
    await newSpaceButton.click();
    
    const createSpaceDialog = page.locator('[role="dialog"] h2:has-text("Create new space")');
    await expect(createSpaceDialog).toBeVisible();

    const dialogDescription = page.locator('[role="dialog"]:has-text("Create a space to organize your conversations and collaborate with others.")');
    await expect(dialogDescription).toBeVisible();
    
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.getByPlaceholder('Space title')).toBeVisible();
    await expect(page.locator('label[for="title"]:has-text("Title")')).toBeVisible();
    
    await page.getByPlaceholder('Space title').fill('Thread creation space');
    
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.getByPlaceholder('What is this space about?')).toBeVisible();
    await expect(page.locator('label[for="description"]:has-text("Description")')).toBeVisible();
    
    await page.getByPlaceholder('What is this space about?').fill('Description of space for thread');
    
    await expect(page.locator('label[for="mode"]:has-text("Space Mode")')).toBeVisible();
    
    const spaceModeDropdown = page.locator('button[role="combobox"]#mode');
    await expect(spaceModeDropdown).toBeVisible();
    await expect(spaceModeDropdown).toHaveText('PRFAQ - Problem/Solution format');
    await spaceModeDropdown.click();
    
    await expect(page.locator('select option[value="GENERAL"]:has-text("Generic chat")')).toBeAttached();
    await expect(page.locator('select option[value="PRFAQ"]:has-text("PRFAQ - Problem/Solution format")')).toBeAttached();
    
    await page.getByText('PRFAQ - Problem/Solution format').last().click();
    
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Continue")').click();

    // Validate PRFAQ form dialog
    const titlePRFAQ = page.locator('[role="dialog"] h2:has-text("PRFAQ Details")');
    await expect(titlePRFAQ).toBeVisible();
    const descriptionPRFAQ = page.locator('[role="dialog"]:has-text("Provide additional information for your PRFAQ space.")');
    await expect(descriptionPRFAQ).toBeVisible();
    await expect(page.getByText('Problem Statement')).toBeVisible();
    
    await page.getByPlaceholder('Enter the topic for this PRFAQ').fill('Automation Testing with javascript');
    await expect(page.getByPlaceholder('Describe the problem you\'re addressing')).toBeVisible();
    await page.getByPlaceholder('Describe the problem you\'re addressing').fill('Every topic needs to be seggregated. So that we can classify them as per need and reuse and go in depth');
    await expect(page.getByPlaceholder('Describe your solution')).toBeVisible();
    await page.getByPlaceholder('Describe your solution').fill('Creating different threads for each topic. So that we will be able to go in depth as per topic and get genuine feedback to work on.');
 
    await expect(page.locator('button[type="submit"]:has-text("Create Space")')).toBeVisible();
    await page.locator('button[type="submit"]:has-text("Create Space")').click();

    const newThreadButton = page.locator('button:has-text("New Thread")');
    await expect(newThreadButton).toBeVisible();
    await newThreadButton.click();

    // Capture current time and date for dynamic thread identification
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const dateString = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const threadCreationDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const threadPattern = new RegExp(`New Thread ${timeString.replace(':', '\\:')}:\\d{2} (AM|PM) ${dateString}`);
  await page.getByText('Generated PR/FAQ Will appear').isVisible();
  await page.locator('svg.lucide-download[class*="cursor-pointer"][class*="size-7"]').click(); // Download button
  await page.locator('.icons-tab > svg:nth-child(2)').click(); // Copy button
  await page.getByRole('button', { name: 'Edit Manually' }).click();
  await page.getByRole('link', { name: 'Thread creation space' }).click();
  await page.getByRole('link', { name: threadPattern }).isVisible();
  await page.getByRole('link', { name: threadCreationDate }).click();
  await page.getByRole('textbox', { name: 'Type @ for PRFAQ commands...' }).click();
  await page.getByRole('main').getByRole('button').nth(1).click();
  await page.getByRole('button', { name: 'Finance KB' }).click();
  await page.locator('label').getByRole('img').click();
  await page.getByRole('textbox', { name: 'Type @ for PRFAQ commands...' }).click();
  await page.locator('.options').first().click();
  await page.getByRole('link', { name: 'Thread creation space' }).click();
  await page.getByRole('link', { name: threadCreationDate }).click();
  await page.locator('div').filter({ hasText: /^Recent Threads$/ }).nth(1).click();
  await page.getByRole('link', { name: threadCreationDate }).click();
  await page.getByRole('link', { name: 'Spaces' }).click();
  await page.getByRole('link', { name: 'Thread creation space' }).click();
  await page.getByRole('heading', { name: 'Recent Threads' }).click();
  await page.getByRole('link', { name: threadCreationDate }).click();
  await page.getByRole('textbox', { name: 'Type @ for PRFAQ commands...' }).click();
  await page.locator('svg.lucide-clipboard[class*="cursor-pointer"][class*="size-7"]').click();

  });
});