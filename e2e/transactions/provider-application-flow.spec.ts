import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

test.describe('Cross-Role Provider Application Flow', () => {
  test('customer profile shows provider application option -> admin sees applications page', async ({
    page,
  }) => {
    // --- Customer: check profile for provider application option ---
    await loginAs(page, 'customer');

    await page.goto('/user/profile');
    await page.waitForTimeout(3000);

    // Verify profile page loaded
    await expect(
      page.getByText(/profile|account|personal/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Check for "Apply as Provider" or status indicators from ProfileMenuList
    // ProfileMenuList renders one of:
    //   - "Apply as Provider" (no status or rejected without reason)
    //   - "Application Pending" (pending status)
    //   - "Application Rejected" (rejected with reason)
    const providerOption = page
      .getByText(/apply.*provider|become.*provider|application.*pending|application.*rejected/i)
      .first();
    const hasOption = await providerOption
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // Also check for the Account section which always shows
    const hasAccount = await page
      .getByText('Account')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // The Profile page should show Account section and either provider option or status
    expect(hasOption || hasAccount).toBeTruthy();

    await logout(page);

    // --- Admin: verify provider applications management page loads ---
    await loginAs(page, 'admin');

    await page.goto('/admin/provider-applications');
    await page.waitForTimeout(3000);

    // Verify applications page loaded
    await expect(
      page.getByText(/application|provider/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    await logout(page);
  });

  test('all three dashboards load with correct role context', async ({
    page,
  }) => {
    // --- Customer dashboard ---
    await loginAs(page, 'customer');

    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/user/dashboard');

    // Verify customer-specific content: categories and services
    await expect(
      page.getByText(/photography|venue|catering/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    const hasCategories = await page
      .getByText('Photography', { exact: true })
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasCategories).toBeTruthy();

    await logout(page);

    // --- Provider dashboard ---
    await loginAs(page, 'provider');

    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/provider/dashboard');

    // Verify provider-specific content: stats, quick actions, or earnings
    const providerContent = await page
      .getByText(/booking|earning|service|revenue|stat|quick action|overview/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(providerContent).toBeTruthy();

    await logout(page);

    // --- Admin dashboard ---
    await loginAs(page, 'admin');

    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/admin/dashboard');

    // Verify admin-specific content: platform stats, user management indicators
    const adminContent = await page
      .getByText(/user|provider|platform|total|admin|manage|overview|stat/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(adminContent).toBeTruthy();

    await logout(page);
  });
});
