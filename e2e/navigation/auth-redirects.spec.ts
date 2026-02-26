import { test, expect } from '@playwright/test';
import { PROTECTED_ROUTES } from '../fixtures/test-data';

test.describe('Protected route redirects — unauthenticated', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      // All protected layout files redirect to /login if !isAuthenticated
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      expect(page.url()).toContain('/login');
    });
  }
});
