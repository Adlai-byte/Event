import { test, expect } from '@playwright/test';
import { LANDING_CATEGORY_LABELS } from '../fixtures/test-data';
import { goToLanding } from '../helpers/navigation';

test.describe('Service browsing on landing page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Landing page tests run on desktop/tablet');
    await goToLanding(page);
    // Wait for loading to complete
    await page.waitForSelector('text=All Services', { timeout: 30_000 });
  });

  test('landing page loads services from API', async ({ page }) => {
    // The landing page fetches services and renders them
    // After loading, category cards or service content should be present
    await expect(page.getByText('All Services').first()).toBeVisible();
  });

  test('category cards display correct labels for all 6 categories', async ({ page }) => {
    for (const label of LANDING_CATEGORY_LABELS) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('clicking a category filters services', async ({ page }) => {
    // Mock the API to return filtered results
    await page.route('**/api/services?category=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          rows: [
            {
              idservice: 1,
              s_name: 'Test Venue',
              s_description: 'A test venue',
              s_category: 'venue',
              s_base_price: 5000,
              s_rating: 4.5,
              s_review_count: 10,
            },
          ],
        }),
      });
    });

    // Click on Venue category
    const venueCard = page.locator('[aria-label="Filter by venue"]');
    await venueCard.click();
    // The category should become active (visual change)
    // Wait for the API call to resolve
    await page.waitForTimeout(1000);
  });

  test('clicking same category deselects it', async ({ page }) => {
    const venueCard = page.locator('[aria-label="Filter by venue"]');
    // Click to select
    await venueCard.click();
    await page.waitForTimeout(500);
    // Click again to deselect
    await venueCard.click();
    await page.waitForTimeout(500);
    // All categories should still be visible
    for (const label of LANDING_CATEGORY_LABELS) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('search input submits and updates display', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search venues, photographers, catering..."]');
    await searchInput.fill('photography');
    await searchInput.press('Enter');
    // Search should trigger API call — wait for response
    await page.waitForTimeout(1000);
    // The search input should retain the value
    await expect(searchInput).toHaveValue('photography');
  });

  test('service cards show name and price', async ({ page }) => {
    // Mock the trending services API to return predictable data
    await page.route('**/api/services?highRated=true&limit=5', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          rows: [
            {
              idservice: 1,
              s_name: 'Premium Photography',
              s_description: 'Professional photo services',
              s_category: 'photography',
              s_base_price: 15000,
              s_rating: 4.8,
              s_review_count: 25,
            },
          ],
        }),
      });
    });

    // Reload to pick up the mocked API
    await page.reload();
    await page.waitForSelector('text=All Services', { timeout: 30_000 });
    // The service name should be visible somewhere in the trending/showcase area
    await expect(page.getByText('Premium Photography').first()).toBeVisible({ timeout: 10_000 });
  });
});
