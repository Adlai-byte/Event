import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Cancellation Policies (P5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/cancellation-policies');
    await page.waitForLoadState('networkidle');
  });

  test('policies page loads', async ({ page }) => {
    await expect(
      page.getByText(/polic/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows policy list or empty state', async ({ page }) => {
    const hasPolicyList = await page
      .getByText(/edit|delete|deposit|refund/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no policies yet/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasPolicyList || hasEmptyState).toBeTruthy();
  });

  test('has create policy button', async ({ page }) => {
    await expect(
      page.locator('[aria-label="Create new cancellation policy"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking create opens policy form', async ({ page }) => {
    await page.locator('[aria-label="Create new cancellation policy"]').first().click();
    await page.waitForTimeout(1000);

    // Form should appear with policy name input
    await expect(
      page.locator('[aria-label="Policy name"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="Deposit percentage"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
