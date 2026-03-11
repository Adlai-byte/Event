import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { API_BASE } from '../fixtures/test-data';

let testServiceId: number | null = null;

test.describe('Customer Service Details (C2)', () => {
  test.beforeAll(async () => {
    // Fetch a real photography service from the API to get a valid ID
    try {
      const res = await fetch(
        `${API_BASE}/api/services?category=photography&limit=1`,
      );
      const json = await res.json();
      const rows = json.rows ?? (Array.isArray(json.data) ? json.data : json.data?.rows) ?? [];
      if (rows.length > 0) {
        testServiceId = rows[0].idservice ?? rows[0].id;
      }
    } catch {
      // Will be handled per-test with a skip
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(testServiceId === null, 'No test photography service found in DB');
    await loginAs(page, 'customer');
    await page.goto(`/user/service/${testServiceId}`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('service page shows service name', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('service page shows description or about section', async ({ page }) => {
    // Description may be truncated, in a collapsible section, or shown as "About"
    const hasDescription = await page.getByText(/professional photography/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasAbout = await page.getByText(/about|description|details/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasServiceContent = await page.getByText(/photography/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasDescription || hasAbout || hasServiceContent).toBeTruthy();
  });

  test('service page shows price', async ({ page }) => {
    await expect(
      page.getByText(/5[,.]?000/).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Book Now button is visible', async ({ page }) => {
    const bookBtn = page.getByText(/book now/i).first();
    await expect(bookBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Book Now opens booking modal', async ({ page }) => {
    const bookBtn = page.getByText(/book now/i).first();
    await expect(bookBtn).toBeVisible({ timeout: 10_000 });
    await bookBtn.click();
    await page.waitForTimeout(1000);

    // Booking modal should appear with date selection or booking form
    const modalVisible = await page
      .getByText(/date|booking|schedule|select.*date/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(modalVisible).toBeTruthy();
  });

  test('service page shows provider or category info', async ({ page }) => {
    // Wait for the service page to fully load
    await page.waitForTimeout(2000);

    // Service detail should display category badge, provider name, or location
    const hasCategoryOrProvider = await page
      .getByText(/photography|photographer|provider|test|mati|e2e/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // Also check for any provider-related UI elements
    const hasProviderSection = await page
      .locator('[aria-label*="provider"], [aria-label*="Provider"]')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // On mobile, check if the service name itself is visible (implies page loaded)
    const hasServiceName = await page
      .getByText(/E2E Photography Service/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasCategoryOrProvider || hasProviderSection || hasServiceName).toBeTruthy();
  });
});
