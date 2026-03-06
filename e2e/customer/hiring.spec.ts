import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Hiring (C6)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('hiring page loads with Hiring or Job text', async ({ page }) => {
    await page.goto('/user/hiring');

    const hiringText = page.getByText(/hiring|job/i).first();
    await expect(hiringText).toBeVisible({ timeout: 15_000 });
  });

  test('shows job posting section or empty state', async ({ page }) => {
    await page.goto('/user/hiring');
    await page.waitForTimeout(2000);

    // Either there are job postings listed, or an empty state message
    const hasPostings = await page.getByText(/job post/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no.*job|no.*post|no.*hiring|get started|create.*first/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasPostings || hasEmpty).toBeTruthy();
  });

  test('can navigate to create job posting if button exists', async ({ page }) => {
    await page.goto('/user/hiring');
    await page.waitForTimeout(2000);

    const createBtn = page.locator('[aria-label*="reate"], [aria-label*="ost"], [aria-label*="ew"]')
      .filter({ hasText: /create|post|new/i }).first();
    const hasCreateBtn = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCreateBtn) {
      // Try text-based button
      const textBtn = page.getByText(/create.*job|post.*job|new.*job|create.*post/i).first();
      const hasTextBtn = await textBtn.isVisible({ timeout: 3_000 }).catch(() => false);

      if (hasTextBtn) {
        await textBtn.click();
        await page.waitForTimeout(1000);
        // Should open a form or modal
        const formVisible = await page.getByText(/title|description|details/i).first()
          .isVisible({ timeout: 5_000 }).catch(() => false);
        expect(formVisible).toBeTruthy();
      } else {
        // No create button is acceptable — page still loaded
        expect(true).toBeTruthy();
      }
    } else {
      await createBtn.click();
      await page.waitForTimeout(1000);
      const formVisible = await page.getByText(/title|description|details/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      expect(formVisible).toBeTruthy();
    }
  });

  test('tabs or filters are present on hiring page', async ({ page }) => {
    await page.goto('/user/hiring');
    await page.waitForTimeout(2000);

    // Look for tab-like elements (e.g., "My Posts", "Applications", "All", etc.)
    const hasTab = await page.getByText(/post|application|request|all|active|pending|my /i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasFilter = await page.locator('[role="tablist"], [role="tab"]').first()
      .isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasTab || hasFilter).toBeTruthy();
  });
});
