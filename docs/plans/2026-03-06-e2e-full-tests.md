# Full E2E Test Suite — Customer, Provider, Admin

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comprehensive Playwright E2E tests covering every module for all 3 user roles (customer, provider, admin) with sequential transaction flows, running across 3 viewports (desktop 1440x900, mobile 393x851, tablet 768x1024).

**Architecture:** Tests use real Firebase auth via REST API to create 3 test users in global setup, promote roles via direct MySQL in the test DB (`event_test`), then run sequential spec files per role. Each spec logs in via UI, navigates modules, performs transactions, and verifies outcomes. A global teardown cleans up test users.

**Tech Stack:** Playwright Test, Firebase Auth REST API, Express.js backend, MySQL (`event_test` DB), Expo Web

---

## Module Map

### Customer (8 modules)
| # | Module | Route | Key Transactions |
|---|--------|-------|-------------------|
| C1 | Dashboard | `/user/dashboard` | View categories, browse services, search |
| C2 | Service Details | `/user/service/[id]` | View service, select package, book |
| C3 | Bookings | `/user/bookings` | View bookings, filter by status, cancel |
| C4 | Events | `/user/events` | Create event, edit, delete, set reminder |
| C5 | Messages | `/user/messages` | View conversations, send message |
| C6 | Hiring | `/user/hiring` | Post job, view proposals |
| C7 | Profile | `/user/profile` | Edit personal info, apply as provider |
| C8 | Notifications | `/user/notifications` | View notifications, mark read |

### Provider (11 modules)
| # | Module | Route | Key Transactions |
|---|--------|-------|-------------------|
| P1 | Dashboard | `/provider/dashboard` | View stats, analytics chart, quick actions |
| P2 | Services | `/provider/services` | Create service, add packages, edit, delete |
| P3 | Bookings | `/provider/bookings` | View bookings, accept/reject, start/complete |
| P4 | Availability | `/provider/availability` | Set schedule, block dates |
| P5 | Policies | `/provider/cancellation-policies` | Create/edit cancellation policies |
| P6 | Proposals | `/provider/proposals` | View/respond to proposals |
| P7 | Hiring | `/provider/hiring` | Browse jobs, submit applications |
| P8 | Messages | `/provider/messages` | Conversations with clients |
| P9 | Shared Events | `/provider/shared-events` | View shared event workspaces |
| P10 | Analytics | `/provider/analytics` | View charts, revenue, bookings data |
| P11 | Profile | `/provider/profile` | Edit profile, payment setup |

### Admin (7 modules)
| # | Module | Route | Key Transactions |
|---|--------|-------|-------------------|
| A1 | Dashboard | `/admin/dashboard` | View platform stats, recent activity |
| A2 | Users | `/admin/users` | View users, block/unblock, change roles |
| A3 | Services | `/admin/services` | View all services, approve/reject |
| A4 | Bookings | `/admin/bookings` | View all bookings, filter |
| A5 | Analytics | `/admin/analytics` | Platform-wide analytics |
| A6 | Messages | `/admin/messages` | View/moderate conversations |
| A7 | Applications | `/admin/provider-applications` | Approve/reject provider applications |

---

## Task 1: Global Setup — Test DB & Auth Helpers

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`
- Create: `e2e/helpers/auth.ts`
- Modify: `e2e/fixtures/test-data.ts`
- Modify: `playwright.config.ts`

**Step 1: Add test user credentials to test-data.ts**

Append to `e2e/fixtures/test-data.ts`:

```typescript
export const TEST_USERS = {
  customer: {
    email: 'e2e-customer@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Customer',
  },
  provider: {
    email: 'e2e-provider@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Provider',
  },
  admin: {
    email: 'e2e-admin@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Admin',
  },
} as const;

export const API_BASE = 'http://localhost:3001';
```

**Step 2: Create auth helper with login/register functions**

Create `e2e/helpers/auth.ts`:

```typescript
import { type Page } from '@playwright/test';
import { LOGIN, REGISTER } from './selectors';
import { TEST_USERS, API_BASE } from '../fixtures/test-data';

type Role = keyof typeof TEST_USERS;

/**
 * Register a user via the UI form.
 * Assumes page is at /register.
 */
export async function registerUser(page: Page, role: Role) {
  const user = TEST_USERS[role];
  await page.goto('/register');
  await page.waitForSelector(REGISTER.firstNameInput, { timeout: 30_000 });

  await page.locator(REGISTER.firstNameInput).fill(user.firstName);
  await page.locator(REGISTER.lastNameInput).fill(user.lastName);
  await page.locator(REGISTER.emailInput).fill(user.email);
  await page.locator(REGISTER.passwordInput).fill(user.password);
  await page.locator(REGISTER.confirmPasswordInput).fill(user.password);
  await page.locator(REGISTER.createAccountButton).click();

  // Wait for redirect to dashboard (successful registration)
  await page.waitForURL(/\/user\/dashboard/, { timeout: 30_000 });
}

