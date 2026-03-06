import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Analytics (A5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('analytics page loads', async ({ page }) => {
    await expect(
      page.getByText(/Analytics & Reports|Analytics/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows chart or graph area', async ({ page }) => {
    // The analytics view renders User Growth section and Booking Status Distribution
    const hasUserGrowth = await page
      .getByText('User Growth')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasDistribution = await page
      .getByText('Booking Status Distribution')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasTopServices = await page
      .getByText('Top Performing Services')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasUserGrowth || hasDistribution || hasTopServices).toBeTruthy();
  });

  test('shows platform-wide metrics', async ({ page }) => {
    // Stat cards: Active Users, Total Bookings
    const hasActiveUsers = await page
      .getByText('Active Users')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasTotalBookings = await page
      .getByText('Total Bookings')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasActiveUsers || hasTotalBookings).toBeTruthy();
  });

  test('shows insights subtitle', async ({ page }) => {
    // The header subtitle reads "Comprehensive insights and metrics"
    await expect(
      page.getByText(/Comprehensive insights|insights and metrics/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
