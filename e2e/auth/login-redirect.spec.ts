import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';
import { LOGIN } from '../helpers/selectors';
import { goToLogin } from '../helpers/navigation';

test.describe('Authentication — Login Redirect Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app domain first before clearing storage (avoid about:blank DOMException)
    await goToLogin(page);
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector(LOGIN.emailInput, { timeout: 15_000 });
  });

  test('successful login with valid credentials redirects to dashboard', async ({ page }) => {
    const customer = TEST_USERS.customer;

    await page.locator(LOGIN.emailInput).fill(customer.email);
    await page.locator(LOGIN.passwordInput).fill(customer.password);
    await page.locator(LOGIN.signInButton).click();

    // Wait for navigation to dashboard after Firebase auth succeeds
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify the dashboard rendered the user's name greeting
    await expect(page.getByText('Welcome back,', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});
