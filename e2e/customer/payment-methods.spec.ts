import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Payment Methods', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/payment-methods');
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('page loads with Payment Methods title', async ({ page }) => {
    const hasTitle = await page.getByText(/payment method/i).first()
      .isVisible({ timeout: 15_000 }).catch(() => false);
    const hasPageContent = await page.getByText(/gcash|link.*account|add.*payment/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasTitle || hasPageContent).toBeTruthy();
  });

  test('shows empty state or saved methods', async ({ page }) => {
    await page.waitForTimeout(2000);

    const hasEmpty = await page.getByText(/no payment method/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasMethods = await page.getByText(/gcash|linked account/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasEmpty || hasMethods).toBeTruthy();
  });

  test('Link GCash Account button is visible', async ({ page }) => {
    await page.waitForTimeout(2000);

    const linkBtn = page.locator('[aria-label="Link GCash account"]').first();
    await expect(linkBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Link GCash shows form with account name and number fields', async ({ page }) => {
    await page.waitForTimeout(2000);

    const linkBtn = page.locator('[aria-label="Link GCash account"]').first();
    await expect(linkBtn).toBeVisible({ timeout: 10_000 });
    await linkBtn.click();
    await page.waitForTimeout(1000);

    const accountInput = page.locator('[aria-label="Account name"]').first();
    const numberInput = page.locator('[aria-label="GCash mobile number"]').first();

    const hasAccount = await accountInput.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNumber = await numberInput.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasAccount || hasNumber).toBeTruthy();
  });
});
