import { test, expect } from '@playwright/test';
import { LANDING_CONTENT, LANDING_CATEGORY_LABELS } from '../fixtures/test-data';
import { goToLanding } from '../helpers/navigation';

// Landing page tests run only on desktop (full content visible)
test.describe('Landing Page — sections & content', () => {
  test.beforeEach(async ({ page }) => {
    await goToLanding(page);
  });

  test('displays E-VENT logo in header', async ({ page }) => {
    const logo = page.locator('text=E-VENT').first();
    await expect(logo).toBeVisible();
  });

  test('displays top bar with "Plan your perfect event" text', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.topBarText)).toBeVisible();
  });

  test('displays Account link in top bar', async ({ page }) => {
    // The top bar renders an "Account" link that triggers the login flow
    await expect(page.getByText('Account').first()).toBeVisible({ timeout: 15_000 });
  });

  test('displays search bar with placeholder', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search events, services..."]');
    await expect(searchInput).toBeVisible();
  });

  test('renders hero section', async ({ page }) => {
    // The hero section contains service showcase content
    // Wait for loading to finish — the loading spinner should disappear
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Loading"]'),
      { timeout: 15_000 },
    ).catch(() => {
      // Loading may have already finished
    });
    // After loading, main content area should be present
    const mainContent = page.locator('text=All Services');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });
  });

  test('shows All Services section with 6 category cards', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.allServicesTitle).first()).toBeVisible({ timeout: 15_000 });
    for (const label of LANDING_CATEGORY_LABELS) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('displays Featured Services section', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.featuredServicesTitle).nth(1)).toBeVisible({ timeout: 15_000 });
  });

  test('shows About E-VENT section with 3 feature cards', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.aboutTitle)).toBeVisible({ timeout: 15_000 });
    for (const feature of LANDING_CONTENT.aboutFeatures) {
      await expect(page.getByText(feature)).toBeVisible();
    }
  });

  test('displays Contact Us section with email, phone, address', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.contactTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(LANDING_CONTENT.contactEmail)).toBeVisible();
    await expect(page.getByText(LANDING_CONTENT.contactPhone)).toBeVisible();
    await expect(page.getByText(LANDING_CONTENT.contactAddress)).toBeVisible();
  });

  test('displays footer with column headings', async ({ page }) => {
    for (const column of LANDING_CONTENT.footerColumns) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('shows CTA section with "Ready to Plan Your Event?" and two buttons', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.ctaTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-label="Get started with registration"]')).toBeVisible();
    await expect(page.locator('[aria-label="Login to your account"]')).toBeVisible();
  });

  test('footer displays copyright text', async ({ page }) => {
    await expect(page.getByText(LANDING_CONTENT.copyright)).toBeVisible({ timeout: 15_000 });
  });
});
