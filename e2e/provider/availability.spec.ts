import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Availability (P4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/availability');
    await page.waitForLoadState('networkidle');
  });

  test('availability page loads', async ({ page }) => {
    await expect(
      page.getByText(/availability/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows calendar or schedule view', async ({ page }) => {
    // Look for calendar elements or schedule/day-of-week labels
    const hasCalendar = await page
      .locator('table, [aria-label*="calendar"], [aria-label*="Calendar"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasDayLabels = await page
      .getByText(/monday|tuesday|wednesday|thursday|friday/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasScheduleRow = await page
      .getByText(/start time|end time|available/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasCalendar || hasDayLabels || hasScheduleRow).toBeTruthy();
  });

  test('can interact with date selection or day toggle', async ({ page }) => {
    // Look for a toggle or clickable date element
    const dayToggle = page.locator('[aria-label*="availability toggle"]').first();
    const dateCell = page.locator('[aria-label*="available"], [aria-label*="blocked"]').first();

    const hasToggle = await dayToggle
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasDateCell = await dateCell
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasToggle) {
      await dayToggle.click();
      // Should not throw — element is interactive
    } else if (hasDateCell) {
      await dateCell.click();
    }

    expect(hasToggle || hasDateCell).toBeTruthy();
  });

  test('shows time slot or schedule settings', async ({ page }) => {
    // Look for time inputs (start/end time for each day)
    const hasTimeInput = await page
      .locator('[aria-label*="start time"], [aria-label*="end time"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasToSeparator = await page
      .getByText('to', { exact: true })
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasTimeInput || hasToSeparator).toBeTruthy();
  });
});
