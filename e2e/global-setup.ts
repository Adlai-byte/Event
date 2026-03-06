import { chromium, type FullConfig } from '@playwright/test';
import { TEST_USERS, API_BASE } from './fixtures/test-data';
import { REGISTER } from './helpers/selectors';

/**
 * Global setup for E2E tests.
 * 1. Cleans up previous test data
 * 2. Registers 3 test users via the UI
 * 3. Promotes provider and admin users via test API
 * 4. Seeds a test service and booking
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:8081';

  // Step 1: Clean up any leftover test data from previous runs
  console.log('[global-setup] Cleaning up previous test data...');
  await fetch(`${API_BASE}/api/test/cleanup`, { method: 'DELETE' });

  // Step 2: Launch browser and register test users
  console.log('[global-setup] Registering test users...');
  const browser = await chromium.launch();

  for (const [role, user] of Object.entries(TEST_USERS)) {
    console.log(`[global-setup] Registering ${role}: ${user.email}`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${baseURL}/register`, { timeout: 30000 });

      // Wait for registration form
      await page.waitForSelector(REGISTER.firstNameInput, { timeout: 15000 });

      // Fill the registration form
      await page.locator(REGISTER.firstNameInput).fill(user.firstName);
      await page.locator(REGISTER.lastNameInput).fill(user.lastName);
      await page.locator(REGISTER.emailInput).fill(user.email);
      await page.locator(REGISTER.passwordInput).fill(user.password);
      await page.locator(REGISTER.confirmPasswordInput).fill(user.password);

      // Submit
      await page.locator(REGISTER.createAccountButton).click();

      // Wait for dashboard redirect (registration creates a user role by default)
      await page.waitForURL('**/user/dashboard', { timeout: 30000 });
      console.log(`[global-setup] Successfully registered ${role}`);
    } catch (error) {
      console.error(`[global-setup] Failed to register ${role}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Step 3: Promote provider and admin users
  console.log('[global-setup] Promoting provider user...');
  await fetch(`${API_BASE}/api/test/set-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USERS.provider.email, role: 'provider' }),
  });

  console.log('[global-setup] Promoting admin user...');
  await fetch(`${API_BASE}/api/test/set-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USERS.admin.email, role: 'admin' }),
  });

  // Step 4: Seed a test service for the provider
  console.log('[global-setup] Seeding test service...');
  const serviceRes = await fetch(`${API_BASE}/api/test/seed-service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USERS.provider.email,
      name: 'E2E Test Photography',
      category: 'photography',
      description: 'Professional photography service for E2E testing',
      price: 5000,
      city: 'Mati',
      state: 'Davao Oriental',
    }),
  });
  const serviceData = await serviceRes.json();

  // Step 5: Seed a test booking
  if (serviceData.ok && serviceData.serviceId) {
    console.log('[global-setup] Seeding test booking...');
    await fetch(`${API_BASE}/api/test/seed-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: TEST_USERS.customer.email,
        serviceId: serviceData.serviceId,
        status: 'confirmed',
      }),
    });
  }

  console.log('[global-setup] Setup complete.');
}

export default globalSetup;
