import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Dashboard (A1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('dashboard loads with welcome content', async ({ page }) => {
    await expect(
      page.getByText(/Admin Dashboard/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows platform stats — Total Users, Services, Bookings', async ({ page }) => {
    await expect(
      page.getByText('Total Users').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Services').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Bookings').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('quick action buttons are visible', async ({ page }) => {
    // Buttons with accessibility labels from the view
    await expect(
      page.locator('[aria-label="Manage users"]'),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="Manage services"]'),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="View reports"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('recent activity section is visible', async ({ page }) => {
    await expect(
      page.getByText('Recent Activity').first(),
    ).toBeVisible({ timeout: 10_000 });

    // "View All" button with accessibility label
    const viewAllBtn = page.locator('[aria-label="View all recent activity"]');
    await expect(viewAllBtn).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar shows admin nav items on desktop', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      'Sidebar nav items only visible on desktop',
    );

    const navItems = [
      'Dashboard',
      'Users',
      'Services',
      'Bookings',
      'Analytics',
      'Messages',
      'Applications',
    ];

    for (const item of navItems) {
      await expect(
        page.getByText(item, { exact: true }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('stats section shows metrics', async ({ page }) => {
    // Wait for dashboard content to load
    await page.waitForTimeout(3000);

    // Look for any stat-like content (numbers, metrics, counts)
    const hasStats = await page
      .getByText(/total|users|bookings|services|revenue/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasStats).toBeTruthy();
  });
});
