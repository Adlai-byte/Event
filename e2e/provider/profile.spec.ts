import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Profile (P11)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile page loads', async ({ page }) => {
    await expect(
      page.getByText(/profile/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows provider email', async ({ page }) => {
    await expect(
      page.getByText('e2e-provider@test-event.com').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows provider name "Test"', async ({ page }) => {
    await expect(
      page.getByText('Test').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to payment setup', async ({ page }) => {
    const paymentLink = page.getByText(/payment setup/i).first();
    const hasPaymentLink = await paymentLink
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasPaymentLink) {
      await paymentLink.click();
      await page.waitForTimeout(1500);

      // Should navigate to payment-setup page
      const url = page.url();
      const hasNavigated = url.includes('payment-setup') || url.includes('payment');

      const hasPaymentContent = await page
        .getByText(/paymongo|payment.*link|payout/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasNavigated || hasPaymentContent).toBeTruthy();
    } else {
      // Payment setup might be rendered differently — look for alternative
      const paymentSetupBtn = page.locator('[aria-label*="payment" i], [aria-label*="Payment" i]').first();
      const hasBtnAlt = await paymentSetupBtn
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasBtnAlt).toBeTruthy();
    }
  });
});
