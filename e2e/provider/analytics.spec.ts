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
    const hasRevenue = await page
      .getByText(/total revenue/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasBookings = await page
      .getByText(/total bookings|completed bookings/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasRevenue || hasBookings).toBeTruthy();
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
