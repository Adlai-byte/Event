import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Role-Based Route Protection', () => {
  test('customer cannot access /provider/dashboard', async ({ page }) => {
    await loginAs(page, 'customer');

    await page.goto('/provider/dashboard');
    await page.waitForTimeout(3000);

    // Should be redirected away from provider dashboard
    const url = page.url();
    const stayedOnProvider = url.includes('/provider/dashboard');

    if (stayedOnProvider) {
      // If URL didn't change, check that the page shows user's own dashboard or an error
      const hasProviderContent = await page.getByText(/provider.*dashboard|my services|service management/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      // Customer should NOT see provider-specific content
      expect(hasProviderContent).toBeFalsy();
    } else {
      // Successfully redirected
      expect(url).toContain('/user/');
    }
  });

  test('provider cannot access /admin/dashboard', async ({ page }) => {
    await loginAs(page, 'provider');

    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);

    const url = page.url();
    const stayedOnAdmin = url.includes('/admin/dashboard');

    if (stayedOnAdmin) {
      const hasAdminContent = await page.getByText(/admin.*panel|user.*management|platform.*analytics/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasAdminContent).toBeFalsy();
    } else {
      expect(url).toContain('/provider/');
    }
  });

  test('customer cannot access /admin/dashboard', async ({ page }) => {
    await loginAs(page, 'customer');

    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);

    const url = page.url();
    const stayedOnAdmin = url.includes('/admin/dashboard');

    if (stayedOnAdmin) {
      const hasAdminContent = await page.getByText(/admin.*panel|user.*management|platform.*analytics/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasAdminContent).toBeFalsy();
    } else {
      expect(url).toContain('/user/');
    }
  });
});
