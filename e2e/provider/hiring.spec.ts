import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Hiring (P7)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/hiring');
    await page.waitForLoadState('networkidle');
  });

  test('hiring page loads', async ({ page }) => {
    await expect(
      page.getByText(/hiring|job/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows job postings or empty state', async ({ page }) => {
    const hasJobPostings = await page
      .getByText(/job.*posting|posted/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no job postings/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasJobPostings || hasEmptyState).toBeTruthy();
  });

  test('has Post Job button', async ({ page }) => {
    await expect(
      page.locator('[aria-label="Post new job"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows tabs for postings and applications', async ({ page }) => {
    await expect(
      page.locator('[aria-label="Job postings tab"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="Applications tab"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