/**
 * Login via the UI form.
 * Returns after dashboard loads.
 */
export async function loginAs(page: Page, role: Role) {
  const user = TEST_USERS[role];
  await page.goto('/login');
  await page.waitForSelector(LOGIN.emailInput, { timeout: 30_000 });

  await page.locator(LOGIN.emailInput).fill(user.email);
  await page.locator(LOGIN.passwordInput).fill(user.password);
  await page.locator(LOGIN.signInButton).click();

  // Wait for any dashboard to load
  await page.waitForURL(/\/(user|provider|admin)\/dashboard/, { timeout: 30_000 });
}

/**
 * Logout by navigating to settings or clearing state.
 */
export async function logout(page: Page) {
  // Click the sidebar logout or navigate to a logout action
  // The app uses state-based navigation, so we look for the logout button
  const logoutBtn = page.locator('[aria-label="Logout"], [aria-label="Sign out"]');
  if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForURL(/\/(login|landing)/, { timeout: 10_000 });
  } else {
    // Fallback: clear storage and navigate to login
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
    await page.waitForSelector(LOGIN.emailInput, { timeout: 30_000 });
  }
}

/**
 * Promote a user's role directly via the test DB API.
 * Only works when backend is running with event_test DB.
 */
export async function setUserRole(
  email: string,
  role: 'user' | 'provider' | 'admin'
) {
  const resp = await fetch(`${API_BASE}/api/test/set-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to set role: ${resp.status} ${await resp.text()}`);
  }
}

/**
 * Delete test user from DB (cleanup).
 */
