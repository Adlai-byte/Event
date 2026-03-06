import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Bookings (A4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/bookings');
    await page.waitForLoadState('networkidle');
  });

  test('bookings page loads', async ({ page }) => {
    await expect(
      page.getByText(/Bookings/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows platform bookings or empty state', async ({ page }) => {
    // Wait for page content to load
    await page.waitForTimeout(2000);

    // Either bookings are displayed or a "no bookings" message
    const hasBookingContent = await page
      .getByText(/pending|confirmed|completed|cancelled|No bookings/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasSearchInput = await page
      .locator('[aria-label="Search bookings"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasBookingContent || hasSearchInput).toBeTruthy();
  });

  test('filter tabs visible for booking statuses', async ({ page }) => {
    // Status filter chips: all, pending, confirmed, completed, cancelled
    await expect(
      page.locator('[aria-label="Filter by all"]'),
    ).toBeVisible({ timeout: 10_000 });

    const hasPendingFilter = await page
      .locator('[aria-label="Filter by pending"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasConfirmedFilter = await page
      .locator('[aria-label="Filter by confirmed"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasPendingFilter || hasConfirmedFilter).toBeTruthy();
  });

  test('booking entries show status badges', async ({ page }) => {
    // Wait for bookings to load
    await page.waitForTimeout(2000);

    // Check for status text in booking entries
    const hasStatusBadge = await page
      .getByText(/Pending|Confirmed|Completed|Cancelled/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // If there are no bookings, look for the empty/no-data state
    const hasEmptyState = await page
      .getByText(/no bookings|no results/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasStatusBadge || hasEmptyState).toBeTruthy();
  });
});
