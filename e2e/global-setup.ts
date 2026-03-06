import { chromium, type FullConfig, type Page } from '@playwright/test';
import { TEST_USERS, API_BASE } from './fixtures/test-data';
import { REGISTER, LOGIN } from './helpers/selectors';

/**
 * Ensure a Firebase account exists for the user. Try login first; if that fails, register.
 */
async function ensureFirebaseAccount(
  page: Page,
  baseURL: string,
  user: { email: string; password: string; firstName: string; lastName: string },
): Promise<void> {
  // First, try logging in (user may already exist in Firebase from a previous run)
  await page.goto(`${baseURL}/login`, { timeout: 30000 });
  await page.waitForSelector(LOGIN.emailInput, { timeout: 15000 });
  await page.locator(LOGIN.emailInput).fill(user.email);
  await page.locator(LOGIN.passwordInput).fill(user.password);
  await page.locator(LOGIN.signInButton).click();

  // Wait to see if login succeeds (redirects to dashboard)
  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log(`[global-setup]   Firebase account exists, logged in`);
    return;
  } catch {
    // Login failed — user doesn't exist in Firebase, proceed with registration
    console.log(`[global-setup]   Login failed, trying registration...`);
  }

  // Try registration
  await page.goto(`${baseURL}/register`, { timeout: 30000 });
  await page.waitForSelector(REGISTER.firstNameInput, { timeout: 15000 });
  await page.locator(REGISTER.firstNameInput).fill(user.firstName);
  await page.locator(REGISTER.lastNameInput).fill(user.lastName);
  await page.locator(REGISTER.emailInput).fill(user.email);
  await page.locator(REGISTER.passwordInput).fill(user.password);
  await page.locator(REGISTER.confirmPasswordInput).fill(user.password);
  await page.locator(REGISTER.createAccountButton).click();

  // Wait for dashboard redirect
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  console.log(`[global-setup]   Registered new Firebase account`);
}

/**
 * Global setup for E2E tests.
 * 1. Cleans up previous test data from MySQL
 * 2. Ensures Firebase accounts exist for all test users
 * 3. Ensures MySQL user records exist with correct roles via test API
 * 4. Seeds test service and booking
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:8081';

  // Step 1: Clean up any leftover test data from previous runs
  console.log('[global-setup] Cleaning up previous test data...');
  await fetch(`${API_BASE}/api/test/cleanup`, { method: 'DELETE' });

  // Step 2: Ensure Firebase accounts exist for all test users
  console.log('[global-setup] Ensuring Firebase accounts exist...');
  const browser = await chromium.launch();

  for (const [role, user] of Object.entries(TEST_USERS)) {
    console.log(`[global-setup] Firebase setup for ${role}: ${user.email}`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await ensureFirebaseAccount(page, baseURL, user);
    } catch (error) {
      console.error(`[global-setup] Failed Firebase setup for ${role}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Step 3: Ensure MySQL user records exist with correct roles
  console.log('[global-setup] Ensuring MySQL user records...');
  const roles: Record<string, string> = { customer: 'user', provider: 'provider', admin: 'admin' };
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const res = await fetch(`${API_BASE}/api/test/ensure-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roles[role] || 'user',
      }),
    });
    const data = await res.json();
    console.log(`[global-setup]   ${role} MySQL record: ${data.ok ? 'OK' : data.error}`);
  }

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
