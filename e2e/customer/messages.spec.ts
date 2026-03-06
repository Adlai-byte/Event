import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Messages (C5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/messages');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with messaging content', async ({ page }) => {
    // Should see "Messages" title or conversation-related text
    await expect(
      page.getByText(/message|conversation/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows conversation list or empty state', async ({ page }) => {
    // Either conversations are listed or empty state shows
    const hasConversations = await page
      .locator('[aria-label*="Conversation with"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no conversation/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasConversations || hasEmptyState).toBeTruthy();
  });

  test('clicking a conversation opens thread with message input', async ({ page }) => {
    const conversationItem = page
      .locator('[aria-label*="Conversation with"]')
      .first();

    const hasConversation = await conversationItem
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasConversation) {
      await conversationItem.click();
      await page.waitForTimeout(1500);

      // Message input should be visible
      const messageInput = page.locator('[aria-label="Message input"]').first();
      await expect(messageInput).toBeVisible({ timeout: 5_000 });
    } else {
      // No conversations — verify empty state is shown
      await expect(
        page.getByText(/no conversation/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('send button is visible when conversation is open', async ({ page }) => {
    const conversationItem = page
      .locator('[aria-label*="Conversation with"]')
      .first();

    const hasConversation = await conversationItem
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasConversation) {
      await conversationItem.click();
      await page.waitForTimeout(1500);

      // Send button should be visible
      const sendButton = page.locator('[aria-label="Send message"]').first();
      await expect(sendButton).toBeVisible({ timeout: 5_000 });
    } else {
      // No conversations available — test passes with empty state
      await expect(
        page.getByText(/no conversation/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});