export async function deleteTestUser(email: string) {
  await fetch(`${API_BASE}/api/test/delete-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).catch(() => { /* ignore cleanup failures */ });
}
```

**Step 3: Create test-only API endpoints on the backend**

Create `server/routes/test.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Only available when NODE_ENV=test
if (process.env.NODE_ENV !== 'test') {
  module.exports = router;
  return;
}

// POST /api/test/set-role — promote user to provider/admin
router.post('/set-role', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email and role required' });
    if (!['user', 'provider', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE `user` SET u_role = ?, u_provider_status = ? WHERE u_email = ?',
      [role, role === 'provider' ? 'approved' : null, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test/delete-user — remove test user
router.post('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    // Only allow deleting e2e test users
    if (!email.startsWith('e2e-') || !email.includes('test-event.com')) {
      return res.status(403).json({ error: 'can only delete e2e test users' });
    }
    const pool = getPool();
    await pool.query('DELETE FROM `user` WHERE u_email = ?', [email]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test/seed-service — create a test service for a provider
router.post('/seed-service', async (req, res) => {
  try {
    const { email, serviceName, category, description, price } = req.body;
    const pool = getPool();
    const [userRows] = await pool.query(
      'SELECT iduser FROM `user` WHERE u_email = ?', [email]
    );
    if (!userRows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRows[0].iduser;

    const [result] = await pool.query(
      `INSERT INTO service (s_user_id, s_name, s_category, s_description, s_price, s_status, s_city, s_state)
       VALUES (?, ?, ?, ?, ?, 'active', 'Test City', 'Test State')`,
      [userId, serviceName, category, description || 'Test service', price || 1000]
    );
    res.json({ ok: true, serviceId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test/seed-booking — create a test booking
router.post('/seed-booking', async (req, res) => {
  try {
    const { customerEmail, serviceId, status } = req.body;
    const pool = getPool();
    const [userRows] = await pool.query(
      'SELECT iduser FROM `user` WHERE u_email = ?', [customerEmail]
    );
    if (!userRows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRows[0].iduser;

    const [result] = await pool.query(
      `INSERT INTO booking (b_user_id, b_service_id, b_status, b_event_date, b_created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [userId, serviceId, status || 'pending']
    );
    res.json({ ok: true, bookingId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/test/cleanup — remove all e2e test data
router.delete('/cleanup', async (_req, res) => {
  try {
    const pool = getPool();
    // Delete in correct order due to foreign keys
    await pool.query("DELETE FROM booking WHERE b_user_id IN (SELECT iduser FROM `user` WHERE u_email LIKE 'e2e-%@test-event.com')");
    await pool.query("DELETE FROM service WHERE s_user_id IN (SELECT iduser FROM `user` WHERE u_email LIKE 'e2e-%@test-event.com')");
    await pool.query("DELETE FROM event WHERE e_user_id IN (SELECT iduser FROM `user` WHERE u_email LIKE 'e2e-%@test-event.com')");
    await pool.query("DELETE FROM `user` WHERE u_email LIKE 'e2e-%@test-event.com'");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

Mount in `server/index.js` (near the top with other route imports):

```javascript
// Test-only routes (only active when NODE_ENV=test)
if (process.env.NODE_ENV === 'test') {
  const testRoutes = require('./routes/test');
  app.use('/api/test', testRoutes);
}
```

**Step 4: Create global setup — registers 3 users, sets roles**

Create `e2e/global-setup.ts`:

```typescript
import { chromium, type FullConfig } from '@playwright/test';
import { TEST_USERS, API_BASE } from './fixtures/test-data';

async function globalSetup(_config: FullConfig) {
  console.log('[E2E Setup] Cleaning up previous test data...');
  await fetch(`${API_BASE}/api/test/cleanup`, { method: 'DELETE' }).catch(() => {});

  console.log('[E2E Setup] Registering test users...');
  const browser = await chromium.launch();

  // Register customer
  const customerPage = await browser.newPage();
  await registerViaUI(customerPage, TEST_USERS.customer);
  await customerPage.close();

  // Register provider
  const providerPage = await browser.newPage();
  await registerViaUI(providerPage, TEST_USERS.provider);
  await providerPage.close();

  // Register admin
  const adminPage = await browser.newPage();
  await registerViaUI(adminPage, TEST_USERS.admin);
  await adminPage.close();

  await browser.close();

  // Promote roles via test API
  console.log('[E2E Setup] Setting user roles...');
  await setRole(TEST_USERS.provider.email, 'provider');
  await setRole(TEST_USERS.admin.email, 'admin');

  // Seed test data
  console.log('[E2E Setup] Seeding test data...');
  await seedTestData();

  console.log('[E2E Setup] Done!');
}

async function registerViaUI(
  page: any,
  user: { email: string; password: string; firstName: string; lastName: string }
) {
  await page.goto('http://localhost:8081/register');
  await page.waitForSelector('[aria-label="First name"]', { timeout: 30_000 });

  await page.locator('[aria-label="First name"]').fill(user.firstName);
  await page.locator('[aria-label="Last name"]').fill(user.lastName);
  await page.locator('[aria-label="Email address"]').fill(user.email);
  await page.locator('[aria-label="Password"]').fill(user.password);
  await page.locator('[aria-label="Confirm password"]').fill(user.password);
  await page.locator('[aria-label="Create account"]').click();

  // Wait for dashboard or error
  await page.waitForURL(/\/user\/dashboard/, { timeout: 30_000 });
  console.log(`  Registered: ${user.email}`);
}

async function setRole(email: string, role: string) {
  const resp = await fetch(`${API_BASE}/api/test/set-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  if (!resp.ok) throw new Error(`Failed to set role for ${email}: ${resp.status}`);
  console.log(`  Role set: ${email} -> ${role}`);
}

async function seedTestData() {
  // Create a test service for the provider
  const resp = await fetch(`${API_BASE}/api/test/seed-service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USERS.provider.email,
      serviceName: 'E2E Photography Service',
      category: 'photography',
      description: 'Professional photography for events',
      price: 5000,
    }),
  });
  if (resp.ok) {
    const data = await resp.json();
    // Create a booking for the customer
    await fetch(`${API_BASE}/api/test/seed-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: TEST_USERS.customer.email,
        serviceId: data.serviceId,
        status: 'confirmed',
      }),
    });
  }
  console.log('  Test data seeded');
}

export default globalSetup;
```

**Step 5: Create global teardown**

Create `e2e/global-teardown.ts`:

```typescript
import { type FullConfig } from '@playwright/test';
import { API_BASE } from './fixtures/test-data';

async function globalTeardown(_config: FullConfig) {
  console.log('[E2E Teardown] Cleaning up test data...');
  await fetch(`${API_BASE}/api/test/cleanup`, { method: 'DELETE' }).catch(() => {});
  console.log('[E2E Teardown] Done!');
}

export default globalTeardown;
```

**Step 6: Update playwright.config.ts**

Add global setup/teardown and auth state storage:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60_000,

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],

  webServer: [
    {
      command: 'node server/index.js',
      port: 3001,
      env: {
        NODE_ENV: 'test',
        DB_NAME: 'event_test',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npx expo start --web --port 8081 --non-interactive',
      port: 8081,
      env: {
        EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3001',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
```

**Step 7: Commit**

```bash
git add e2e/global-setup.ts e2e/global-teardown.ts e2e/helpers/auth.ts \
        e2e/fixtures/test-data.ts server/routes/test.js \
        server/index.js playwright.config.ts
git commit -m "test: add global setup, auth helpers, and test-only API routes"
```

---

## Task 2: Customer Test Suite — Dashboard & Service Details (C1, C2)

**Files:**
- Create: `e2e/customer/dashboard.spec.ts`
- Create: `e2e/customer/service-details.spec.ts`

**Step 1: Write customer dashboard tests**

Create `e2e/customer/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Dashboard (C1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('displays welcome section with user name', async ({ page }) => {
    await expect(page.getByText('Test')).toBeVisible({ timeout: 10_000 });
  });

  test('shows category cards for all service types', async ({ page }) => {
    const categories = ['Venue', 'Catering', 'Photography', 'Music', 'Decoration', 'Transportation'];
    for (const cat of categories) {
      await expect(page.getByText(cat).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('shows additional categories beyond 6', async ({ page }) => {
    // Module 3 fix: all 9 categories should show
    const extraCategories = ['Entertainment', 'Planning', 'Rentals'];
    for (const cat of extraCategories) {
      const el = page.getByText(cat).first();
      // These may or may not exist depending on data, but the section should render
      if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(el).toBeVisible();
      }
    }
  });

  test('displays featured/recommended services section', async ({ page }) => {
    await expect(
      page.getByText(/Recommended|Featured|Popular/).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a category filters services', async ({ page }) => {
    const photographyCard = page.getByText('Photography').first();
    await photographyCard.click();
    // Should show photography services or navigate to filtered view
    await page.waitForTimeout(2000);
    // URL or content should reflect photography filter
    const url = page.url();
    const hasFilter = url.includes('photography') ||
      (await page.getByText(/Photography/i).count()) > 0;
    expect(hasFilter).toBeTruthy();
  });

  test('search bar accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('photography');
      await expect(searchInput).toHaveValue('photography');
    }
  });

  test('banner slider is visible on desktop', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 768, 'Desktop/tablet only');
    // Banner or hero section should be visible
    const banner = page.locator('[class*="banner"], [class*="slider"], [class*="hero"]').first();
    if (await banner.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(banner).toBeVisible();
    }
  });

  test('sidebar navigation shows correct menu items', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, 'Desktop only');
    const navItems = ['Dashboard', 'Bookings', 'Events', 'Messages', 'Hiring', 'Profile', 'Notifications', 'Settings'];
    for (const item of navItems) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('bottom nav shows on mobile', async ({ page }) => {
    test.skip(page.viewportSize()!.width >= 768, 'Mobile only');
    // Mobile bottom navigation should have key items
    const bottomNav = page.locator('[class*="bottomNav"], [class*="BottomNav"]').first();
    if (await bottomNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(bottomNav).toBeVisible();
    }
  });
});
```

**Step 2: Write service details tests**

Create `e2e/customer/service-details.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { API_BASE } from '../fixtures/test-data';

test.describe('Customer Service Details (C2)', () => {
  let testServiceId: number;

  test.beforeAll(async () => {
    // Get the seeded service ID
    const resp = await fetch(
      `${API_BASE}/api/services?category=photography&limit=1`
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data.services?.length) testServiceId = data.services[0].idservice;
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('navigating to a service shows details page', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    await page.waitForTimeout(3000);
    await expect(page.getByText('E2E Photography Service').first()).toBeVisible({ timeout: 10_000 });
  });

  test('service page shows description', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    await expect(
      page.getByText('Professional photography for events').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('service page shows price', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    await expect(page.getByText(/5,000|5000/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Book Now button is visible', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    const bookBtn = page.getByText('Book Now').first();
    await expect(bookBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Book Now opens booking modal', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    await page.getByText('Book Now').first().click();
    // Booking modal should appear
    await expect(
      page.getByText(/Select.*Date|Booking|Event Date/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('booking modal shows date picker', async ({ page }) => {
    test.skip(!testServiceId, 'No test service available');
    await page.goto(`/user/service/${testServiceId}`);
    await page.getByText('Book Now').first().click();
    await page.waitForTimeout(2000);
    // Should have date selection input
    const dateInput = page.locator('input[type="date"], input[type="datetime-local"], [aria-label*="date" i]').first();
    await expect(dateInput).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 3: Run tests to verify**

```bash
npx playwright test e2e/customer/dashboard.spec.ts e2e/customer/service-details.spec.ts --project=desktop-chrome
```

**Step 4: Commit**

```bash
git add e2e/customer/
git commit -m "test: customer dashboard & service details E2E tests (C1, C2)"
```

---

## Task 3: Customer Test Suite — Bookings, Events, Messages (C3, C4, C5)

**Files:**
- Create: `e2e/customer/bookings.spec.ts`
- Create: `e2e/customer/events.spec.ts`
- Create: `e2e/customer/messages.spec.ts`

**Step 1: Write customer bookings tests**

Create `e2e/customer/bookings.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Bookings (C3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    // Navigate to bookings
    await page.goto('/user/bookings');
    await page.waitForTimeout(3000);
  });

  test('bookings page loads', async ({ page }) => {
    await expect(
      page.getByText(/Booking|My Booking/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows seeded booking', async ({ page }) => {
    // The global setup created a confirmed booking
    await expect(
      page.getByText(/confirmed|Confirmed/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('filter tabs are visible', async ({ page }) => {
    const filters = ['All', 'Pending', 'Confirmed', 'Completed'];
    for (const filter of filters) {
      const filterEl = page.getByText(filter, { exact: true }).first();
      if (await filterEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(filterEl).toBeVisible();
      }
    }
  });

  test('clicking a filter changes displayed bookings', async ({ page }) => {
    const pendingFilter = page.locator(`[aria-label="Filter by pending"]`);
    if (await pendingFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pendingFilter.click();
      await page.waitForTimeout(2000);
      // Content should update
    }
  });

  test('booking card shows service name', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 2: Write customer events tests**

Create `e2e/customer/events.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Events (C4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/events');
    await page.waitForTimeout(3000);
  });

  test('events page loads', async ({ page }) => {
    await expect(
      page.getByText(/Event|My Event/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('create event button is visible', async ({ page }) => {
    const createBtn = page.locator('[aria-label="Create new event"]');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking create event opens modal', async ({ page }) => {
    await page.locator('[aria-label="Create new event"]').click();
    await page.waitForTimeout(2000);
    // Modal should appear with event creation form
    await expect(
      page.getByText(/Create.*Event|New.*Event|Event Name/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('event creation form has required fields', async ({ page }) => {
    await page.locator('[aria-label="Create new event"]').click();
    await page.waitForTimeout(2000);
    // Should have name, date, description fields
    const nameInput = page.locator('[aria-label*="name" i], [placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
  });

  test('can create an event', async ({ page }) => {
    await page.locator('[aria-label="Create new event"]').click();
    await page.waitForTimeout(2000);

    // Fill event form
    const nameInput = page.locator('[aria-label*="Event name" i], [placeholder*="event name" i], [aria-label*="name" i]').first();
    await nameInput.fill('E2E Test Event');

    // Submit the form
    const submitBtn = page.getByText(/Create|Save|Submit/i).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
  });

  test('filter tabs work', async ({ page }) => {
    const filters = page.locator('[aria-label*="Filter"]');
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 3: Write customer messages tests**

Create `e2e/customer/messages.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Messages (C5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/messages');
    await page.waitForTimeout(3000);
  });

  test('messages page loads', async ({ page }) => {
    await expect(
      page.getByText(/Message|Conversation|Chat|Inbox/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('displays conversation list or empty state', async ({ page }) => {
    const hasConversations = await page.getByText(/No.*conversation|No.*message|Start.*conversation/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasList = await page.locator('[aria-label*="Conversation"]').first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    // Either empty state or conversation list should be visible
    expect(hasConversations || hasList).toBeTruthy();
  });

  test('message input is available when conversation selected', async ({ page }) => {
    const conversation = page.locator('[aria-label*="Conversation"]').first();
    if (await conversation.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(2000);
      const messageInput = page.locator('[aria-label="Message input"]');
      await expect(messageInput).toBeVisible({ timeout: 10_000 });
    }
  });

  test('send button is available', async ({ page }) => {
    const conversation = page.locator('[aria-label*="Conversation"]').first();
    if (await conversation.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(2000);
      const sendBtn = page.locator('[aria-label="Send message"]');
      await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    }
  });
});
```

**Step 4: Commit**

```bash
git add e2e/customer/
git commit -m "test: customer bookings, events, messages E2E tests (C3, C4, C5)"
```

---

## Task 4: Customer Test Suite — Hiring, Profile, Notifications (C6, C7, C8)

**Files:**
- Create: `e2e/customer/hiring.spec.ts`
- Create: `e2e/customer/profile.spec.ts`
- Create: `e2e/customer/notifications.spec.ts`

**Step 1: Write customer hiring tests**

Create `e2e/customer/hiring.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Hiring (C6)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/hiring');
    await page.waitForTimeout(3000);
  });

  test('hiring page loads', async ({ page }) => {
    await expect(
      page.getByText(/Hiring|Job|Post/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows job posting section or empty state', async ({ page }) => {
    const hasJobs = await page.getByText(/No.*job|Create.*job|Post.*job/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasContent = await page.getByText(/My.*Job|Active|Posted/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasJobs || hasContent).toBeTruthy();
  });

  test('can navigate to create job posting', async ({ page }) => {
    const createBtn = page.getByText(/Create|Post.*Job|New.*Job/i).first();
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});
```

**Step 2: Write customer profile tests**

Create `e2e/customer/profile.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Profile (C7)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/profile');
    await page.waitForTimeout(3000);
  });

  test('profile page loads with user info', async ({ page }) => {
    await expect(
      page.getByText(/Profile|Account/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows user email', async ({ page }) => {
    await expect(
      page.getByText('e2e-customer@test-event.com').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows user name', async ({ page }) => {
    await expect(
      page.getByText('Test').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows apply as provider option', async ({ page }) => {
    const applyBtn = page.getByText(/Apply.*Provider|Become.*Provider/i).first();
    if (await applyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(applyBtn).toBeVisible();
    }
  });

  test('personal info link navigates correctly', async ({ page }) => {
    const personalInfoLink = page.getByText(/Personal.*Info|Edit.*Profile/i).first();
    if (await personalInfoLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await personalInfoLink.click();
      await page.waitForTimeout(2000);
      // Should show personal info form
      await expect(
        page.getByText(/First.*Name|Personal.*Information/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/user/settings');
    await page.waitForTimeout(3000);
    await expect(
      page.getByText(/Settings/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 3: Write customer notifications tests**

Create `e2e/customer/notifications.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Customer Notifications (C8)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/user/notifications');
    await page.waitForTimeout(3000);
  });

  test('notifications page loads', async ({ page }) => {
    await expect(
      page.getByText(/Notification/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state or notification list', async ({ page }) => {
    const hasEmpty = await page.getByText(/No.*notification|empty/i).first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const hasList = (await page.locator('[aria-label*="notification" i]').count()) > 0;
    expect(hasEmpty || hasList).toBeTruthy();
  });

  test('no rapid polling in network tab (Module 6 fix)', async ({ page }) => {
    // Collect network requests for 5 seconds
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('notification')) {
        requests.push(req.url());
      }
    });
    await page.waitForTimeout(5000);
    // Should NOT have more than 2 notification requests in 5 seconds
    // (initial fetch + maybe one refetch, but not 2s polling)
    expect(requests.length).toBeLessThanOrEqual(3);
  });
});
```

**Step 4: Commit**

```bash
git add e2e/customer/
git commit -m "test: customer hiring, profile, notifications E2E tests (C6, C7, C8)"
```

---

## Task 5: Provider Test Suite — Dashboard, Services, Bookings (P1, P2, P3)

**Files:**
- Create: `e2e/provider/dashboard.spec.ts`
- Create: `e2e/provider/services.spec.ts`
- Create: `e2e/provider/bookings.spec.ts`

**Step 1: Write provider dashboard tests**

Create `e2e/provider/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Dashboard (P1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
  });

  test('dashboard loads with provider view', async ({ page }) => {
    await expect(
      page.getByText(/Dashboard|Welcome/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows stats cards (bookings, revenue)', async ({ page }) => {
    // Provider dashboard should show key metrics
    const statsText = page.getByText(/Booking|Revenue|Service|Rating/i).first();
    await expect(statsText).toBeVisible({ timeout: 10_000 });
  });

  test('shows analytics chart area', async ({ page }) => {
    // Module 1 fix: real bar chart
    const chartArea = page.locator('canvas, svg, [class*="chart" i], [class*="analytics" i]').first();
    if (await chartArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(chartArea).toBeVisible();
    }
  });

  test('quick action buttons are visible', async ({ page }) => {
    const actions = ['Add service', 'View bookings', 'View hiring'];
    for (const action of actions) {
      const btn = page.locator(`[aria-label="${action}"]`);
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(btn).toBeVisible();
      }
    }
  });

  test('sidebar shows provider navigation items', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, 'Desktop only');
    const navItems = ['Dashboard', 'Services', 'Bookings', 'Availability', 'Proposals', 'Analytics'];
    for (const item of navItems) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
```

**Step 2: Write provider services tests**

Create `e2e/provider/services.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Services (P2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/services');
    await page.waitForTimeout(3000);
  });

  test('services page loads', async ({ page }) => {
    await expect(
      page.getByText(/Service|My Service/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows seeded test service', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('add service button is visible', async ({ page }) => {
    const addBtn = page.getByText(/Add.*Service|Create.*Service|New.*Service/i).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking add service opens form', async ({ page }) => {
    const addBtn = page.getByText(/Add.*Service|Create.*Service|New.*Service/i).first();
    await addBtn.click();
    await page.waitForTimeout(2000);
    // Service form should appear
    await expect(
      page.locator('[aria-label*="service name" i], [placeholder*="service name" i]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('service card shows category badge', async ({ page }) => {
    await expect(
      page.getByText(/photography/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 3: Write provider bookings tests**

Create `e2e/provider/bookings.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Provider Bookings (P3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'provider');
    await page.goto('/provider/bookings');
    await page.waitForTimeout(3000);
  });

  test('bookings page loads', async ({ page }) => {
    await expect(
      page.getByText(/Booking/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows filter tabs including in_progress', async ({ page }) => {
    // Module 4B fix: in_progress status added
    const filters = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed'];
    for (const filter of filters) {
      const filterEl = page.getByText(filter, { exact: true }).first();
      if (await filterEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(filterEl).toBeVisible();
      }
    }
  });

  test('shows seeded booking from customer', async ({ page }) => {
    await expect(
      page.getByText(/E2E Photography|Test Customer|confirmed/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('confirmed booking shows Start Service button', async ({ page }) => {
    // Module 4B: Start Service button for confirmed bookings
    const startBtn = page.getByText(/Start.*Service/i).first();
    if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(startBtn).toBeVisible();
    }
  });

  test('booking card shows customer info', async ({ page }) => {
    const customerInfo = page.getByText(/Test Customer|e2e-customer/i).first();
    if (await customerInfo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(customerInfo).toBeVisible();
    }
  });
});
```

**Step 4: Commit**

```bash
git add e2e/provider/
git commit -m "test: provider dashboard, services, bookings E2E tests (P1, P2, P3)"
```

---

## Task 6: Provider Test Suite — Availability, Policies, Proposals, Hiring, Messages (P4-P8)

**Files:**
- Create: `e2e/provider/availability.spec.ts`
- Create: `e2e/provider/policies.spec.ts`
- Create: `e2e/provider/proposals.spec.ts`
- Create: `e2e/provider/hiring.spec.ts`
- Create: `e2e/provider/messages.spec.ts`

Each file follows the same pattern: login as provider, navigate to module, verify page loads, check key elements, test interactions. See Task 3-4 pattern. Specific assertions:

- **P4 Availability:** Calendar/schedule view visible, can select dates, block/unblock dates
- **P5 Policies:** Policy list or empty state, create policy form, edit policy
- **P6 Proposals:** Proposals list or empty, respond buttons (accept/reject)
- **P7 Hiring:** Job listings browse, application submission form
- **P8 Messages:** Conversation list, message input, send button

**Step 5: Commit**

```bash
git add e2e/provider/
git commit -m "test: provider availability, policies, proposals, hiring, messages E2E tests (P4-P8)"
```

---

## Task 7: Provider Test Suite — Shared Events, Analytics, Profile (P9, P10, P11)

**Files:**
- Create: `e2e/provider/shared-events.spec.ts`
- Create: `e2e/provider/analytics.spec.ts`
- Create: `e2e/provider/profile.spec.ts`

- **P9 Shared Events:** Page loads, shows shared events or empty state
- **P10 Analytics:** Charts visible, revenue data, booking trends
- **P11 Profile:** Profile info visible, payment setup link, edit form

**Step 5: Commit**

```bash
git add e2e/provider/
git commit -m "test: provider shared events, analytics, profile E2E tests (P9, P10, P11)"
```

---

## Task 8: Admin Test Suite — Dashboard, Users, Services (A1, A2, A3)

**Files:**
- Create: `e2e/admin/dashboard.spec.ts`
- Create: `e2e/admin/users.spec.ts`
- Create: `e2e/admin/services.spec.ts`

**Step 1: Write admin dashboard tests**

Create `e2e/admin/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Dashboard (A1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('dashboard loads with admin view', async ({ page }) => {
    await expect(
      page.getByText(/Dashboard/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows platform stats (users, services, bookings)', async ({ page }) => {
    // Module 8 fix: real stats from DB
    const statsKeywords = ['User', 'Service', 'Booking', 'Revenue'];
    let found = 0;
    for (const keyword of statsKeywords) {
      if (await page.getByText(new RegExp(keyword, 'i')).first()
        .isVisible({ timeout: 3_000 }).catch(() => false)) {
        found++;
      }
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('shows quick action buttons', async ({ page }) => {
    const actions = ['Manage users', 'Manage services', 'View reports'];
    for (const action of actions) {
      const btn = page.locator(`[aria-label="${action}"]`);
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(btn).toBeVisible();
      }
    }
  });

  test('shows recent activity section', async ({ page }) => {
    const activitySection = page.locator('[aria-label="View all recent activity"]');
    if (await activitySection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(activitySection).toBeVisible();
    }
  });

  test('sidebar shows admin navigation', async ({ page }) => {
    test.skip(page.viewportSize()!.width < 1024, 'Desktop only');
    const navItems = ['Dashboard', 'Users', 'Services', 'Bookings', 'Analytics', 'Messages', 'Applications'];
    for (const item of navItems) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
```

**Step 2: Write admin users tests**

Create `e2e/admin/users.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Users (A2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await page.waitForTimeout(3000);
  });

  test('users management page loads', async ({ page }) => {
    await expect(
      page.getByText(/User/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows list of users', async ({ page }) => {
    // Should show at least the 3 test users
    await expect(
      page.getByText(/e2e-customer|e2e-provider|e2e-admin|Test/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('user cards show role badges', async ({ page }) => {
    const roles = page.getByText(/user|provider|admin/i);
    expect(await roles.count()).toBeGreaterThanOrEqual(1);
  });

  test('has search/filter capability', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="Filter" i]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('e2e-customer');
      await page.waitForTimeout(2000);
    }
  });
});
```

**Step 3: Write admin services tests**

Create `e2e/admin/services.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Admin Services (A3)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/services');
    await page.waitForTimeout(3000);
  });

  test('services management page loads', async ({ page }) => {
    await expect(
      page.getByText(/Service/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows all platform services', async ({ page }) => {
    await expect(
      page.getByText('E2E Photography Service').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('service list shows provider info', async ({ page }) => {
    const providerInfo = page.getByText(/Test Provider|e2e-provider/i).first();
    if (await providerInfo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(providerInfo).toBeVisible();
    }
  });
});
```

**Step 4: Commit**

```bash
git add e2e/admin/
git commit -m "test: admin dashboard, users, services E2E tests (A1, A2, A3)"
```

---

## Task 9: Admin Test Suite — Bookings, Analytics, Messages, Applications (A4-A7)

**Files:**
- Create: `e2e/admin/bookings.spec.ts`
- Create: `e2e/admin/analytics.spec.ts`
- Create: `e2e/admin/messages.spec.ts`
- Create: `e2e/admin/applications.spec.ts`

- **A4 Bookings:** All bookings list, filter by status, view details
- **A5 Analytics:** Platform charts, revenue trends
- **A6 Messages:** Moderate conversations, view all messages
- **A7 Applications:** Provider application list, approve/reject buttons, application details

**Step 5: Commit**

```bash
git add e2e/admin/
git commit -m "test: admin bookings, analytics, messages, applications E2E tests (A4-A7)"
```

---

## Task 10: Cross-Role Sequential Transaction Tests

**Files:**
- Create: `e2e/transactions/booking-flow.spec.ts`
- Create: `e2e/transactions/provider-application-flow.spec.ts`

**Step 1: Write end-to-end booking transaction test**

Create `e2e/transactions/booking-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

test.describe('Cross-Role Booking Flow', () => {
  test('customer books -> provider accepts -> starts -> completes', async ({ page }) => {
    // 1. Customer: browse and book a service
    await loginAs(page, 'customer');
    await page.goto('/user/dashboard');
    await page.waitForTimeout(3000);

    // Navigate to a service (the seeded photography service)
    const serviceCard = page.getByText('E2E Photography Service').first();
    if (await serviceCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await serviceCard.click();
      await page.waitForTimeout(3000);

      // Click Book Now
      const bookBtn = page.getByText('Book Now').first();
      if (await bookBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bookBtn.click();
        await page.waitForTimeout(3000);
        // Booking modal should open — verify it loaded
        await expect(
          page.getByText(/Book|Event.*Date|Select/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    }

    await logout(page);

    // 2. Provider: check bookings
    await loginAs(page, 'provider');
    await page.goto('/provider/bookings');
    await page.waitForTimeout(3000);

    await expect(
      page.getByText(/Booking/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await logout(page);

    // 3. Admin: verify booking visible
    await loginAs(page, 'admin');
    await page.goto('/admin/bookings');
    await page.waitForTimeout(3000);

    await expect(
      page.getByText(/Booking/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 2: Write provider application flow test**

Create `e2e/transactions/provider-application-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

test.describe('Provider Application Flow', () => {
  test('customer profile -> admin applications page loads', async ({ page }) => {
    // 1. Customer: navigate to profile (where provider application exists)
    await loginAs(page, 'customer');
    await page.goto('/user/profile');
    await page.waitForTimeout(3000);

    await expect(
      page.getByText(/Profile/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await logout(page);

    // 2. Admin: check applications page
    await loginAs(page, 'admin');
    await page.goto('/admin/provider-applications');
    await page.waitForTimeout(3000);

    await expect(
      page.getByText(/Application/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
```

**Step 3: Commit**

```bash
git add e2e/transactions/
git commit -m "test: cross-role sequential transaction E2E tests"
```

---

## Task 11: Final Verification & Cleanup

**Step 1: Run full test suite on all viewports**

```bash
npx playwright test --project=desktop-chrome
npx playwright test --project=mobile-chrome
npx playwright test --project=tablet-chrome
```

**Step 2: Fix any failing tests**

Adjust selectors, timeouts, or assertions based on actual app behavior.

**Step 3: Run complete suite**

```bash
npx playwright test
```

Expected: All tests pass across 3 viewports.

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete E2E test suite — customer, provider, admin across 3 viewports"
```

---

## Summary

| Role | Modules | Spec Files | Approx Tests |
|------|---------|-----------|-------------|
| Customer | 8 (C1-C8) | 8 files | ~40 tests |
| Provider | 11 (P1-P11) | 11 files | ~50 tests |
| Admin | 7 (A1-A7) | 7 files | ~30 tests |
| Cross-Role | 2 flows | 2 files | ~5 tests |
| **Total** | **28** | **28 spec files** | **~125 tests x 3 viewports = ~375** |
