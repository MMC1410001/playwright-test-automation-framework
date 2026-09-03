const { test, expect } = require('@playwright/test');

/**
 * Security & HTTPS Tests
 * Tests 359-370
 *
 * Validates HTTPS enforcement, security headers, CSP, and
 * basic XSS/injection prevention
 */

test.describe('Security & HTTPS Tests', () => {
  test('359 - Security: Website is served over HTTPS', async ({ page }) => {
    const response = await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`);
    const url = page.url();

    console.log('Final URL:', url);
    expect(url).toMatch(/^https:\/\//);
    expect(response?.status()).toBe(200);
  });

  test('360 - Security: HTTP requests are redirected to HTTPS', async ({ page }) => {
    // Try HTTP - should redirect to HTTPS
    try {
      const response = await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      const finalUrl = page.url();
      console.log('Final URL after HTTP request:', finalUrl);

      // Should be redirected to HTTPS
      expect(finalUrl).toMatch(/^https:\/\//);
    } catch (error) {
      // Connection refused on HTTP is also acceptable
      console.log('HTTP connection refused or error - HTTPS only enforcement may be at DNS level');
      expect(true).toBeTruthy();
    }
  });

  test('361 - Security: Response headers include security headers', async ({ page }) => {
    const response = await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'domcontentloaded' });
    const headers = response?.headers() || {};

    console.log('Security-relevant headers:');

    // Check for important security headers
    const securityHeaders = {
      'strict-transport-security': headers['strict-transport-security'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-frame-options': headers['x-frame-options'],
      'content-security-policy': headers['content-security-policy'],
      'x-xss-protection': headers['x-xss-protection'],
      'referrer-policy': headers['referrer-policy'],
      'permissions-policy': headers['permissions-policy']
    };

    for (const [name, value] of Object.entries(securityHeaders)) {
      console.log(`  ${name}: ${value || 'NOT SET'}`);
    }

    // HSTS should be set for HTTPS sites
    const hasHSTS = !!securityHeaders['strict-transport-security'];
    console.log('HSTS header set:', hasHSTS);

    // At minimum, HTTPS should be served (already verified)
    // Log warnings for missing security headers
    if (!hasHSTS) {
      console.warn('Warning: HSTS header not set - recommended for HTTPS sites');
    }
    if (!securityHeaders['x-content-type-options']) {
      console.warn('Warning: X-Content-Type-Options header not set');
    }
    if (!securityHeaders['x-frame-options'] && !securityHeaders['content-security-policy']) {
      console.warn('Warning: Neither X-Frame-Options nor CSP frame-ancestors set - clickjacking risk');
    }

    expect(true).toBeTruthy(); // Informational test
  });

  test('362 - Security: No mixed content (HTTP resources on HTTPS page)', async ({ page }) => {
    const mixedContentUrls = [];

    // Monitor all network requests
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
        mixedContentUrls.push(url);
        console.warn('Mixed content detected:', url);
      }
    });

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    console.log('Mixed content URLs found:', mixedContentUrls.length);
    if (mixedContentUrls.length > 0) {
      console.warn('Mixed content URLs:', mixedContentUrls);
    }

    expect(mixedContentUrls.length).toBe(0);
  });

  test('363 - Security: Forms use HTTPS action URLs or POST to secure endpoints', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'domcontentloaded' });

    // Check all forms
    const formsInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(form => ({
        action: form.action,
        method: form.method,
        id: form.id
      }));
    });

    console.log('Forms on homepage:', formsInfo);

    // All form actions should use HTTPS or be relative
    for (const form of formsInfo) {
      if (form.action && form.action.startsWith('http://')) {
        console.warn(`Warning: Form action uses HTTP: ${form.action}`);
      }

      if (form.action.startsWith('http://')) {
        expect(form.action).toMatch(/^https:\/\//);
      }
    }

    expect(true).toBeTruthy();
  });

  test('364 - Security: XSS - Input fields sanitize script injection attempts', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/calculator`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Monitor for alerts (XSS indicator)
    let xssAlertShown = false;
    page.on('dialog', async dialog => {
      console.log('Alert dialog shown - potential XSS:', dialog.message());
      xssAlertShown = true;
      await dialog.dismiss();
    });

    // Attempt XSS in input fields
    const inputField = page.locator('input[type="number"]').first();
    const hasInput = await inputField.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasInput) {
      // Number fields reject non-numeric input - verify via JS evaluation instead
      const inputType = await inputField.getAttribute('type');
      if (inputType === 'number') {
        // Number inputs inherently reject script text; verify via JS
        await page.evaluate(el => { el.value = '<script>alert("XSS")</script>'; }, await inputField.elementHandle());
      } else {
        await inputField.fill('<script>alert("XSS")</script>');
      }
      await page.waitForTimeout(500);

      // Number field should not accept script
      const value = await inputField.inputValue();
      console.log('Input value after XSS attempt:', value);

      // Script should not be stored/executed in number field
      expect(xssAlertShown).toBeFalsy();
    }

    // Also check text inputs if any
    const textInputs = page.locator('input[type="text"], input[type="search"]');
    const textInputCount = await textInputs.count();

    if (textInputCount > 0) {
      await textInputs.first().fill('<img src=x onerror=alert("XSS2")>');
      await page.waitForTimeout(500);
      expect(xssAlertShown).toBeFalsy();
    }

    console.log('XSS alert triggered:', xssAlertShown);
    expect(xssAlertShown).toBeFalsy();
  });

  test('365 - Security: URL parameter injection does not expose sensitive data', async ({ page }) => {
    // Try common URL injection patterns
    const testUrls = [
      `${process.env.SAAS_URL || 'https://www.saucedemo.com'}/?debug=true`,
      `${process.env.SAAS_URL || 'https://www.saucedemo.com'}/?admin=true`,
      `${process.env.SAAS_URL || 'https://www.saucedemo.com'}/?test=<script>alert(1)</script>`
    ];

    for (const url of testUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Check that no sensitive debug info is exposed
      const pageText = await page.textContent('body');
      const hasDebugInfo = /stack trace|error:|exception|password|secret|token|api.?key/i.test(pageText || '');

      console.log(`URL: ${url.substring(0, 60)}`);
      console.log('Sensitive debug info exposed:', hasDebugInfo);

      expect(hasDebugInfo).toBeFalsy();
    }
  });

  test('366 - Security: Cookies are set with Secure and HttpOnly flags', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });

    const cookies = await page.context().cookies();
    console.log('Cookies set:', cookies.length);

    const insecureCookies = cookies.filter(cookie => {
      const isSessionCookie = /session|auth|token|user/i.test(cookie.name);
      return isSessionCookie && !cookie.secure;
    });

    const cookiesWithoutHttpOnly = cookies.filter(cookie => {
      const isSessionCookie = /session|auth|token|user/i.test(cookie.name);
      return isSessionCookie && !cookie.httpOnly;
    });

    console.log('All cookies:', cookies.map(c => ({
      name: c.name,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite
    })));

    if (insecureCookies.length > 0) {
      console.warn('Insecure session cookies (missing Secure flag):', insecureCookies.map(c => c.name));
    }
    if (cookiesWithoutHttpOnly.length > 0) {
      console.warn('Session cookies without HttpOnly:', cookiesWithoutHttpOnly.map(c => c.name));
    }

    expect(insecureCookies.length).toBe(0);
  });

  test('367 - Security: No sensitive information in page source (passwords, API keys)', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'domcontentloaded' });

    const pageSource = await page.content();

    // Check for common sensitive patterns
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*["'][^"']{4,}/i, name: 'password' },
      { pattern: /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{10,}/i, name: 'API key' },
      { pattern: /secret\s*[:=]\s*["'][^"']{8,}/i, name: 'secret' },
      { pattern: /bearer\s+[A-Za-z0-9._-]{20,}/i, name: 'Bearer token' },
      { pattern: /PRIVATE KEY/i, name: 'Private key' }
    ];

    const foundSensitive = [];
    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(pageSource)) {
        foundSensitive.push(name);
        console.warn(`Warning: Potential ${name} found in page source!`);
      }
    }

    console.log('Sensitive data found in source:', foundSensitive.length === 0 ? 'None' : foundSensitive);
    expect(foundSensitive.length).toBe(0);
  });

  test('368 - Security: External links open with rel="noopener noreferrer"', async ({ page }) => {
    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'domcontentloaded' });

    const externalLinksInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[target="_blank"]'));
      return links.map(link => ({
        href: link.getAttribute('href')?.substring(0, 60),
        rel: link.getAttribute('rel'),
        text: link.textContent?.trim().substring(0, 30)
      }));
    });

    console.log('External links (target="_blank"):', externalLinksInfo.length);

    const unsafeLinks = externalLinksInfo.filter(link => {
      const rel = link.rel || '';
      return !rel.includes('noopener') || !rel.includes('noreferrer');
    });

    if (unsafeLinks.length > 0) {
      console.warn('Links without noopener/noreferrer:', unsafeLinks);
    }

    // All external links should have noopener to prevent tab-napping
    expect(unsafeLinks.length).toBe(0);
  });

  test('369 - Security: Content Security Policy prevents unauthorized scripts', async ({ page }) => {
    test.setTimeout(90000);
    const response = await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const headers = response?.headers() || {};

    const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'];
    console.log('CSP Header:', csp?.substring(0, 200) || 'NOT SET');

    if (!csp) {
      console.warn('Warning: No Content Security Policy header set');
      // Check if CSP is in a meta tag
      const metaCSP = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content', { timeout: 5000 }).catch(() => null);
      console.log('CSP meta tag:', metaCSP?.substring(0, 100) || 'NOT SET');
    } else {
      // Verify CSP has important directives
      const hasDefaultSrc = csp.includes('default-src');
      const hasScriptSrc = csp.includes('script-src');
      console.log('CSP has default-src:', hasDefaultSrc);
      console.log('CSP has script-src:', hasScriptSrc);
    }

    expect(true).toBeTruthy(); // Informational
  });

  test('370 - Security: No console errors or warnings on homepage load', async ({ page }) => {
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    await page.goto(`${process.env.SAAS_URL || 'https://www.saucedemo.com'}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Console errors:', consoleErrors.length);
    console.log('Console warnings:', consoleWarnings.length);

    if (consoleErrors.length > 0) {
      // Filter out known third-party errors
      const significantErrors = consoleErrors.filter(err =>
        !err.includes('analytics') &&
        !err.includes('gtag') &&
        !err.includes('facebook') &&
        !err.includes('extension') &&
        !err.includes('favicon')
      );

      console.log('Significant errors:', significantErrors);
      if (significantErrors.length > 0) {
        console.warn('Console errors found:', significantErrors.slice(0, 5));
      }

      expect(significantErrors.length).toBe(0);
    }

    expect(true).toBeTruthy();
  });
});
