import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Dashboard (P1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
  });

  test('dashboard loads with welcome text and stats', async ({ page }) => {
    await expect(
      page.getByText(/welcome back/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows stats cards — services, bookings, revenue', async ({ page }) => {
    await expect(
      page.getByText('Services').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Bookings').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Revenue').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('quick action buttons visible — Add service, View bookings, View hiring', async ({ page }) => {
    await expect(
      page.locator('[aria-label="Add service"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="View bookings"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="View hiring"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('booking overview section visible with View All button', async ({ page }) => {
    await expect(
      page.getByText('Booking Overview').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="View all bookings"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('recent activity section visible', async ({ page }) => {
    const activityVisible = await page
      .locator('[aria-label="View all recent activity"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const recentTextVisible = await page
      .getByText(/recent activity/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(activityVisible || recentTextVisible).toBeTruthy();
  });

  test('sidebar shows provider nav items on desktop', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      'Sidebar nav items only visible on desktop',
    );

    const navItems = [
      'Dashboard',
      'Services',
      'Bookings',
      'Availability',
      'Proposals',
      'Hiring',
      'Messages',
      'Analytics',
      'Profile',
    ];

    for (const item of navItems) {
      await expect(
        page.getByText(item, { exact: true }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
