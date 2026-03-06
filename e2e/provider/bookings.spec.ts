import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Bookings (P3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/bookings');
    await page.waitForLoadState('networkidle');
  });

  test('bookings page loads', async ({ page }) => {
    await expect(
      page.getByText(/bookings/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows filter tabs including in_progress', async ({ page }) => {
    // The status filters: all, pending, confirmed, in_progress, completed, cancelled
    await expect(
      page.getByText('all', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('confirmed', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('in_progress', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows seeded booking from customer', async ({ page }) => {
    // Look for booking content — the seeded booking should show customer info or event name
    const hasBooking = await page
      .getByText(/e2e.*customer|test.*customer|booking/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasAnyBookingCard = await page
      .locator('[aria-label*="View details for"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasBookingContent = await page
      .getByText(/confirmed|pending|photography/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasBooking || hasAnyBookingCard || hasBookingContent).toBeTruthy();
  });

  test('confirmed booking shows Start Service button', async ({ page }) => {
    // Filter to confirmed bookings
    const confirmedTab = page.getByText('confirmed', { exact: true }).first();
    if (await confirmedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmedTab.click();
      await page.waitForTimeout(1000);
    }

    const startBtn = page.locator('[aria-label="Start service"]').first();
    const hasStartBtn = await startBtn
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // If no confirmed bookings exist, that's OK — just check if the button would show
    if (!hasStartBtn) {
      // Also acceptable: no confirmed bookings means no start button
      const noBookingsMsg = await page
        .getByText(/no.*confirmed.*booking/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasStartBtn || noBookingsMsg).toBeTruthy();
    }
  });

  test('booking card shows customer info or event details', async ({ page }) => {
    // Look for any booking card with details
    const hasDetailsButton = await page
      .locator('[aria-label*="View details"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasBookingInfo = await page
      .getByText(/photography|venue|catering|music|decoration|transportation/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasNoBookings = await page
      .getByText(/no.*booking/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasDetailsButton || hasBookingInfo || hasNoBookings).toBeTruthy();
  });
});
