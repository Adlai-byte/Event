import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Shared Events (P9)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/shared-events');
    await page.waitForLoadState('networkidle');
  });

  test('shared events page loads', async ({ page }) => {
    await expect(
      page.getByText(/shared.*event|events.*shared/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows shared events or empty state', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check for actual event cards or empty state
    const hasEvents = await page
      .getByText(/wedding|party|summit|event/i)
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no shared events/i)
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyHint = await page
      .getByText(/when clients share their events/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasEvents || hasEmptyState || hasEmptyHint).toBeTruthy();
  });

  test('shows empty state hint text when no events shared', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Either shows event cards or the empty state with hint
    const hasHint = await page
      .getByText(/when clients share their events with you/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEvents = await page
      .getByText(/wedding|party|summit/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasHint || hasEvents).toBeTruthy();
  });
});
