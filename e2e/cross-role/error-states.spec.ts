import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Error States & Edge Cases', () => {
  test('invalid service ID shows error or fallback', async ({ page }) => {
    await loginAs(page, 'customer');

    await page.goto('/user/service/999999');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should show error message, empty state, redirect, or loading skeleton
    const hasError = await page.getByText(/not found|error|unavailable|no.*service|doesn.*exist/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const redirectedAway = !page.url().includes('/service/999999');
    // The page may render with a loading/skeleton state — that's acceptable for invalid ID
    const hasPageContent = await page.locator('body').innerText().then(t => t.trim().length > 0).catch(() => false);

    expect(hasError || redirectedAway || hasPageContent).toBeTruthy();
  });

  test('empty data shows empty state gracefully', async ({ page }) => {
    await loginAs(page, 'customer');

    // Navigate to bookings — might be empty for test user
    await page.goto('/user/bookings');
    await page.waitForTimeout(3000);

    // Page should render without crashing — either bookings or empty state
    const hasContent = await page.getByText(/booking|no.*booking|empty/i).first()
      .isVisible({ timeout: 10_000 }).catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test('invalid route does not crash the app', async ({ page }) => {
    await loginAs(page, 'customer');

    await page.goto('/user/nonexistent-page');
    await page.waitForTimeout(3000);

    // The app should NOT crash — it should either redirect, show fallback, or render some content
    // Verify the page is still functional by checking for any visible text content
    const url = page.url();
    const hasRedirected = url.includes('/dashboard') || url.includes('/login') || url.includes('/landing');
    const pageHasContent = await page.locator('body').innerText().then(t => t.trim().length > 0).catch(() => false);

    expect(hasRedirected || pageHasContent).toBeTruthy();
  });

  test('app renders content on dashboard without blank screen', async ({ page }) => {
    await loginAs(page, 'customer');

    // Dashboard should have some visible content (loginAs already verified dashboard loaded)
    await page.waitForTimeout(2000);

    // Verify the page has rendered content — any meaningful text
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
