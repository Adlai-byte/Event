import { test, expect } from '@playwright/test';
import { VALIDATION_ERRORS, TEST_EMAILS } from '../fixtures/test-data';
import { LOGIN, FORGOT_PASSWORD } from '../helpers/selectors';
import { goToLogin } from '../helpers/navigation';

test.describe('Forgot Password — modal flow', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('clicking "Forgot Password" shows reset form', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await expect(page.getByText('Reset Password')).toBeVisible();
  });

  test('form shows "Reset Password" title', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await expect(page.getByText('Reset Password')).toBeVisible();
    await expect(
      page.getByText("Enter your email address and we'll send you a link to reset your password."),
    ).toBeVisible();
  });

  test('empty email shows error', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await page.locator(FORGOT_PASSWORD.sendResetLink).click();
    // The forgot password form has its own validation — shows "Please enter your email address"
    await expect(page.getByText('Please enter your email address')).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await page.locator(FORGOT_PASSWORD.emailInput).fill(TEST_EMAILS.invalid);
    await page.locator(FORGOT_PASSWORD.sendResetLink).click();
    await expect(page.getByText(VALIDATION_ERRORS.emailInvalid)).toBeVisible();
  });

  test('cancel returns to login form', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await expect(page.getByText('Reset Password')).toBeVisible();
    await page.locator(FORGOT_PASSWORD.cancel).click();
    // Should be back to login — Sign In button visible
    await expect(page.locator(LOGIN.signInButton)).toBeVisible();
    await expect(page.getByText('Reset Password')).not.toBeVisible();
  });

  test('form has Send Reset Link and Cancel buttons', async ({ page }) => {
    await page.locator(LOGIN.forgotPassword).click();
    await expect(page.locator(FORGOT_PASSWORD.sendResetLink)).toBeVisible();
    await expect(page.locator(FORGOT_PASSWORD.cancel)).toBeVisible();
  });
});
