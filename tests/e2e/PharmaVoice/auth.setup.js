const { chromium } = require('@playwright/test');
const path = require('path');
const os = require('os');

/**
 * Authentication Setup Script for PharmaVoice Pharma
 * 
 * This script uses a persistent browser context with anti-detection measures
 * to bypass Google's "browser not secure" error.
 * 
 * Usage:
 *   node tests/e2e/PharmaVoice/auth.setup.js
 * 
 * The script will:
 * 1. Open Chrome with a persistent user profile (harder to detect as automation)
 * 2. Navigate to the PharmaVoice Pharma application
 * 3. Wait for you to manually complete the Google login
 * 4. Save the authenticated state to tests/e2e/PharmaVoice/.auth/pharma_voice-auth.json
 * 5. This saved state will be used by all tests
 */

(async () => {
    console.log('🚀 Starting authentication setup for PharmaVoice Pharma...\n');
    console.log('🔧 Using persistent context with anti-detection measures...\n');

    // Create a persistent user data directory
    const userDataDir = path.join(__dirname, '.auth', 'chrome-profile');
    const fs = require('fs');
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Launch browser with persistent context (harder for Google to detect)
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        slowMo: 100,
        // Anti-detection arguments to bypass Google OAuth blocking
        args: [
            '--disable-blink-features=AutomationControlled', // Hide automation flag
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--start-maximized'
        ],
        // Override user agent to remove headless indicators
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = context.pages()[0] || await context.newPage();

    try {
        console.log('📍 Navigating to PharmaVoice Pharma application...');
        await page.goto(`${process.env.PHARMA_API_URL || 'https://httpbin.org'}/`);

        console.log('\n⏳ Waiting for sign-in page to load...');
        await page.waitForLoadState('domcontentloaded');

        console.log('\n✋ MANUAL ACTION REQUIRED:');
        console.log('================================================');
        console.log('1. Click "Continue with Google" button');
        console.log('2. Complete the Google login process:');
        console.log('   - Enter email: qa-tester@example.com');
        console.log('   - Enter password: QATester@#123');
        console.log('3. Wait until you see the dashboard');
        console.log('4. This script will automatically detect success');
        console.log('================================================\n');

        // Wait for the dashboard to appear (indicating successful login)
        console.log('⏳ Waiting for successful login (checking for dashboard elements)...');

        await page.waitForSelector('text=/Good (Morning|Afternoon|Evening)/i', {
            timeout: 300000, // 5 minutes - plenty of time for manual login
        });

        console.log('\n✅ Login successful! Dashboard detected.');
        console.log('💾 Saving authentication state...');

        // Create .auth directory if it doesn't exist
        const authDir = path.join(__dirname, '.auth');
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        // Save the authenticated state (cookies, localStorage, sessionStorage)
        const authFilePath = path.join(authDir, 'pharma_voice-auth.json');
        await context.storageState({ path: authFilePath });

        console.log('\n🎉 SUCCESS! Authentication state saved to:');
        console.log(`   ${authFilePath}`);
        console.log('\nYou can now run your tests, and they will use this saved state.');
        console.log('Run tests with: npx playwright test tests/e2e/PharmaVoice/homepage.spec.js\n');

    } catch (error) {
        console.error('\n❌ ERROR during authentication setup:');
        console.error(error.message);
        console.log('\nPlease try running the script again.\n');
    } finally {
        await context.close();
    }
})();
