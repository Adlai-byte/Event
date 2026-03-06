import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Analytics (P10)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('analytics page loads', async ({ page }) => {
    await expect(
      page.getByText('Analytics').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows revenue or booking data section', async ({ page }) => {
    // The view renders StatCard with title="Total Revenue" and title="Bookings"
    const revenueOrBookings = page
      .getByText(/total revenue|bookings|revenue trend/i)
      .first();

    await expect(revenueOrBookings).toBeVisible({ timeout: 15_000 });
  });

  test('shows chart or graph area', async ({ page }) => {
    // Look for chart containers — canvas, svg, or chart-like elements
    const hasChart = await page
      .locator('canvas, svg, [class*="chart"], [class*="Chart"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasChartSection = await page
      .getByText(/revenue trend|booking trend|monthly|performance/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasChart || hasChartSection).toBeTruthy();
  });

  test('has time period filter — Week, Month, Year', async ({ page }) => {
    await expect(
      page.getByText('Week', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Month', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Year', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
