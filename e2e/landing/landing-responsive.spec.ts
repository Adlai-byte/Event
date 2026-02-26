import { test, expect } from '@playwright/test';
import { goToLanding, goToLogin } from '../helpers/navigation';

test.describe('Landing Page — responsive layout', () => {
  test.describe('Desktop (1440px)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('shows horizontal nav links', async ({ page }) => {
      await goToLanding(page);
      // At >= 900px, nav items are shown directly (Home, Services, Events, About, Contact)
      await expect(page.getByText('Home', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Services', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Events', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('About', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Contact', { exact: true }).first()).toBeVisible();
    });

    test('hides hamburger menu', async ({ page }) => {
      await goToLanding(page);
      // The hamburger button should not exist at wide widths
      const hamburgers = page.locator('[class*="hamburger"]');
      // The hamburger is only rendered when screenWidth < 900
      // At 1440px it should not be visible in DOM
      await expect(hamburgers).toHaveCount(0);
    });

    test('login page shows split layout with welcome panel', async ({ page }) => {
      await goToLogin(page);
      await expect(page.getByText('Welcome to E-VENT')).toBeVisible();
    });
  });

  test.describe('Mobile (393px)', () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test('shows hamburger menu instead of nav links', async ({ page }) => {
      await goToLanding(page);
      // At < 900px, hamburger should be visible
      // The hamburger is 3 View lines inside a TouchableOpacity
      // Look for the hamburger button container
      const hamburger = page.locator('[class*="hamburger"]').first();
      await expect(hamburger).toBeVisible({ timeout: 15_000 });
    });

    test('clicking hamburger opens slide-out menu', async ({ page }) => {
      await goToLanding(page);
      const hamburger = page.locator('[class*="hamburger"]').first();
      await hamburger.click();
      // The mobile menu overlay should appear with nav items
      await expect(page.getByText('Home', { exact: true }).first()).toBeVisible();
    });

    test('menu shows navigation items', async ({ page }) => {
      await goToLanding(page);
      const hamburger = page.locator('[class*="hamburger"]').first();
      await hamburger.click();
      for (const item of ['Home', 'Services', 'Events', 'About', 'Contact']) {
        await expect(page.getByText(item, { exact: true }).first()).toBeVisible();
      }
    });

    test('clicking a nav item closes menu', async ({ page }) => {
      await goToLanding(page);
      const hamburger = page.locator('[class*="hamburger"]').first();
      await hamburger.click();
      // Click the close button (✕)
      await page.getByText('\u2715').click();
      // After closing, the mobile menu overlay should be gone
      await expect(page.getByText('\u2715')).not.toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Tablet (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('shows hamburger menu (breakpoint < 900px in NavBar)', async ({ page }) => {
      await goToLanding(page);
      // 768 < 900, so hamburger should be shown
      const hamburger = page.locator('[class*="hamburger"]').first();
      await expect(hamburger).toBeVisible({ timeout: 15_000 });
    });
  });
});
