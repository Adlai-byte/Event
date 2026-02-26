import { test, expect } from '@playwright/test';

test.describe('Public route navigation', () => {
  test('/ on desktop redirects to /landing', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Desktop only — mobile redirects to /login');
    await page.goto('/');
    await page.waitForURL(/\/(landing|login)/, { timeout: 30_000 });
    // Desktop (>= 768px) should redirect to /landing
    expect(page.url()).toContain('/landing');
  });

  test('/ on mobile redirects to /login', async ({ page }) => {
    test.skip(page.viewportSize()!.width >= 768, 'Mobile only — desktop redirects to /landing');
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    expect(page.url()).toContain('/login');
  });

  test('/login renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[aria-label="Email address"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[aria-label="Sign in"]')).toBeVisible();
  });

  test('/register renders registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('[aria-label="First name"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[aria-label="Create account"]')).toBeVisible();
  });

  test('/landing renders landing page', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.getByText('E-VENT').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Plan your perfect event')).toBeVisible();
  });

  test('"Account" link on landing navigates to login', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Landing page is desktop-oriented');
    await page.goto('/landing');
    await page.waitForSelector('text=E-VENT', { timeout: 30_000 });
    await page.getByText('Account').click();
    // Account click should trigger login modal or navigate — either way login form appears
    await expect(page.locator('[aria-label="Email address"]')).toBeVisible({ timeout: 10_000 });
  });
});
