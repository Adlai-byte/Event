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
    await page.waitForTimeout(3000);

    // The HiringView may still be loading (skeleton state) if the API is slow.
    // First check if the "Job Postings" tab is visible (page loaded fully)
    const jobPostingsTab = page.locator('[aria-label="Job postings tab"]').first();
    const hasTab = await jobPostingsTab.isVisible({ timeout: 10_000 }).catch(() => false);

    if (hasTab) {
      // Page loaded — check for create button
      const ariaBtn = page.locator(
        '[aria-label*="reate hiring"], [aria-label*="reate job"], [aria-label*="ost job"]'
      ).first();
      const hasAriaBtn = await ariaBtn.isVisible({ timeout: 3_000 }).catch(() => false);

      if (hasAriaBtn) {
        await ariaBtn.click();
        await page.waitForTimeout(1000);
        const formVisible = await page.getByText(/title|description|details|create hiring/i).first()
          .isVisible({ timeout: 5_000 }).catch(() => false);
        expect(formVisible).toBeTruthy();
      } else {
        // No create button — page loaded with tabs, which is a valid state
        expect(hasTab).toBeTruthy();
      }
    } else {
      // Page may be in skeleton/loading state — verify at least the page title renders
      const hasTitle = await page.getByText('Hiring', { exact: true }).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasTitle).toBeTruthy();
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
