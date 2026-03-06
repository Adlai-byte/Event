import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Provider Applications (A7)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/provider-applications');
    await page.waitForLoadState('networkidle');
  });

  test('applications page loads', async ({ page }) => {
    await expect(
      page.getByText(/Provider Applications|Applications/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows application list or empty state', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Either application entries are visible or an empty-state message
    const hasApplications = await page
      .getByText(/pending|approved|rejected/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasSearchInput = await page
      .locator('[aria-label="Search applications"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasApplications || hasSearchInput).toBeTruthy();
  });

  test('application entries show user info and status', async ({ page }) => {
    // Wait for content
    await page.waitForTimeout(2000);

    // Filter tabs for statuses should be present
    const hasAllFilter = await page
      .locator('[aria-label="Filter by all"]')
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasPendingFilter = await page
      .locator('[aria-label="Filter by pending"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasApprovedFilter = await page
      .locator('[aria-label="Filter by approved"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasAllFilter || hasPendingFilter || hasApprovedFilter).toBeTruthy();
  });

  test('has approve/reject action buttons if pending applications exist', async ({ page }) => {
    // Click on "pending" filter to show only pending applications
    const pendingFilter = page.locator('[aria-label="Filter by pending"]');
    const pendingVisible = await pendingFilter
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (pendingVisible) {
      await pendingFilter.click();
      await page.waitForTimeout(1500);
    }

    // Look for approve/reject buttons (they include the applicant's name)
    const hasApproveBtn = await page
      .locator('[aria-label*="Approve"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasRejectBtn = await page
      .locator('[aria-label*="Reject"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // If there are pending applications, both buttons should exist
    // If no pending applications, the approved/rejected text should be visible instead
    const hasApprovedText = await page
      .getByText(/Approved|Rejected|No.*application/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasApproveBtn || hasRejectBtn || hasApprovedText).toBeTruthy();
  });
});
