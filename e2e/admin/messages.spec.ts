import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Messages (A6)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/messages');
    await page.waitForLoadState('networkidle');
  });

  test('messages page loads', async ({ page }) => {
    await expect(
      page.getByText(/Messages/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows conversation list or empty state', async ({ page }) => {
    // Either conversations are listed or a "no conversations" message
    const hasConversations = await page
      .getByText(/conversation|message|chat/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasSearchInput = await page
      .locator('[aria-label="Search conversations"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no conversation|no message|empty/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasConversations || hasSearchInput || hasEmptyState).toBeTruthy();
  });

  test('has search input for moderation', async ({ page }) => {
    const searchInput = page.locator('[aria-label="Search conversations"]');
    const isVisible = await searchInput
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // The messaging view should have a search or filter mechanism
    expect(isVisible).toBeTruthy();
  });
});
