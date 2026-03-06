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
    // The view renders calendar day cells with aria-labels like "March 15, 2026, available"
    // and schedule toggle buttons with aria-labels like "Monday availability toggle, currently on"
    const dayToggle = page.locator('[aria-label*="availability toggle"]').first();
    const dateCell = page.locator('[aria-label*="available"], [aria-label*="blocked"]').first();
    const calendarDay = page.locator('[aria-label*=", 20"]').first(); // matches date labels like "March 15, 2026..."

    const hasToggle = await dayToggle.isVisible().catch(() => false);
    const hasDateCell = await dateCell.isVisible().catch(() => false);
    const hasCalendarDay = await calendarDay.isVisible().catch(() => false);

    if (!hasToggle && !hasDateCell && !hasCalendarDay) {
      // Wait for page to fully render
      await page.waitForTimeout(3000);
    }

    const toggleVisible = await dayToggle.isVisible().catch(() => false);
    const dateCellVisible = await dateCell.isVisible().catch(() => false);
    const calendarDayVisible = await calendarDay.isVisible().catch(() => false);

    if (toggleVisible) {
      await dayToggle.click();
    } else if (dateCellVisible) {
      await dateCell.click();
    } else if (calendarDayVisible) {
      await calendarDay.click();
    }

    expect(toggleVisible || dateCellVisible || calendarDayVisible).toBeTruthy();
  });

  test('shows time slot or schedule settings', async ({ page }) => {
    // The view renders schedule rows with time inputs (aria-label="Monday start time" etc.)
    // and "to" separator text, plus header labels "Start" and "End", and "Weekly Schedule" title
    const weeklySchedule = page.getByText(/weekly schedule|select service/i).first();
    const timeInput = page.locator('[aria-label*="start time"], [aria-label*="end time"]').first();
    const toSeparator = page.getByText('to', { exact: true }).first();
    const startEndHeader = page.getByText(/start|end/i).first();

    // Wait for schedule section to appear
    await expect(weeklySchedule.or(timeInput).or(toSeparator).or(startEndHeader))
      .toBeVisible({ timeout: 15_000 });
  });
});
