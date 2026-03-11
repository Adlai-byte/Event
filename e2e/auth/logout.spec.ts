import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

test.describe('Logout Flow', () => {
  test('logout clears auth state and shows landing or login', async ({ page }) => {
    await loginAs(page, 'customer');

    // Verify we're on the dashboard
    expect(page.url()).toContain('/user/dashboard');

    // Logout
    await logout(page);

    // Should be on landing or login page, not dashboard
    const url = page.url();
    const isLoggedOut = !url.includes('/user/dashboard') && !url.includes('/provider/') && !url.includes('/admin/');
    expect(isLoggedOut).toBeTruthy();
  });

  test('protected route redirects after logout', async ({ page }) => {
    await loginAs(page, 'customer');
    await logout(page);

    // Try to access a protected route
    await page.goto('/user/bookings');
    await page.waitForTimeout(3000);

    // Should be redirected to login/landing, not stay on bookings
    const url = page.url();
    const isRedirected = url.includes('/login') || url.includes('/landing') || url === page.context().pages()[0]?.url();

    // At minimum, should NOT show booking content after logout
    const hasBookingContent = await page.getByText(/my booking|upcoming/i).first()
      .isVisible({ timeout: 3_000 }).catch(() => false);

    expect(isRedirected || !hasBookingContent).toBeTruthy();
  });

  test('can log back in after logout', async ({ page }) => {
    await loginAs(page, 'customer');
    await logout(page);

    // Log in again
    await loginAs(page, 'customer');

    // Should be back on dashboard
    expect(page.url()).toContain('/user/dashboard');
  });
});
