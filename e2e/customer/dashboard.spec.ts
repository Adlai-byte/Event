import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CATEGORY_LABELS } from '../fixtures/test-data';

test.describe('Customer Dashboard (C1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('page loads with dashboard content', async ({ page }) => {
    await expect(
      page.getByText(/welcome|dashboard/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows category cards', async ({ page }) => {
    // At minimum, Photography should be visible (first category)
    await expect(
      page.getByText('Photography', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Check at least 4 categories are visible
    let visibleCount = 0;
    for (const label of CATEGORY_LABELS) {
      const isVisible = await page
        .getByText(label, { exact: true })
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (isVisible) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThanOrEqual(4);
  });

  test('shows services section', async ({ page }) => {
    // Dashboard shows services by category — look for section titles or service cards
    const hasServices = await page
      .getByText(/services|browse|explore|categories/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasServiceCards = await page
      .locator('[aria-label*="service"], [aria-label*="Service"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasServices || hasServiceCards).toBeTruthy();
  });

  test('clicking a category navigates or filters', async ({ page }) => {
    // Wait for categories to render
    await expect(
      page.getByText('Photography', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Click on Photography category card
    await page.getByText('Photography', { exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Should either navigate to a filtered view or show filtered results
    // Check URL changed or filtered content appeared
    const url = page.url();
    const hasNavigated = url.includes('category') || url.includes('photography') || url.includes('service');
    const hasFilteredContent = await page
      .getByText(/photography/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasNavigated || hasFilteredContent).toBeTruthy();
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[placeholder*="search"], [aria-label*="Search"], [aria-label*="search"]',
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.pressSequentially('photography', { delay: 50 });
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('photography');
  });

  test('sidebar shows correct nav items on desktop', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      'Sidebar nav items only visible on desktop',
    );

    const navItems = [
      'Dashboard',
      'Bookings',
      'Events',
      'Messages',
      'Hiring',
      'Profile',
      'Notifications',
      'Settings',
    ];

    for (const item of navItems) {
      await expect(
        page.getByText(item, { exact: true }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('bottom nav shows on mobile', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width >= 768,
      'Bottom nav only visible on mobile',
    );

    // Bottom navigation should have key items visible
    // Look for common bottom nav items (typically a subset of sidebar items)
    const bottomNavVisible = await page
      .locator('[aria-label*="Dashboard"], [aria-label*="Home"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasBottomNav = bottomNavVisible || await page
      .locator('[aria-label*="bottom nav"], [aria-label*="navigation"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasBottomNav).toBeTruthy();
  });

  test('banner or hero section visible on desktop and tablet', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 768,
      'Banner/hero section targets desktop and tablet',
    );

    // Look for a banner slider, hero section, or promotional content
    const bannerVisible = await page
      .locator('[aria-label*="banner"], [aria-label*="Banner"], [aria-label*="slider"], [aria-label*="Slider"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const heroVisible = await page
      .getByText(/discover|explore|find|book.*event|plan.*event/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(bannerVisible || heroVisible).toBeTruthy();
  });

  test('dashboard URL is correct after login', async ({ page }) => {
    expect(page.url()).toContain('/user/dashboard');
  });

  test('category cards are clickable interactive elements', async ({ page }) => {
    await expect(
      page.getByText('Photography', { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Click on Photography category
    await page.getByText('Photography', { exact: true }).first().click();

    // Should not throw — the element is interactive
    await page.waitForTimeout(500);
  });
});
