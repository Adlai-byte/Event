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
      const rows = json.rows ?? json.data?.rows ?? [];
      if (rows.length > 0) {
        testServiceId = rows[0].idservice ?? rows[0].id;
      }
    } catch {
      // Will be handled per-test with a skip
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(testServiceId == null, 'No test photography service found in DB');
    await loginAs(page, 'customer');
    await page.goto(`/user/service/${testServiceId}`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('service page shows service name', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('service page shows description', async ({ page }) => {
    await expect(
      page.getByText('Professional photography for events').first(),
    ).toBeVisible({ timeout: 10_000 });
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
    // Service detail should display category badge or provider name
    const hasCategoryOrProvider = await page
      .getByText(/photography|photographer|provider/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasCategoryOrProvider).toBeTruthy();
  });
});
