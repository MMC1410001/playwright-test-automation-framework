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
    await expect(page).toHaveURL(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`);
    await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
    await expect(page.locator('p:has-text("Real-time pharmaceutical intelligence and insights")')).toBeVisible();
  });

  test('PH_TC_02_should verify google sign in', async ({ page }) => {
    // This test requires manual intervention for Google OAuth
  });

  test('PH_TC_03_should verify login page layout', async ({ page }) => {
    // Navigate to login page and verify layout elements
    await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.isVisible();
    await logoutButton.click();
    await page.locator('h1:has-text("Login Page")').toBeVisible();

  });

  test('PH_TC_04_should verify social media sharing', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('PharmaAI');
    
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', 'Modern Sales Control Center Dashboard for Pharmacy Companies');
  });

  test('PH_TC_05_should verify vertical sidebar tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Signals")')).toBeVisible();
    await expect(page.locator('button:has-text("Chat")')).toBeVisible();
    await expect(page.locator('button:has-text("Jasmine")')).toBeVisible();
    await expect(page.locator('button:has-text("Audio Logs")')).toBeVisible();
  });

  test('PH_TC_06_should verify signals tab heading', async ({ page }) => {
    await page.locator('button:has-text("Signals")').click();
    await expect(page.locator('h1:has-text("Signals Dashboard")')).toBeVisible();
  });

  test('PH_TC_07_should verify signals tab subheading', async ({ page }) => {
    await page.locator('button:has-text("Signals")').click();
    await expect(page.locator('text=Real-time pharmaceutical intelligence and insights')).toBeVisible();
  });

  test('PH_TC_08_should verify region filter', async ({ page }) => {
    const regionFilter = page.locator('select[name="region"]');
    await regionFilter.selectOption('Mumbai');
    // Verify filtered results
  });

  test('PH_TC_09_should verify product filter', async ({ page }) => {
    const productFilter = page.locator('select[name="product"]');
    await productFilter.selectOption('Mumbai');
    // Verify filtered results
  });

  test('PH_TC_10_should verify analytics dashboard', async ({ page }) => {
    await expect(page.locator('svg.lucide-zap')).toBeVisible(); // Signals icon
    await expect(page.locator('svg.lucide-trending-up')).toBeVisible(); // Actions icon
    await expect(page.locator('svg.lucide-alert-triangle')).toBeVisible(); // Adverse Effects icon
    await expect(page.locator('svg.lucide-file-text')).toBeVisible(); // FAQs icon
  });

  test('PH_TC_11_should verify refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();
    // Verify filters reset to default
  });

  test('PH_TC_12_should verify trending signals section', async ({ page }) => {
    await expect(page.locator('h3:has-text("Trending Signals")')).toBeVisible();
    // Verify signal cards with required elements
  });

  test('PH_TC_13_should verify product signals section', async ({ page }) => {
    await page.locator('button:has-text("Product Signals")').click();
    // Verify product cards
  });

  test('PH_TC_14_should verify view detail insights button', async ({ page }) => {
    await page.locator('button:has-text("Product Signals")').click();
    await page.locator('button:has-text("View Detail Insights")').first().click();
    // Verify navigation to detail view
  });

  test('PH_TC_15_should verify faqs section', async ({ page }) => {
    await page.locator('button:has-text("FAQs")').click();
    // Verify FAQ cards
  });

  test('PH_TC_16_should verify download report button', async ({ page }) => {
    // Navigate to detail view and test download
  });

  test('PH_TC_17_should verify detail view filters', async ({ page }) => {
    // Test filtering in detail view
  });

  test('PH_TC_18_should verify detailed analytics dashboard', async ({ page }) => {
    // Verify analytics sections in detail view
  });

  test('PH_TC_19_should verify weekly product summary', async ({ page }) => {
    // Verify Weekly Product Summary section
  });

  test('PH_TC_20_should verify insights recommendations tab', async ({ page }) => {
    // Test Insights & Recommendations tab
  });

  test('PH_TC_21_should verify faqs tab detail view', async ({ page }) => {
    // Test FAQs tab in detail view
  });

  test('PH_TC_22_should verify all recordings tab', async ({ page }) => {
    // Test All Recordings tab
  });

  test('PH_TC_24_should have chat section at bottom of page', async ({ page }) => {
    await expect(page.locator('h3:has-text("Trending Signals")')).toBeVisible();

    const chatSection = page.locator('.fixed.bottom-0');
    await expect(chatSection).toBeVisible();
    
    await expect(page.locator('textarea[placeholder="Send a message..."]')).toBeVisible();
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Attach file"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
    
    await expect(page.locator('text=Bot can make mistakes. Check important info.')).toBeVisible();
  });

  test('PH_TC_25_should open up chatbot section from Signals page if user sends message from bottom of page', async ({ page }) => {
    await expect(page.locator('h3:has-text("Trending Signals")')).toBeVisible();

    const chatSection = page.locator('.fixed.bottom-0');
    await expect(chatSection).toBeVisible();
    
    await expect(page.locator('textarea[placeholder="Send a message..."]')).toBeVisible();
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Attach file"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
    
    await expect(page.locator('text=Bot can make mistakes. Check important info.')).toBeVisible();

    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    await chatInput.press('Enter');
    await page.waitForTimeout(2000);
    
    await expect(chatInput).toHaveValue('');

    const newChatButton = page.locator('button:has-text("New chat")');
    await newChatButton.isVisible();
  });

  test('PH_TC_26_should navigate to Chat tab', async ({ page }) => {
    const chatButton = page.locator('button:has-text("Chat")');
    await chatButton.click();
    
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=How can I help you today?')).toBeVisible();
    await expect(page.locator('text=Start a conversation or try one of the examples below')).toBeVisible();
  });

  test('PH_TC_27_should test chat functionality', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    await page.waitForTimeout(1000);
    
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).not.toBeDisabled();
    
    await sendButton.click();
    
    await page.waitForTimeout(5000);

    const humanIcon = page.locator('svg.lucide-user');
    await expect(humanIcon).toBeVisible();
    await expect(page.locator('text=Hi').first()).toBeVisible();

    const roboIcon = page.locator('svg.lucide-bot');
    await expect(roboIcon).toBeVisible();
  });

  test('PH_TC_28_should verify logo redirect', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    await page.locator('img[alt*="logo"]').click();
    // Verify redirect to homepage
  });

  test('PH_TC_29_should verify toggle sidebar', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const toggleButton = page.locator('button[aria-label="Toggle sidebar"]');
    await toggleButton.click();
    // Verify sidebar hidden
    await toggleButton.click();
    // Verify sidebar visible
  });

  test('PH_TC_30_should verify new chat button', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const newChatButton = page.locator('button:has-text("New chat")');
    await newChatButton.click();
    // Verify new chat window
  });

  test('PH_TC_31_should verify chat history section', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Test message');
    await chatInput.press('Enter');
    await page.waitForTimeout(2000);
    
    await page.locator('button:has-text("New chat")').click();
    // Verify history section with message icon
  });

  test('PH_TC_32_should verify rename conversation', async ({ page }) => {
    // Test conversation renaming
  });

  test('PH_TC_33_should verify delete conversation', async ({ page }) => {
    // Test conversation deletion
  });

  test('PH_TC_34_should display user profile information', async ({ page }) => {
    const profileSection = page.locator('.p-4.border-t.border-slate-700');
    await expect(profileSection).toBeVisible();
    
    await expect(page.locator('text=Mayur Chaudhary')).toBeVisible();
    
    const profileImage = page.locator('img[src*="googleusercontent.com"]');
    await expect(profileImage).toBeVisible();
    
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
  });

  test('PH_TC_35_should verify logout button hover', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.hover();
    // Verify hover effect
  });

  test('PH_TC_36_should verify logout functionality', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.click();
    // Verify redirect to login page
  });

  test('PH_TC_37_should verify theme change', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const themeButton = page.locator('button[aria-label="Toggle theme"]');
    await themeButton.click();
    // Verify theme change
  });

  test('PH_TC_38_should verify file attachment', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const attachButton = page.locator('button[aria-label="Attach file"]');
    await attachButton.click();
    // Test file attachment
  });

  test('PH_TC_39_should verify voice input languages', async ({ page }) => {
    // Test voice input functionality
  });

  test('PH_TC_40_should verify voice input duration', async ({ page }) => {
    // Test voice input for extended duration
  });

  test('PH_TC_41_should verify enter key send', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    await chatInput.press('Enter');
    // Verify message sent
  });

  test('PH_TC_42_should verify send button disabled', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeDisabled();
    
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    await expect(sendButton).not.toBeDisabled();
  });

  test('PH_TC_43_should verify send message icon', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();
    // Verify message sent
  });

  test('PH_TC_44_should verify domain specific responses', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Who created you?');
    await chatInput.press('Enter');
    await page.waitForTimeout(3000);
    // Verify appropriate response for non-pharma question
  });

  test('PH_TC_45_should verify grammatical mistakes handling', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('wat is medicin?');
    await chatInput.press('Enter');
    // Verify chatbot understands despite mistakes
  });

  test('PH_TC_46_should verify message icons', async ({ page }) => {
    await page.locator('button:has-text("Chat")').click();
    const chatInput = page.locator('textarea[placeholder="Send a message..."]');
    await chatInput.fill('Hi');
    await chatInput.press('Enter');
    await page.waitForTimeout(3000);
    
    await expect(page.locator('svg.lucide-user')).toBeVisible();
    await expect(page.locator('svg.lucide-bot')).toBeVisible();
  });

  test('PH_TC_47_should verify response formatting', async ({ page }) => {
    // Test chatbot response formatting
  });

  test('PH_TC_48_should verify previous conversations access', async ({ page }) => {
    // Test accessing and continuing previous conversations
  });

  test('PH_TC_49_should verify pharma product insights', async ({ page }) => {
    // Test chatbot pharma insights capability
  });

  test('PH_TC_50_should verify products by region', async ({ page }) => {
    // Test regional product listing
  });

  test('PH_TC_51_should verify jasmine access', async ({ page }) => {
    await page.locator('button:has-text("Jasmine")').click();
    // Verify Jasmine AI opens in new window
  });

  test('PH_TC_52_should verify audio logs access', async ({ page }) => {
    await page.locator('button:has-text("Audio Logs")').click();
    // Verify Audio Logs page loads
  });

  test('PH_TC_53_should verify audio logs heading', async ({ page }) => {
    await page.locator('button:has-text("Audio Logs")').click();
    await expect(page.locator('h1:has-text("Audio Logs")')).toBeVisible();
  });

  test('PH_TC_54_should verify upload recording button', async ({ page }) => {
    await page.locator('button:has-text("Audio Logs")').click();
    await expect(page.locator('button:has-text("Upload Recording")')).toBeVisible();
  });

  test('PH_TC_55_should verify audio file upload', async ({ page }) => {
    // Test audio file upload functionality
  });

  test('PH_TC_56_should verify file size limit', async ({ page }) => {
    // Test 15MB file size limit
  });

  test('PH_TC_57_should verify recording details', async ({ page }) => {
    await page.locator('button:has-text("Audio Logs")').click();
    // Verify recording statistics cards
  });

  test('PH_TC_58_should verify recording filters', async ({ page }) => {
    // Test various recording filters
  });

  test('PH_TC_59_should verify all recordings tab', async ({ page }) => {
    // Test All Recordings tab with details
  });

  test('PH_TC_60_should verify no recordings filter message', async ({ page }) => {
    // Test no recordings found message
  });

  test('PH_TC_61_should verify no recordings uploaded message', async ({ page }) => {
    // Test no recordings uploaded message
  });

  test('PH_TC_62_should verify clear filters button', async ({ page }) => {
    // Test clear filters functionality
  });

  test('PH_TC_63_should verify date sorting', async ({ page }) => {
    // Test ascending/descending date sorting
  });

  test('PH_TC_64_should verify transcript viewing', async ({ page }) => {
    // Test transcript viewing functionality
  });

  test('PH_TC_65_should verify translation viewing', async ({ page }) => {
    // Test translation functionality
  });

  test('PH_TC_66_should verify audio playback', async ({ page }) => {
    // Test audio playback functionality
  });

  test('PH_TC_67_should verify transcript close button', async ({ page }) => {
    // Test transcript close functionality
  });

  test('PH_TC_68_should verify play pause controls', async ({ page }) => {
    // Test audio play/pause controls
  });

  test('PH_TC_69_should verify mute unmute controls', async ({ page }) => {
    // Test audio mute/unmute controls
  });

  test('PH_TC_70_should verify playback speed control', async ({ page }) => {
    // Test playback speed adjustment
  });

  test('PH_TC_71_should verify audio download', async ({ page }) => {
    // Test audio download functionality
  });

  test('PH_TC_72_should verify uploader name display', async ({ page }) => {
    // Test uploader name visibility
  });

  test('PH_TC_73_should verify page navigation numbers', async ({ page }) => {
    // Test page number navigation
  });

  test('PH_TC_74_should verify next button navigation', async ({ page }) => {
    // Test Next button functionality
  });

  test('PH_TC_75_should verify previous button navigation', async ({ page }) => {
    // Test Previous button functionality
  });

  test('PH_TC_76_should verify recording count display', async ({ page }) => {
    // Test recording count per page display
  });

  test('PH_TC_77_should verify date validation', async ({ page }) => {
    // Test To Date cannot be before From Date
  });

  test('PH_TC_78_should verify website load time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('https://www.saucedemo.com/');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('PH_TC_79_should verify mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://www.saucedemo.com/');
    // Verify mobile-friendly layout
  });

});