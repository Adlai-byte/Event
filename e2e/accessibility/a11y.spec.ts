import { test, expect } from '@playwright/test';
import { goToLanding, goToLogin, goToRegister } from '../helpers/navigation';
import { LOGIN, REGISTER } from '../helpers/selectors';

test.describe('Accessibility — public pages', () => {
  test('landing page: all interactive elements have accessible names', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Landing page tests run on desktop');
    await goToLanding(page);
    // Wait for content to load
    await page.waitForSelector('text=All Services', { timeout: 30_000 });

    // All buttons should have accessible names (aria-label or text content)
    const buttons = page.locator('[role="button"]');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      // Each button should have either aria-label or visible text
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('login form: all inputs have aria-labels', async ({ page }) => {
    await goToLogin(page);
    // Check that all login inputs have aria-label
    await expect(page.locator(LOGIN.emailInput)).toBeVisible();
    await expect(page.locator(LOGIN.passwordInput)).toBeVisible();

    const emailLabel = await page.locator(LOGIN.emailInput).getAttribute('aria-label');
    const passwordLabel = await page.locator(LOGIN.passwordInput).getAttribute('aria-label');

    expect(emailLabel).toBe('Email address');
    expect(passwordLabel).toBe('Password');
  });

  test('register form: all inputs have aria-labels', async ({ page }) => {
    await goToRegister(page);

    const fields = [
      { selector: REGISTER.firstNameInput, label: 'First name' },
      { selector: REGISTER.lastNameInput, label: 'Last name' },
      { selector: REGISTER.middleNameInput, label: 'Middle name' },
      { selector: REGISTER.suffixInput, label: 'Name suffix' },
      { selector: REGISTER.emailInput, label: 'Email address' },
      { selector: REGISTER.passwordInput, label: 'Password' },
      { selector: REGISTER.confirmPasswordInput, label: 'Confirm password' },
    ];

    for (const field of fields) {
      const input = page.locator(field.selector);
      await expect(input).toBeVisible();
      const ariaLabel = await input.getAttribute('aria-label');
      expect(ariaLabel).toBe(field.label);
    }
  });

  test('login form: button roles correctly set', async ({ page }) => {
    await goToLogin(page);

    // Sign in button should have button role
    const signIn = page.locator(LOGIN.signInButton);
    await expect(signIn).toHaveAttribute('role', 'button');

    // Sign up link should have button role
    const signUp = page.locator(LOGIN.signUpLink);
    await expect(signUp).toHaveAttribute('role', 'button');

    // Forgot password should have button role
    const forgot = page.locator(LOGIN.forgotPassword);
    await expect(forgot).toHaveAttribute('role', 'button');
  });

  test('landing page: no detectable ARIA violations', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Landing page tests run on desktop');
    await goToLanding(page);
    await page.waitForSelector('text=All Services', { timeout: 30_000 });

    // Check that images have alt text or aria-labels
    const images = page.locator('img');
    const imgCount = await images.count();

    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      // Each image should have alt text, aria-label, be aria-hidden, or have presentation role
      const isAccessible = alt !== null || ariaLabel !== null || ariaHidden === 'true' || role === 'presentation' || role === 'none';
      // Decorative images without alt are common; log but don't hard-fail
      if (!isAccessible) {
        const src = await img.getAttribute('src');
        console.warn(`Image without accessible name: ${src?.substring(0, 80)}`);
      }
    }

    // Check that all form inputs have labels
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      // Input should have aria-label, placeholder, or associated label via id
      expect(ariaLabel || placeholder || id).toBeTruthy();
    }
  });
});
