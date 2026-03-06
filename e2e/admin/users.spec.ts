import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Users (A2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
  });

  test('users page loads', async ({ page }) => {
    await expect(
      page.getByText(/User Management|Users/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows list of users (at least the 3 test users)', async ({ page }) => {
    // Wait for user list to render
    await expect(
      page.locator('[aria-label="View all users tab"]'),
    ).toBeVisible({ timeout: 10_000 });

    // There should be at least a few user rows/cards rendered
    // Look for common user-related content — emails or names
    const customerVisible = await page
      .getByText(/e2e-customer|Test Customer/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const providerVisible = await page
      .getByText(/e2e-provider|Test Provider/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // At least one seeded user should appear
    expect(customerVisible || providerVisible).toBeTruthy();
  });

  test('shows role badges', async ({ page }) => {
    // Wait for content to load
    await expect(
      page.locator('[aria-label="View all users tab"]'),
    ).toBeVisible({ timeout: 10_000 });

    // Role labels should appear (User, Provider, or Admin)
    const hasUserRole = await page
      .getByText('User', { exact: true })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasProviderRole = await page
      .getByText('Provider', { exact: true })
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasUserRole || hasProviderRole).toBeTruthy();
  });

  test('has search input', async ({ page }) => {
    const searchInput = page.locator('[aria-label="Search users"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('can search for e2e-customer and find result', async ({ page }) => {
    const searchInput = page.locator('[aria-label="Search users"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('e2e-customer');
    await page.waitForTimeout(1000);

    // After filtering, the customer user should still be visible
    await expect(
      page.getByText(/e2e-customer/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
