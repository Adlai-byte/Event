import { test, expect } from '@playwright/test';
import { TEST_PASSWORDS } from '../fixtures/test-data';
import { REGISTER } from '../helpers/selectors';
import { goToRegister } from '../helpers/navigation';

test.describe('Authentication — Register Redirect Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app domain first before clearing storage (avoid about:blank DOMException)
    await goToRegister(page);
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForSelector(REGISTER.firstNameInput, { timeout: 15_000 });
  });

  test('successful registration redirects to dashboard', async ({ page }) => {
    // Generate a unique email so Firebase accepts it (won't conflict with prior runs)
    const timestamp = Date.now();
    const uniqueEmail = `testuser-${timestamp}@test-event.com`;

    await page.locator(REGISTER.firstNameInput).fill('Playwright');
    await page.locator(REGISTER.lastNameInput).fill('Tester');
    await page.locator(REGISTER.emailInput).fill(uniqueEmail);
    await page.locator(REGISTER.passwordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.confirmPasswordInput).fill(TEST_PASSWORDS.valid);
    await page.locator(REGISTER.createAccountButton).click();

    // Wait for router to navigate to dashboard
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify the dashboard rendered the greeting (uses firstName from form)
    await expect(page.getByText('Welcome back,', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});
