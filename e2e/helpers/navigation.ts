import { type Page } from '@playwright/test';

/**
 * Navigate to landing page and wait for content to load.
 */
export async function goToLanding(page: Page) {
  await page.goto('/landing');
  // Wait for the E-VENT logo to appear in the header
  await page.waitForSelector('text=E-VENT', { timeout: 30_000 });
}

/**
 * Navigate to login page and wait for the form.
 */
export async function goToLogin(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('[aria-label="Email address"]', { timeout: 30_000 });
}

/**
 * Navigate to register page and wait for the form.
 */
export async function goToRegister(page: Page) {
  await page.goto('/register');
  await page.waitForSelector('[aria-label="First name"]', { timeout: 30_000 });
}
