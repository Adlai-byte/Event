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

  await page.goto('/login');

  // Wait for login form to be ready
  await page.waitForSelector(LOGIN.emailInput, { timeout: 15000 });

  // Fill credentials
  await page.locator(LOGIN.emailInput).fill(user.email);
  await page.locator(LOGIN.passwordInput).fill(user.password);

  // Submit
  await page.locator(LOGIN.signInButton).click();

  // Wait for any dashboard to appear (login redirects through / which routes by role)
  await page.waitForURL('**/dashboard', { timeout: 30000 });

  // Allow role-based redirects to settle (admin/provider may bounce through /user/dashboard → / → /role/dashboard)
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');

  // Verify we ended up on the right dashboard
  const dashboardPath = role === 'admin' ? '/admin/dashboard' : role === 'provider' ? '/provider/dashboard' : '/user/dashboard';
  const currentUrl = page.url();
  if (!currentUrl.includes(dashboardPath)) {
    // If still on wrong dashboard, navigate directly
    await page.goto(dashboardPath);
    await page.waitForLoadState('networkidle');
  }

  // Final settle: ensure no more pending navigations before returning
  // This prevents "page.goto interrupted by another navigation" in subsequent goto() calls
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Log out the current user by clearing storage (including IndexedDB for Firebase)
 * and navigating away.
 */
export async function logout(page: Page): Promise<void> {
  // Clear all storage to ensure clean logout
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear IndexedDB (Firebase stores auth tokens here)
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });

  // Navigate to landing page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
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
