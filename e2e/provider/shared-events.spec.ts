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
    // Wait for loading to finish
    await page.waitForTimeout(3000);

    // Check for actual event cards (event names)
    const hasEvents = await page
      .getByText(/event.*name|wedding|party|summit/i)
      .first()
      .isVisible()
      .catch(() => false);

    // Empty state text: "No shared events"
    const hasEmptyState = await page
      .getByText(/no shared events/i)
      .first()
      .isVisible()
      .catch(() => false);

    // Also accept the hint text as proof the page rendered
    const hasEmptyHint = await page
      .getByText(/when clients share their events/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasEvents || hasEmptyState || hasEmptyHint).toBeTruthy();
  });

  test('displays subtitle about shared events', async ({ page }) => {
    await expect(
      page.getByText(/events shared with you by clients/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
