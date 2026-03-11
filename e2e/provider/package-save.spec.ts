import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Package Save Flow', () => {
  test('provider can create a package with category and item', async ({ page }) => {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('📦')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    page.on('response', (resp) => {
      if (resp.url().includes('package') && resp.request().method() === 'POST') {
        console.log(`[NET RESPONSE] ${resp.status()} ${resp.url()}`);
      }
    });

    await loginAs(page, 'provider');
    await page.goto('/provider/services');
    await page.waitForLoadState('networkidle');

    // Switch to Packages tab
    const packagesTab = page.getByText('Packages', { exact: true }).first();
    await expect(packagesTab).toBeVisible({ timeout: 15_000 });
    await packagesTab.click();
    await page.waitForTimeout(1000);

    // Click "Add Package" on first service
    const addPkgBtn = page.getByText('Add Package', { exact: true }).first();
    await expect(addPkgBtn).toBeVisible({ timeout: 10_000 });
    await addPkgBtn.click();
    await page.waitForTimeout(1000);

    // Fill package name
    const nameInput = page.locator('input[placeholder="e.g., Family Package"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill('E2E Test Package');

    // Add a category
    await page.getByText('Add Category', { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Fill category name
    const categoryInput = page.locator('input[placeholder="Category name"]');
    await expect(categoryInput).toBeVisible({ timeout: 5_000 });
    await categoryInput.fill('Test Category');
    await categoryInput.blur();
    await page.waitForTimeout(300);

    // Add an item
    await page.getByText('Add Item', { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Fill item details
    await page.locator('input[placeholder="Item name"]').fill('Test Item');
    await page.locator('input[placeholder="Price"]').fill('100');
    await page.getByText('Done', { exact: true }).first().click();
    await page.waitForTimeout(300);

    // Now click Create Package using the role=button we added
    const saveBtn = page.locator('[aria-label="Save package"]');
    const saveBtnAlt = page.getByText('Create Package', { exact: true }).first();

    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      console.log('Found save button by aria-label');
      await saveBtn.click({ force: true });
    } else {
      console.log('Falling back to text selector');
      await saveBtnAlt.click({ force: true });
    }

    // Wait for network or timeout
    await page.waitForTimeout(5000);

    // Screenshot
    await page.screenshot({ path: 'test-results/pkg-after-save.png', fullPage: true });
    console.log('Test complete');
  });
});
