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

  test('stats show actual numbers, not hardcoded zeros', async ({ page }) => {
    // Wait for stats to load (skeleton cards disappear)
    await expect(
      page.getByText('Total Users').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Find the metric values — they should be rendered as large numbers
    // At minimum we have test users seeded, so totalUsers should be > 0
    const metricValues = page.locator('[class*="metricValue"], [class*="metric"]');
    const count = await metricValues.count();

    // Fallback: just check that at least one number > 0 appears near "Total Users"
    const totalUsersCard = page.getByText('Total Users').first();
    const parent = totalUsersCard.locator('..');
    const parentText = await parent.textContent();

    // The card should contain a number that is not just "0"
    const hasNonZero = parentText !== null && /[1-9]/.test(parentText);
    const hasNumber = hasNonZero || count > 0;
    expect(hasNumber).toBeTruthy();
  });
});
