import { test, expect } from '@playwright/test';
import { LANDING } from '../helpers/selectors';

const BASE_URL = 'http://localhost:8081';

test.describe('Authentication Security — Public Access Guards', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app domain first before clearing storage (avoid about:blank DOMException)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
  });

  test('guests can browse the landing page without authentication', async ({ page }) => {
    await page.goto(BASE_URL);

    // Key landing page branding elements must be visible to guests
    await expect(page.locator(`text=E-VENT`).first()).toBeVisible({ timeout: 10_000 });
    // The "Login" nav link should be visible for unauthenticated users
    await expect(page.locator(LANDING.loginButton).first()).toBeVisible({ timeout: 10_000 });
  });

  test('guests accessing /user/dashboard are redirected to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/dashboard`);

    // The router guard (app/user/_layout.tsx) redirects unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText('Welcome Back').first()).toBeVisible({ timeout: 10_000 });
  });

  test('guests accessing /user/bookings are redirected to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/bookings`);

    // The router guard (app/user/_layout.tsx) redirects unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText('Welcome Back').first()).toBeVisible({ timeout: 10_000 });
  });
});
