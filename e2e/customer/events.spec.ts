import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Events (C4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/events');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with events content', async ({ page }) => {
    // Should see either event cards or empty state
    const hasEvents = await page
      .getByText(/event/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasEvents).toBeTruthy();
  });

  test('"Create new event" button is visible', async ({ page }) => {
    const createBtn = page.locator('[aria-label="Create new event"]');
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking create button opens modal with form', async ({ page }) => {
    const createBtn = page.locator('[aria-label="Create new event"]');
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });

    await createBtn.first().click();
    await page.waitForTimeout(1000);

    // Modal should open with event creation title
    await expect(
      page.getByText(/create.*event|new.*event/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('event form has name and date fields', async ({ page }) => {
    const createBtn = page.locator('[aria-label="Create new event"]');
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });

    await createBtn.first().click();
    await page.waitForTimeout(1000);

    // Check for name field
    const nameField = page.locator('[aria-label="Event name"]');
    await expect(nameField.first()).toBeVisible({ timeout: 5_000 });

    // Check for date field
    const dateField = page.locator('[aria-label="Event start date"]');
    await expect(dateField.first()).toBeVisible({ timeout: 5_000 });
  });

  test('can fill event name field', async ({ page }) => {
    const createBtn = page.locator('[aria-label="Create new event"]');
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });

    await createBtn.first().click();
    await page.waitForTimeout(1000);

    const nameField = page.locator('[aria-label="Event name"]').first();
    await expect(nameField).toBeVisible({ timeout: 5_000 });

    await nameField.fill('Test Birthday Party');
    await expect(nameField).toHaveValue('Test Birthday Party');
  });

  test('filter tabs work if present', async ({ page }) => {
    // Status filters: All, Planning, Upcoming, In Progress, Completed, Cancelled
    const allFilter = page.getByText('All', { exact: true }).first();
    const hasFilters = await allFilter
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasFilters) {
      // Click Planning filter
      const planningFilter = page.getByText('Planning', { exact: true }).first();
      const hasPlanningFilter = await planningFilter
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (hasPlanningFilter) {
        await planningFilter.click();
        await page.waitForTimeout(1000);

        // Should either show planning events or empty state
        const hasContent = await page
          .getByText(/planning|no.*event/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasContent).toBeTruthy();
      }
    }
  });
});
