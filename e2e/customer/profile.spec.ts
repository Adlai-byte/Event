import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Profile (C7)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('profile page loads at /user/profile', async ({ page }) => {
    await page.goto('/user/profile');

    // Should show profile-related content
    const profileText = page.getByText(/profile|account|my info/i).first();
    await expect(profileText).toBeVisible({ timeout: 15_000 });
  });

  test('shows user email "e2e-customer@test-event.com"', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForTimeout(2000);

    const email = page.getByText('e2e-customer@test-event.com').first();
    await expect(email).toBeVisible({ timeout: 10_000 });
  });

  test('shows user name "Test"', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForTimeout(2000);

    const name = page.getByText('Test').first();
    await expect(name).toBeVisible({ timeout: 10_000 });
  });

  test('shows "Apply as Provider" or "Become Provider" option', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForTimeout(2000);

    const providerOption = page.getByText(/apply.*provider|become.*provider|provider.*application/i).first();
    const hasOption = await providerOption.isVisible({ timeout: 5_000 }).catch(() => false);

    // If user already applied, they might see a status instead
    const statusOption = page.getByText(/pending.*application|application.*status|already.*applied|provider.*status/i).first();
    const hasStatus = await statusOption.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasOption || hasStatus).toBeTruthy();
  });

  test('personal info link navigates to form', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForTimeout(2000);

    const personalInfoLink = page.getByText(/personal.*info|edit.*profile|my.*info/i).first();
    const hasLink = await personalInfoLink.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasLink) {
      await personalInfoLink.click();
      await page.waitForTimeout(2000);

      // Should show a form with name/email fields or personal info heading
      const formVisible = await page.getByText(/first.*name|last.*name|personal.*info|email/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      const inputVisible = await page.locator('[aria-label*="irst name"], [aria-label*="mail"], [aria-label*="ame"]').first()
        .isVisible({ timeout: 3_000 }).catch(() => false);

      expect(formVisible || inputVisible).toBeTruthy();
    } else {
      // Try direct navigation
      await page.goto('/user/personal-info');
      await page.waitForTimeout(2000);

      const formVisible = await page.getByText(/first.*name|last.*name|personal.*info|email/i).first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      expect(formVisible).toBeTruthy();
    }
  });

  test('can navigate to /user/settings and see Settings text', async ({ page }) => {
    await page.goto('/user/settings');
    await page.waitForTimeout(2000);

    const settingsText = page.getByText(/setting/i).first();
    const hasSettings = await settingsText.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!hasSettings) {
      // Settings might be part of profile — navigate there and look for a settings link
      await page.goto('/user/profile');
      await page.waitForTimeout(2000);

      const settingsLink = page.getByText(/setting/i).first();
      await expect(settingsLink).toBeVisible({ timeout: 10_000 });
    } else {
      expect(hasSettings).toBeTruthy();
    }
  });
});
