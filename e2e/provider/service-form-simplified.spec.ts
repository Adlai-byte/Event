import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Simplified Service Creation Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/services');
    await page.waitForLoadState('networkidle');

    // Click "Add Service" to open the form
    const addBtn = page.locator('[aria-label="Add service"]').first();
    const addBtnAlt = page.getByText('Add Service', { exact: true }).first();

    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      await addBtnAlt.click();
    }
    await page.waitForTimeout(1000);
  });

  test('form shows only 3 sections: Basic Info, Photos, Cancellation Policy', async ({
    page,
  }) => {
    // Sections that SHOULD exist
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByLabel('Photos section', { exact: false }).first(),
    ).toBeVisible();

    await expect(
      page.getByLabel('Cancellation Policy section', { exact: false }).first(),
    ).toBeVisible();
  });

  test('removed sections are NOT present: Location, Pricing, Booking Rules, Details', async ({
    page,
  }) => {
    // Wait for form to be rendered
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Sections that should NOT exist
    await expect(
      page.getByLabel('Location section', { exact: false }),
    ).toHaveCount(0);

    await expect(
      page.getByLabel('Pricing section', { exact: false }),
    ).toHaveCount(0);

    await expect(
      page.getByLabel('Booking Rules section', { exact: false }),
    ).toHaveCount(0);

    await expect(
      page.getByLabel('Details section', { exact: false }),
    ).toHaveCount(0);
  });

  test('service name and category fields are present', async ({ page }) => {
    // Expand Basic Information if collapsed
    const section = page.getByLabel('Basic Information section', { exact: false }).first();
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Service Name input
    const nameInput = page.locator('input[placeholder="Enter service name"]').first();
    await expect(nameInput).toBeVisible();

    // Category options (at least one should be visible)
    await expect(page.getByText('Venue', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Catering', { exact: true }).first()).toBeVisible();
  });

  test('no map or location fields rendered', async ({ page }) => {
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Map container should not exist
    await expect(page.locator('#map-container')).toHaveCount(0);

    // Travel radius input should not exist
    await expect(
      page.locator('[aria-label="Travel radius in kilometers"]'),
    ).toHaveCount(0);

    // "Location will appear here" placeholder should not exist
    await expect(
      page.getByText('Location will appear here after pinning'),
    ).toHaveCount(0);
  });

  test('no pricing fields rendered', async ({ page }) => {
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Hourly/daily price inputs should not exist
    await expect(
      page.locator('input[placeholder="Enter hourly price"]'),
    ).toHaveCount(0);

    await expect(
      page.locator('input[placeholder="Enter per day price"]'),
    ).toHaveCount(0);

    await expect(
      page.locator('input[placeholder="Enter price per person"]'),
    ).toHaveCount(0);
  });

  test('no booking rules fields rendered', async ({ page }) => {
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[aria-label="Minimum booking hours"]'),
    ).toHaveCount(0);

    await expect(
      page.locator('[aria-label="Maximum booking hours"]'),
    ).toHaveCount(0);

    await expect(
      page.locator('[aria-label="Max capacity"]'),
    ).toHaveCount(0);
  });

  test('publish and draft buttons are visible', async ({ page }) => {
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Publish Service', { exact: true })).toBeVisible();
    await expect(page.getByText('Save Draft', { exact: true })).toBeVisible();
  });

  test('validation requires name and category only', async ({ page }) => {
    await expect(
      page.getByLabel('Basic Information section', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Try to publish with empty form
    await page.getByText('Publish Service', { exact: true }).click();
    await page.waitForTimeout(500);

    // Should show validation error about name and category
    await expect(
      page.getByText(/required fields/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
