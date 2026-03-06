import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Proposals (P6)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/proposals');
    await page.waitForLoadState('networkidle');
  });

  test('proposals page loads', async ({ page }) => {
    await expect(
      page.getByText(/proposals/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows proposals list or empty state', async ({ page }) => {
    const hasProposals = await page
      .locator('[aria-label*="Withdraw proposal"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no.*proposal|no.*request/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // Page loaded — either proposals or empty state
    expect(hasProposals || hasEmptyState).toBeTruthy();
  });

  test('has tabs — My Proposals and Available Requests', async ({ page }) => {
    await expect(
      page.locator('[aria-label="My proposals tab"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="Available requests tab"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate between tabs', async ({ page }) => {
    // Click Available Requests tab
    await page.locator('[aria-label="Available requests tab"]').first().click();
    await page.waitForTimeout(1000);

    // Should show available requests content or empty state
    const hasRequests = await page
      .locator('[aria-label*="Submit proposal"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no.*request|no.*available/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasSearchBar = await page
      .locator('[aria-label="Search hiring requests"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasRequests || hasEmptyState || hasSearchBar).toBeTruthy();

    // Switch back to My Proposals
    await page.locator('[aria-label="My proposals tab"]').first().click();
    await page.waitForTimeout(1000);

    const hasMyProposals = await page
      .locator('[aria-label="Search proposals"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasMyProposalsEmpty = await page
      .getByText(/no.*proposal/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasMyProposals || hasMyProposalsEmpty).toBeTruthy();
  });
});
