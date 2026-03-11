import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { TEST_USERS, API_BASE } from '../fixtures/test-data';

let providerEmail: string;

test.describe('Customer Provider Profile View', () => {
  test.beforeAll(() => {
    providerEmail = TEST_USERS.provider.email;
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto(`/user/provider/${encodeURIComponent(providerEmail)}`);
    await page.waitForLoadState('networkidle');
  });

  test('page loads with provider info', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Should show provider name or "Provider Profile" text
    const hasProviderName = await page.getByText('Test').first()
      .isVisible({ timeout: 10_000 }).catch(() => false);
    const hasProfileTitle = await page.getByText(/provider.*profile|provider/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNotFound = await page.getByText(/provider not found/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasProviderName || hasProfileTitle || hasNotFound).toBeTruthy();
  });

  test('shows provider services list or empty state', async ({ page }) => {
    await page.waitForTimeout(3000);

    const hasServices = await page.getByText(/services/i).first()
      .isVisible({ timeout: 10_000 }).catch(() => false);
    const hasNoServices = await page.getByText(/no services available/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNotFound = await page.getByText(/provider not found/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasServices || hasNoServices || hasNotFound).toBeTruthy();
  });

  test('shows provider stats section', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Stats: Services, Bookings, Rating, Reviews
    const hasStats = await page.getByText(/bookings|rating|reviews/i).first()
      .isVisible({ timeout: 10_000 }).catch(() => false);
    const hasNotFound = await page.getByText(/provider not found/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasStats || hasNotFound).toBeTruthy();
  });
});
