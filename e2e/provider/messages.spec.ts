import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Messages (P8)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/messages');
    await page.waitForLoadState('networkidle');
  });

  test('messages page loads', async ({ page }) => {
    await expect(
      page.getByText(/messages/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows conversation list or empty state', async ({ page }) => {
    const hasConversations = await page
      .locator('[aria-label*="Conversation with"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no conversations yet/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasConversations || hasEmptyState).toBeTruthy();
  });

  test('message input available when conversation selected', async ({ page }) => {
    const firstConversation = page.locator('[aria-label*="Conversation with"]').first();
    const hasConversation = await firstConversation
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasConversation) {
      await firstConversation.click();
      await page.waitForTimeout(1000);

      await expect(
        page.locator('[aria-label="Message input"]').first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // No conversations — empty state is acceptable
      const hasEmpty = await page
        .getByText(/no conversations/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasEmpty).toBeTruthy();
    }
  });

  test('send button available when conversation selected', async ({ page }) => {
    const firstConversation = page.locator('[aria-label*="Conversation with"]').first();
    const hasConversation = await firstConversation
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasConversation) {
      await firstConversation.click();
      await page.waitForTimeout(1000);

      await expect(
        page.locator('[aria-label="Send message"]').first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      const hasEmpty = await page
        .getByText(/no conversations/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasEmpty).toBeTruthy();
    }
  });
});
