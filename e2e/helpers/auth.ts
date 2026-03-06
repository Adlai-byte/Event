import { Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';
import { LOGIN, REGISTER } from './selectors';

type Role = keyof typeof TEST_USERS;

/**
 * Log in as a specific role using the login form.
 * Fills email/password and waits for the dashboard to load.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const user = TEST_USERS[role];

  await page.goto('/');

  // Navigate to login if not already there
  const loginUrl = page.url();
  if (!loginUrl.includes('/login')) {
    // Click the Account / login link on the landing page
    const accountLink = page.locator('text=Account').first();
    if (await accountLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountLink.click();
    } else {
      await page.goto('/login');
    }
  }

  // Wait for login form to be ready
  await page.waitForSelector(LOGIN.emailInput, { timeout: 15000 });

  // Fill credentials
  await page.locator(LOGIN.emailInput).fill(user.email);
  await page.locator(LOGIN.passwordInput).fill(user.password);

  // Submit
  await page.locator(LOGIN.signInButton).click();

  // Wait for dashboard redirect based on role
  const dashboardPath = role === 'admin' ? '/admin/dashboard' : role === 'provider' ? '/provider/dashboard' : '/user/dashboard';
  await page.waitForURL(`**${dashboardPath}`, { timeout: 30000 });
}

/**
 * Log out the current user by clearing storage and navigating away.
 */
export async function logout(page: Page): Promise<void> {
  // Clear all storage to ensure clean logout
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to landing page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Register a new user via the registration form.
 * Fills all required fields and submits.
 */
export async function registerUser(page: Page, role: Role): Promise<void> {
  const user = TEST_USERS[role];

  await page.goto('/register');

  // Wait for registration form to be ready
  await page.waitForSelector(REGISTER.firstNameInput, { timeout: 15000 });

  // Fill registration form
  await page.locator(REGISTER.firstNameInput).fill(user.firstName);
  await page.locator(REGISTER.lastNameInput).fill(user.lastName);
  await page.locator(REGISTER.emailInput).fill(user.email);
  await page.locator(REGISTER.passwordInput).fill(user.password);
  await page.locator(REGISTER.confirmPasswordInput).fill(user.password);

  // Submit
  await page.locator(REGISTER.createAccountButton).click();

  // Wait for redirect to user dashboard after successful registration
  await page.waitForURL('**/user/dashboard', { timeout: 30000 });
}
