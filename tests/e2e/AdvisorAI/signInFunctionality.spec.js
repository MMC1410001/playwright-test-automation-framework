import { test, expect } from '@playwright/test';

test('Verify Get OTP functionality for SMS option', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
  
  // Click on Sign in option
  const signInButton = await page.locator('button:has-text("Sign in")').first();
  await signInButton.click();
  
  // Enter name and mobile number
  const nameField = await page.locator('input[placeholder*="Enter your name"]').first();
  await nameField.fill('Test User');
  
  const mobileField = await page.locator('input[placeholder*="Enter your 10-digit mobile number"]');
  await mobileField.fill('9876543210'); // Use a test number
  
  // Select SMS option if available
  try {
    const smsOption = await page.locator('label:has-text("SMS")');
    await smsOption.click();
  } catch (e) {
    console.log('SMS option not found or already selected');
  }
  
  // Click Get OTP button
  const getOtpButton = await page.locator('button:has-text("Get OTP")');
  await getOtpButton.click();
  
  // Verify OTP field appears
  const otpField = await page.locator('input[placeholder*="OTP"]');
  expect(await otpField.isVisible()).toBeTruthy();
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'sms-otp-sent.png' });
});

test('Verify Get OTP functionality for WhatsApp option', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
  
  // Click on Sign in option
  const signInButton = await page.locator('button:has-text("Sign in")').first();
  await signInButton.click();
  
  // Enter name and mobile number
  const nameField = await page.locator('input[placeholder*="Enter your name"]').first();
  await nameField.fill('Test User');
  
  const mobileField = await page.locator('input[placeholder*="Enter your 10-digit mobile number"]');
  await mobileField.fill('9876543210'); // Use a test number
  
  // Select WhatsApp option
  try {
    const whatsappOption = await page.locator('label:has-text("WhatsApp")');
    await whatsappOption.click();
  } catch (e) {
    console.log('WhatsApp option not found');
  }
  
  // Click Get OTP button
  const getOtpButton = await page.locator('button:has-text("Get OTP")');
  await getOtpButton.click();
  
  // Verify OTP field appears
  const otpField = await page.locator('input[placeholder*="OTP"]');
  expect(await otpField.isVisible()).toBeTruthy();
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'whatsapp-otp-sent.png' });
});

test('Verify validation for empty user input fields', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
  
  // Click on Sign in option
  const signInButton = await page.locator('button:has-text("Sign in")').first();
  await signInButton.click();
  
  // Leave fields empty and check if Get OTP button is disabled
  const getOtpButton = await page.locator('button:has-text("Get OTP")');
  expect(await getOtpButton.isDisabled()).toBeTruthy();
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'empty-fields-validation.png' });
});

test('Verify Get OTP button gets enabled when both fields are filled', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
  
  // Click on Sign in option
  const signInButton = await page.locator('button:has-text("Sign in")').first();
  await signInButton.click();
  
  // Enter name and mobile number
  const nameField = await page.locator('input[placeholder*="Enter your name"]').first();
  await nameField.fill('Test User');
  
  const mobileField = await page.locator('input[placeholder*="Enter your 10-digit mobile number"]');
  await mobileField.fill('9876543210');
  
  // Check if Get OTP button is enabled
  const getOtpButton = await page.locator('button:has-text("Get OTP")');
  expect(await getOtpButton.isDisabled()).toBeFalsy();
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'get-otp-button-enabled.png' });
});

test('Verify Cancel button closes the Sign In window', async ({ page }) => {
  await page.goto(`${process.env.ADVISOR_URL || 'https://the-internet.herokuapp.com'}/`);
  
  // Click on Sign in option
  const signInButton = await page.locator('button:has-text("Sign in")').first();
  await signInButton.click();
  
  // Verify sign in modal is visible
  const signInModal = await page.locator('.text-lg font-500 text-white:has-text("Register with your whatsapp number")');
  
  expect(await signInModal.isVisible()).toBeTruthy();
  
  // Click Cancel button
  const cancelButton = await page.locator('button:has-text("Cancel")');
  await cancelButton.click();
  
  // Verify sign in modal is no longer visible
  await expect(signInModal).toBeHidden();
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'sign-in-cancelled.png' });
});