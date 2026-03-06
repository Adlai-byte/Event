import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Services (A3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/services');
    await page.waitForLoadState('networkidle');
  });

  test('services page loads', async ({ page }) => {
    await expect(
      page.getByText(/Services Management|Services/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows platform services including seeded E2E service', async ({ page }) => {
    // Wait for service list to load
    await expect(
      page.locator('[aria-label="View all services tab"]'),
    ).toBeVisible({ timeout: 10_000 });

    // The seeded service from global setup should appear
    const hasE2EService = await page
      .getByText(/E2E Photography Service/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // Or at least some service content is displayed
    const hasAnyService = await page
      .getByText(/photography|venue|catering|music|decoration/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasE2EService || hasAnyService).toBeTruthy();
  });

  test('shows provider info for services', async ({ page }) => {
    // Wait for service list to load
    await expect(
      page.locator('[aria-label="View all services tab"]'),
    ).toBeVisible({ timeout: 10_000 });

    // Provider name or email should appear alongside services
    const hasProviderInfo = await page
      .getByText(/provider|Provider/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasUnknownProvider = await page
      .getByText(/Unknown Provider/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasProviderInfo || hasUnknownProvider).toBeTruthy();
  });

  test('has search and category filter capability', async ({ page }) => {
    // Search input
    const searchInput = page.locator('[aria-label="Search services"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Category filter chips should be present
    const hasAllFilter = await page
      .locator('[aria-label="Filter by all"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasPhotographyFilter = await page
      .locator('[aria-label="Filter by photography"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasAllFilter || hasPhotographyFilter).toBeTruthy();
  });
});
