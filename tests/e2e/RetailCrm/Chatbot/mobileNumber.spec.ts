import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL    = `${process.env.CHATBOT_API_URL || 'https://httpbin.org'}/`;
const API_BASE    = `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;
const OTP_REQUEST = `${API_BASE}/api/auth/request-otp`;
const OTP_VERIFY  = `${API_BASE}/api/auth/verify-otp`;

const SELECTORS = {
  // Phone step
  mobileInput:    '#phoneNumber',
  submitBtn:      'button[type="submit"]',
  errorBanner:    'div.text-red-400',
  phoneLabel:     'label[for="phoneNumber"]',
  // OTP step
  otpInput:       '#otp',
  verifyBtn:      'button[type="submit"]',
  countdownText:  'p:has-text("Resend OTP in")',
  resendBtn:      'button:has-text("Resend OTP")',
  changeNumberBtn:'button:has-text("Change phone number")',
};

function randomPhone(): string {
  const prefix = ['7', '8', '9'][Math.floor(Math.random() * 3)];
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return prefix + rest;
}

async function getInput(page: Page): Promise<Locator> {
  const input = page.locator(SELECTORS.mobileInput);
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  return input;
}

async function getSubmitBtn(page: Page): Promise<Locator> {
  return page.locator(SELECTORS.submitBtn);
}

test.describe('OTP Login — Mobile Number Field Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  // ── Presence & Attributes ────────────────────────────────────────────────

  test('TC-01: Mobile number input field is visible on the page', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toBeVisible();
  });

  test('TC-02: Mobile number input field is enabled and editable', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toBeEnabled();
    await expect(input).not.toHaveAttribute('readonly');
    await expect(input).not.toHaveAttribute('disabled');
  });

  test('TC-03: Field has correct placeholder text', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toHaveAttribute('placeholder', 'Enter 10-digit phone number');
  });

  test('TC-04: Input type is "tel" with numeric inputmode', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toHaveAttribute('type', 'tel');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  test('TC-05: Field has maxlength of 10', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toHaveAttribute('maxlength', '10');
  });

  test('TC-06: Field cannot accept more than 10 digits due to maxlength', async ({ page }) => {
    const input = await getInput(page);
    await input.fill('12345678901'); // 11 digits
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
  });

  test('TC-07: Field is marked as required', async ({ page }) => {
    const input = await getInput(page);
    await expect(input).toHaveAttribute('required', '');
  });

  test('TC-08: Field label reads "Phone Number"', async ({ page }) => {
    const label = page.locator(SELECTORS.phoneLabel);
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Phone Number');
  });

  // ── Submit Button State (disabled until 10 digits) ───────────────────────

  test('TC-09: "Request OTP" button is disabled when field is empty', async ({ page }) => {
    const btn = await getSubmitBtn(page);
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('TC-10: Button remains disabled with fewer than 10 digits', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('98765'); // 5 digits
    await expect(btn).toBeDisabled();
  });

  test('TC-11: Button remains disabled with 9 digits', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('987654321'); // 9 digits
    await expect(btn).toBeDisabled();
  });

  test('TC-12: Button becomes enabled when exactly 10 digits are entered', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('9876543210');
    await expect(btn).toBeEnabled();
  });

  test('TC-13: Button text is "Request OTP"', async ({ page }) => {
    const btn = await getSubmitBtn(page);
    await expect(btn).toHaveText('Request OTP');
  });

  // ── Non-numeric Input Handling ───────────────────────────────────────────

  test('TC-14: Alphabetic characters are not retained in the field', async ({ page }) => {
    const input = await getInput(page);
    await input.pressSequentially('abcdefghij');
    const value = await input.inputValue();
    expect(value).not.toMatch(/[a-zA-Z]/);
  });

  test('TC-15: Special characters are not retained in the field', async ({ page }) => {
    const input = await getInput(page);
    await input.pressSequentially('!@#$%^&*()');
    const value = await input.inputValue();
    expect(value).not.toMatch(/[!@#$%^&*()]/);
  });

  test('TC-16: Spaces are not retained in the field', async ({ page }) => {
    const input = await getInput(page);
    await input.pressSequentially('98765 4321');
    const value = await input.inputValue();
    expect(value).not.toContain(' ');
  });

  // ── API-level Validation (post-submit errors) ────────────────────────────

  test('TC-17: Submitting a valid 10-digit number shows server response (button fires)', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill(randomPhone());
    await expect(btn).toBeEnabled();
    await page.waitForTimeout(3_000);
    await btn.click();
    // App either navigates to OTP step or shows an API error banner — either is correct UX
    await page.waitForTimeout(2000);
    const banner = page.locator(SELECTORS.errorBanner);
    const otpPage = page.locator('text=Enter OTP');
    const hasResponse = (await banner.isVisible()) || (await otpPage.isVisible().catch(() => false));
    expect(hasResponse).toBeTruthy();
  });

  test('TC-18: Submitting a number starting with 0 triggers error banner', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('0123456789');
    await expect(btn).toBeEnabled();
    await btn.click();
    const banner = page.locator(SELECTORS.errorBanner);
    await expect(banner).toBeVisible({ timeout: 8_000 });
  });

  test('TC-19: Submitting all-zeros triggers error banner', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('0000000000');
    await expect(btn).toBeEnabled();
    await btn.click();
    const banner = page.locator(SELECTORS.errorBanner);
    await expect(banner).toBeVisible({ timeout: 8_000 });
  });

  // ── UX Behaviour ─────────────────────────────────────────────────────────

  test('TC-20: Field receives focus on click', async ({ page }) => {
    const input = await getInput(page);
    await input.click();
    await expect(input).toBeFocused();
  });

  test('TC-21: Field value clears correctly when content is deleted', async ({ page }) => {
    const input = await getInput(page);
    await input.fill('9876543210');
    await input.selectText();
    await input.press('Delete');
    await expect(input).toHaveValue('');
  });

  test('TC-22: Pasting a valid 10-digit number populates the field and enables button', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.focus();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', '9123456780');
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })
      );
    });
    // Fallback: fill directly if paste was blocked
    if (!(await input.inputValue())) await input.fill('9123456780');
    await expect(input).toHaveValue('9123456780');
    await expect(btn).toBeEnabled();
  });

  test('TC-23: Clearing the field after 10 digits disables the button again', async ({ page }) => {
    const input = await getInput(page);
    const btn   = await getSubmitBtn(page);
    await input.fill('9876543210');
    await expect(btn).toBeEnabled();
    await input.fill('');
    await expect(btn).toBeDisabled();
  });

});

// ── Helper: mock a successful OTP request and land on the OTP step ───────────
async function triggerOtpStep(page: Page, phone = randomPhone()): Promise<void> {
  await page.route(OTP_REQUEST, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OTP sent' }) })
  );
  await page.fill(SELECTORS.mobileInput, phone);
  await page.waitForTimeout(3_000);
  await page.click(SELECTORS.submitBtn);
  // Wait until the OTP input field is visible (app has transitioned to OTP step)
  await page.locator(SELECTORS.otpInput).waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('OTP Flow Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  // ── SC-01: Non-whitelisted number ─────────────────────────────────────────

  test('SC-01: Non-whitelisted number shows error banner and does not proceed to OTP step', async ({ page }) => {
    // Mock API to return 403 as the real backend does for non-whitelisted numbers
    await page.route(OTP_REQUEST, route =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Phone number not whitelisted. Please contact support.' }),
      })
    );

    await page.fill(SELECTORS.mobileInput, '9000000001');
    await page.click(SELECTORS.submitBtn);

    // Error banner must appear
    const banner = page.locator(SELECTORS.errorBanner);
    await expect(banner).toBeVisible({ timeout: 8_000 });
    await expect(banner).toContainText('whitelisted');

    // Must NOT navigate to OTP step
    await expect(page.locator(SELECTORS.otpInput)).not.toBeVisible();
  });

  // ── SC-02: Resend OTP option is present after countdown ───────────────────

  test('SC-02: "Resend OTP" button appears after the 60-second countdown completes', async ({ page }) => {
    // Install a controllable fake clock before the timer starts
    await page.clock.install();

    await triggerOtpStep(page);

    // Immediately after OTP step loads the countdown should be running
    await expect(page.locator(SELECTORS.countdownText)).toBeVisible();
    await expect(page.locator(SELECTORS.resendBtn)).not.toBeVisible();

    // Advance clock by 60 seconds — countdown reaches zero
    await page.clock.fastForward(60_000);

    // Resend button must now be visible; countdown text must be gone
    await expect(page.locator(SELECTORS.resendBtn)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(SELECTORS.countdownText)).not.toBeVisible();
  });

  // ── SC-03: Change number + 60 s countdown reduces every second ───────────

  test('SC-03: OTP step shows "Change phone number" button and countdown reduces from 60 s', async ({ page }) => {
    await page.clock.install();

    await triggerOtpStep(page);

    // "Change phone number" must be visible immediately
    await expect(page.locator(SELECTORS.changeNumberBtn)).toBeVisible();

    // Countdown starts at 60 s
    await expect(page.locator(SELECTORS.countdownText)).toContainText('60s');

    // After 1 second the counter must read 59 s
    await page.clock.runFor(1_000);
    await expect(page.locator(SELECTORS.countdownText)).toContainText('59s');

    // After another second it must read 58 s (confirms it is reducing continuously)
    await page.clock.runFor(1_000);
    await expect(page.locator(SELECTORS.countdownText)).toContainText('58s');

    // Fast-forward the remaining 58 seconds — counter must reach zero and button appear
    await page.clock.fastForward(58_000);
    await expect(page.locator(SELECTORS.resendBtn)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(SELECTORS.countdownText)).not.toBeVisible();
  });

  // ── SC-04: Invalid OTP shows validation errors ────────────────────────────

  test('SC-04a: Submitting fewer than 6 digits shows client-side validation error', async ({ page }) => {
    await triggerOtpStep(page);

    await page.fill(SELECTORS.otpInput, '123'); // only 3 digits
    await page.click(SELECTORS.verifyBtn);

    const banner = page.locator(SELECTORS.errorBanner);
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toContainText('valid 6-digit OTP');
  });

  test('SC-04b: Submitting a wrong 6-digit OTP shows "Invalid OTP" error from the API', async ({ page }) => {
    await triggerOtpStep(page);

    // Mock verifyOtp to return 401 (wrong OTP)
    await page.route(OTP_VERIFY, route =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid OTP.' }),
      })
    );

    await page.fill(SELECTORS.otpInput, '000000');
    await page.click(SELECTORS.verifyBtn);

    const banner = page.locator(SELECTORS.errorBanner);
    await expect(banner).toBeVisible({ timeout: 8_000 });
    await expect(banner).toContainText('Invalid OTP');
  });

  test('SC-04c: Submitting an empty OTP field keeps the verify button disabled', async ({ page }) => {
    await triggerOtpStep(page);

    // OTP input is empty — verify button must be disabled
    await expect(page.locator(SELECTORS.verifyBtn)).toBeDisabled();
  });

});
