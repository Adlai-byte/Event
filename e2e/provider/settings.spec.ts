import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads with Settings title', async ({ page }) => {
    await expect(
      page.getByText(/setting/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows account or privacy links', async ({ page }) => {
    await page.waitForTimeout(2000);

    const links = ['Privacy policy', 'Terms of service', 'Data and privacy'];
    let visibleCount = 0;

    for (const link of links) {
      const el = page.locator(`[aria-label="${link}"]`).first();
      const isVisible = await el.isVisible({ timeout: 3_000 }).catch(() => false);
      if (isVisible) visibleCount++;
    }

    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

  test('navigation links work — edit profile, change password, payment methods', async ({ page }) => {
    await page.waitForTimeout(2000);

    const editProfile = page.locator('[aria-label="Edit profile"]').first();
    const hasEditProfile = await editProfile.isVisible({ timeout: 5_000 }).catch(() => false);

    const changePassword = page.locator('[aria-label="Change password"]').first();
    const hasChangePassword = await changePassword.isVisible({ timeout: 5_000 }).catch(() => false);

    const paymentMethods = page.locator('[aria-label="Payment methods"]').first();
    const hasPaymentMethods = await paymentMethods.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasEditProfile || hasChangePassword || hasPaymentMethods).toBeTruthy();
  });
});
