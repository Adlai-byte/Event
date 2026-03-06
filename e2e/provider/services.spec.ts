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

  test('shows seeded "E2E Photography Service"', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first(),
    ).toBeVisible({ timeout: 10_000 });
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

  test('shows photography category badge or label', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Photography category should appear somewhere near the service
    const hasCategoryBadge = await page
      .getByText(/photography/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasCategoryBadge).toBeTruthy();
  });
});
