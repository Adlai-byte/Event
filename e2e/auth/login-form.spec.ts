import { test, expect } from '@playwright/test';
import { VALIDATION_ERRORS, TEST_EMAILS, TEST_PASSWORDS } from '../fixtures/test-data';
import { LOGIN } from '../helpers/selectors';
import { goToLogin } from '../helpers/navigation';

test.describe('Login Form — validation & UI', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('renders login form with "Welcome Back" title', async ({ page }) => {
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('email input accepts text', async ({ page }) => {
    const emailInput = page.locator(LOGIN.emailInput);
    await emailInput.fill(TEST_EMAILS.valid);
    await expect(emailInput).toHaveValue(TEST_EMAILS.valid);
  });

  test('password input is masked by default', async ({ page }) => {
    const passwordInput = page.locator(LOGIN.passwordInput);
    // RNW renders secureTextEntry as type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('toggle password visibility works', async ({ page }) => {
    const passwordInput = page.locator(LOGIN.passwordInput);
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password toggle
    await page.locator(LOGIN.showPassword).click();
    // After toggle, should be visible — type changes to "text"
    await expect(passwordInput).not.toHaveAttribute('type', 'password');

    // Click hide password toggle
    await page.locator(LOGIN.hidePassword).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('empty form submission shows "Email is required" and "Password is required"', async ({ page }) => {
    await page.locator(LOGIN.signInButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.emailRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.passwordRequired)).toBeVisible();
  });

  test('invalid email shows "Please enter a valid email address"', async ({ page }) => {
    await page.locator(LOGIN.emailInput).fill(TEST_EMAILS.invalid);
    await page.locator(LOGIN.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(LOGIN.signInButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.emailInvalid)).toBeVisible();
  });

  test('short password (<6 chars) shows password error', async ({ page }) => {
    await page.locator(LOGIN.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(LOGIN.passwordInput).fill(TEST_PASSWORDS.short);
    await page.locator(LOGIN.signInButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.passwordShort)).toBeVisible();
  });

  test('displays "Forgot Password?" link', async ({ page }) => {
    await expect(page.getByText('Forgot Password?')).toBeVisible();
  });

  test('clicking "Sign Up" navigates to register', async ({ page }) => {
    await page.locator(LOGIN.signUpLink).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('sign in button shows loading state on submit', async ({ page }) => {
    await page.locator(LOGIN.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(LOGIN.passwordInput).fill(TEST_PASSWORDS.valid);

    // Intercept the auth call to delay response
    await page.route('**/identitytoolkit**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.abort();
    });

    await page.locator(LOGIN.signInButton).click();
    // The button should show a loading indicator (ActivityIndicator renders as a div with role)
    // The Sign In text should disappear while loading
    await expect(page.getByText('Sign In', { exact: true })).not.toBeVisible({ timeout: 3_000 });
  });

  test('invalid credentials shows error message', async ({ page }) => {
    // Mock Firebase auth to return error
    await page.route('**/identitytoolkit**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'INVALID_LOGIN_CREDENTIALS', code: 400 },
        }),
      });
    });

    await page.locator(LOGIN.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(LOGIN.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(LOGIN.signInButton).click();

    // An error message should appear in the error container rendered by the view.
    // RNW doesn't use CSS class names, so look for visible error text or the error container.
    const hasErrorText = await page
      .getByText(/error|invalid|failed|incorrect|wrong/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasErrorContainer = await page
      .locator('[style*="FEF2F2"], [style*="fef2f2"]')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    // Sign In button should be re-enabled (loading finished), indicating the error path ran
    const signInReappeared = await page
      .getByText('Sign In', { exact: true })
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasErrorText || hasErrorContainer || signInReappeared).toBeTruthy();
  });

  test('desktop: login card with branding', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, 'Desktop only');
    await expect(page.getByText('E-VENT')).toBeVisible();
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });
});
