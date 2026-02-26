import { test, expect } from '@playwright/test';
import { VALIDATION_ERRORS, TEST_EMAILS, TEST_PASSWORDS } from '../fixtures/test-data';
import { REGISTER } from '../helpers/selectors';
import { goToRegister } from '../helpers/navigation';

test.describe('Register Form — validation & UI', () => {
  test.beforeEach(async ({ page }) => {
    await goToRegister(page);
  });

  test('renders form with "Create Account" title', async ({ page }) => {
    await expect(page.getByText('Create Account', { exact: true }).first()).toBeVisible();
  });

  test('displays all 7 form fields', async ({ page }) => {
    await expect(page.locator(REGISTER.firstNameInput)).toBeVisible();
    await expect(page.locator(REGISTER.lastNameInput)).toBeVisible();
    await expect(page.locator(REGISTER.middleNameInput)).toBeVisible();
    await expect(page.locator(REGISTER.suffixInput)).toBeVisible();
    await expect(page.locator(REGISTER.emailInput)).toBeVisible();
    await expect(page.locator(REGISTER.passwordInput)).toBeVisible();
    await expect(page.locator(REGISTER.confirmPasswordInput)).toBeVisible();
  });

  test('first/last name side-by-side on desktop', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Desktop/tablet only');
    const firstName = page.locator(REGISTER.firstNameInput);
    const lastName = page.locator(REGISTER.lastNameInput);
    const fnBox = await firstName.boundingBox();
    const lnBox = await lastName.boundingBox();
    expect(fnBox).toBeTruthy();
    expect(lnBox).toBeTruthy();
    // Same row = similar Y coordinate
    expect(Math.abs(fnBox!.y - lnBox!.y)).toBeLessThan(10);
  });

  test('middle/suffix side-by-side on desktop', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Desktop/tablet only');
    const middleName = page.locator(REGISTER.middleNameInput);
    const suffix = page.locator(REGISTER.suffixInput);
    const mnBox = await middleName.boundingBox();
    const sfBox = await suffix.boundingBox();
    expect(mnBox).toBeTruthy();
    expect(sfBox).toBeTruthy();
    expect(Math.abs(mnBox!.y - sfBox!.y)).toBeLessThan(10);
  });

  test('empty form shows 5 required field errors', async ({ page }) => {
    await page.locator(REGISTER.createAccountButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.firstNameRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.lastNameRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.emailRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.passwordRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.confirmPasswordRequired)).toBeVisible();
  });

  test('partial fill shows remaining required errors', async ({ page }) => {
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(REGISTER.createAccountButton).click();
    // first name and email should NOT show errors
    await expect(page.getByText(VALIDATION_ERRORS.firstNameRequired)).not.toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.emailRequired)).not.toBeVisible();
    // remaining should show
    await expect(page.getByText(VALIDATION_ERRORS.lastNameRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.passwordRequired)).toBeVisible();
    await expect(page.getByText(VALIDATION_ERRORS.confirmPasswordRequired)).toBeVisible();
  });

  test('rejects "not-an-email" format', async ({ page }) => {
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.invalid);
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.createAccountButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.emailInvalid)).toBeVisible();
  });

  test('rejects "user@" (no domain)', async ({ page }) => {
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.noDomain);
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.createAccountButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.emailInvalid)).toBeVisible();
  });

  test('short password shows error', async ({ page }) => {
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.short);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.short);
    await page.locator(REGISTER.createAccountButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.passwordShort)).toBeVisible();
  });

  test('mismatched passwords shows "Passwords do not match"', async ({ page }) => {
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.mismatch);
    await page.locator(REGISTER.createAccountButton).click();
    await expect(page.getByText(VALIDATION_ERRORS.passwordsMismatch)).toBeVisible();
  });

  test('middle name and suffix are optional', async ({ page }) => {
    // Fill only required fields (no middle name or suffix)
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.valid);

    // Mock Firebase auth to prevent actual registration
    await page.route('**/identitytoolkit**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ idToken: 'fake', email: TEST_EMAILS.valid, localId: 'fake-uid' }),
      });
    });

    await page.locator(REGISTER.createAccountButton).click();
    // No validation errors should appear for middle name or suffix
    await expect(page.getByText('Middle name is required')).not.toBeVisible();
    await expect(page.getByText('Suffix is required')).not.toBeVisible();
  });

  test('"Sign In" link navigates to login', async ({ page }) => {
    await page.locator(REGISTER.signInLink).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('toggle password visibility on both fields', async ({ page }) => {
    const passwordInput = page.locator(REGISTER.passwordInput);
    const confirmInput = page.locator(REGISTER.confirmPasswordInput);

    // Both should start masked
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmInput).toHaveAttribute('type', 'password');

    // Toggle password field
    await page.locator(REGISTER.showPassword).click();
    await expect(passwordInput).not.toHaveAttribute('type', 'password');

    // Toggle confirm password field
    await page.locator(REGISTER.showConfirmPassword).click();
    await expect(confirmInput).not.toHaveAttribute('type', 'password');
  });

  test('create account button disabled during submission', async ({ page }) => {
    await page.locator(REGISTER.firstNameInput).fill('John');
    await page.locator(REGISTER.lastNameInput).fill('Doe');
    await page.locator(REGISTER.emailInput).fill(TEST_EMAILS.valid);
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.valid);

    // Intercept Firebase to delay response
    await page.route('**/identitytoolkit**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.abort();
    });

    await page.locator(REGISTER.createAccountButton).click();
    // The "Create Account" text should disappear (replaced by spinner)
    await expect(page.locator(REGISTER.createAccountButton).getByText('Create Account')).not.toBeVisible({ timeout: 3_000 });
  });
});
