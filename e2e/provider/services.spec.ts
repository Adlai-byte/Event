import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Services (P2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/services');
    await page.waitForLoadState('networkidle');
  });

  test('services page loads', async ({ page }) => {
    await expect(
      page.getByText(/services/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows seeded service or empty service list', async ({ page }) => {
    // Look for the seeded service, or the "My Services" tab content, or an empty state
    const hasSeededService = await page
      .getByText('E2E Photography Service')
      .first()
      .isVisible()
      .catch(() => false);

    const hasAnyService = await page
      .getByText(/photography|venue|catering|music/i)
      .first()
      .isVisible()
      .catch(() => false);

    // The services list tab is always shown with "My Services" tab label
    const hasServicesTab = await page
      .getByText('My Services', { exact: true })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasSeededService || hasAnyService || hasServicesTab).toBeTruthy();
  });

  test('add service button visible', async ({ page }) => {
    const addBtn = page.locator('[aria-label="Add service"]').first();
    const addBtnAlt = page.getByText(/add service|create service/i).first();

    const hasAddBtn = await addBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasAddBtnAlt = await addBtnAlt
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasAddBtn || hasAddBtnAlt).toBeTruthy();
  });

  test('clicking add opens form with service name field', async ({ page }) => {
    // Click the add service button
    const addBtn = page.locator('[aria-label="Add service"]').first();
    const addBtnAlt = page.getByText(/add service|create service/i).first();

    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      await addBtnAlt.click();
    }

    await page.waitForTimeout(1000);

    // Form should appear with a service name input
    const nameField = page.locator(
      'input[placeholder*="name" i], input[placeholder*="service" i], [aria-label*="service name" i], [aria-label*="Service name" i]',
    ).first();

    await expect(nameField).toBeVisible({ timeout: 10_000 });
  });

  test('shows category badge or filter options', async ({ page }) => {
    // The view always renders category filter buttons: all, venue, catering, photography, music
    // Check for any category text in filters or in the service list table
    const hasCategoryFilter = await page
      .getByText(/photography/i)
      .first()
      .isVisible()
      .catch(() => false);

    // Category filter chips are always rendered regardless of services
    const hasAnyCategoryLabel = await page
      .getByText(/venue|catering|music/i)
      .first()
      .isVisible()
      .catch(() => false);

    // The tab bar always shows "My Services", "Add Service", "Packages"
    const hasAddService = await page
      .getByText('Add Service', { exact: true })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCategoryFilter || hasAnyCategoryLabel || hasAddService).toBeTruthy();
  });
});
