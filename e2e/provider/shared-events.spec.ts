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
    const hasEvents = await page
      .getByText(/event.*name|wedding|party|summit/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no shared events/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasEvents || hasEmptyState).toBeTruthy();
  });

  test('displays subtitle about shared events', async ({ page }) => {
    await expect(
      page.getByText(/events shared with you by clients/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
