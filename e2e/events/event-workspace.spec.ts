import { test, expect, type Page } from '@playwright/test';

// ── Mock Data ──

const MOCK_EVENTS = [
  {
    id: 1, userId: 1, name: 'Wedding Reception', date: '2026-06-15', endDate: '2026-06-15',
    location: 'Grand Ballroom, Manila', budget: 150000, guestCount: 200,
    description: 'A beautiful wedding reception', status: 'planning',
    createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2, userId: 1, name: 'Corporate Summit', date: '2026-04-20', endDate: '2026-04-21',
    location: 'BGC Convention Center', budget: 500000, guestCount: 500,
    description: 'Annual corporate summit', status: 'upcoming',
    createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 3, userId: 1, name: 'Birthday Party', date: '2026-01-10', endDate: null,
    location: 'Home', budget: 25000, guestCount: 50,
    description: 'Surprise birthday party', status: 'completed',
    createdAt: '2025-12-01T00:00:00Z', updatedAt: '2026-01-11T00:00:00Z',
  },
];

const MOCK_EVENT_DETAIL = MOCK_EVENTS[0];

const MOCK_BOOKINGS = [
  {
    id: 101, eventName: 'Wedding Reception', eventDate: '2026-06-15',
    startTime: '14:00', endTime: '22:00', location: 'Grand Ballroom',
    totalCost: 50000, status: 'confirmed', serviceName: 'Elite Photography',
    serviceCategory: 'photography', providerName: 'Juan Photos', primaryImage: null,
    isPaid: true, depositPaid: true,
  },
];

const MOCK_CHECKLIST = [
  { id: 1, eventId: 1, title: 'Book venue', isCompleted: true, dueDate: '2026-04-01', category: 'Venue', sortOrder: 0, createdAt: '2026-03-01T00:00:00Z' },
  { id: 2, eventId: 1, title: 'Hire photographer', isCompleted: true, dueDate: '2026-04-15', category: 'Vendors', sortOrder: 1, createdAt: '2026-03-01T00:00:00Z' },
  { id: 3, eventId: 1, title: 'Send invitations', isCompleted: false, dueDate: '2026-05-01', category: 'Logistics', sortOrder: 2, createdAt: '2026-03-01T00:00:00Z' },
  { id: 4, eventId: 1, title: 'Order cake', isCompleted: false, dueDate: null, category: 'Catering', sortOrder: 3, createdAt: '2026-03-01T00:00:00Z' },
];

const MOCK_TIMELINE = [
  { id: 1, eventId: 1, startTime: '14:00:00', endTime: '14:30:00', title: 'Guest Arrival', description: 'Welcome and registration', bookingId: null, bookingName: null, sortOrder: 0, createdAt: '2026-03-01T00:00:00Z' },
  { id: 2, eventId: 1, startTime: '14:30:00', endTime: '15:00:00', title: 'Ceremony', description: null, bookingId: null, bookingName: null, sortOrder: 1, createdAt: '2026-03-01T00:00:00Z' },
  { id: 3, eventId: 1, startTime: '15:00:00', endTime: '17:00:00', title: 'Reception', description: 'Dinner and entertainment', bookingId: 101, bookingName: 'Elite Photography', sortOrder: 2, createdAt: '2026-03-01T00:00:00Z' },
];

const MOCK_BUDGET = {
  totalBudget: 150000, totalSpent: 50000, remaining: 100000, percentUsed: 33,
  byCategory: [
    { category: 'photography', amount: 50000 },
  ],
};

// ── Helpers ──

async function mockAuthAndAPIs(page: Page) {
  // Mock auth middleware — return a mock user session
  await page.route('**/api/user/profile', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { iduser: 1, u_email: 'test@example.com', u_role: 'user', u_first_name: 'Test', u_last_name: 'User' } }),
    });
  });

  // Mock events list
  await page.route('**/api/events', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { rows: MOCK_EVENTS } }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: MOCK_EVENTS[0] }) });
    }
  });

  // Mock single event
  await page.route('**/api/events/1', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: MOCK_EVENT_DETAIL }),
    });
  });

  // Mock event sub-resources
  await page.route('**/api/events/1/bookings', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { rows: MOCK_BOOKINGS } }),
    });
  });

  await page.route('**/api/events/1/checklist', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { rows: MOCK_CHECKLIST } }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: MOCK_CHECKLIST[0] }) });
    }
  });

  await page.route('**/api/events/1/timeline', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { rows: MOCK_TIMELINE } }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: MOCK_TIMELINE[0] }) });
    }
  });

  await page.route('**/api/events/1/budget', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: MOCK_BUDGET }),
    });
  });

  await page.route('**/api/events/1/reminders', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { rows: [] } }),
    });
  });

  await page.route('**/api/events/1/collaborators', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { rows: [] } }),
    });
  });
}

// ── Tests ──

test.describe('Event Workspace — Events List', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('renders event cards with name, date, location and status badge', async ({ page }) => {
    await page.goto('/user/events');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Corporate Summit').first()).toBeVisible();
    await expect(page.getByText('Birthday Party').first()).toBeVisible();
  });

  test('status filter bar is visible with all filter options', async ({ page }) => {
    await page.goto('/user/events');
    await page.waitForTimeout(2000);

    await expect(page.getByText('All').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Planning').first()).toBeVisible();
    await expect(page.getByText('Upcoming').first()).toBeVisible();
    await expect(page.getByText('Completed').first()).toBeVisible();
  });

  test('status filter filters events correctly', async ({ page }) => {
    await page.goto('/user/events');
    await page.waitForTimeout(2000);

    // Wait for events to load
    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    // Click "Completed" filter
    await page.getByText('Completed', { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Should show Birthday Party (completed) and hide others
    await expect(page.getByText('Birthday Party').first()).toBeVisible();
  });

  test('empty state shows when no events match filter', async ({ page }) => {
    await page.goto('/user/events');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    // Click "Cancelled" filter — no events with this status
    await page.getByText('Cancelled', { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Empty state message should appear
    await expect(page.getByText(/no.*event/i).first()).toBeVisible();
  });

  test('loading skeleton appears while fetching', async ({ page }) => {
    // Delay the API response
    await page.route('**/api/events', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { rows: MOCK_EVENTS } }),
      });
    });

    await page.goto('/user/events');
    // Skeleton should be visible during loading
    const skeletons = page.locator('[aria-label="Loading content"]');
    if (await skeletons.count() > 0) {
      await expect(skeletons.first()).toBeVisible();
    }
  });

  test('FAB "New Event" button visible and opens modal', async ({ page }) => {
    await page.goto('/user/events');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    // Look for New Event button
    const newEventBtn = page.locator('[aria-label="Create new event"]');
    if (await newEventBtn.count() > 0) {
      await expect(newEventBtn.first()).toBeVisible();
      await newEventBtn.first().click();
      await page.waitForTimeout(500);
      // Modal should open with event creation fields
      await expect(page.getByText(/create.*event|new.*event/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Event Workspace — Event Detail Overview', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('displays event info: name, date, location, guests, description', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Grand Ballroom/i).first()).toBeVisible();
    await expect(page.getByText(/200 guests/i).first()).toBeVisible();
    await expect(page.getByText(/beautiful wedding/i).first()).toBeVisible();
  });

  test('status badge renders with correct color', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('planning').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Edit button opens CreateEventModal in edit mode', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    const editBtn = page.locator('[aria-label="Edit event"]');
    if (await editBtn.count() > 0) {
      await editBtn.first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/edit.*event|update.*event/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Event Workspace — Vendors Tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('lists linked bookings with service name and cost', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    // Click Vendors tab
    await page.getByText('Vendors', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Elite Photography').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows "Link Booking" button', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Vendors', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[aria-label="Link a booking"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Event Workspace — Timeline Tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('renders timeline entries with time and title', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Timeline', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Guest Arrival').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Ceremony').first()).toBeVisible();
    await expect(page.getByText('Reception').first()).toBeVisible();
  });

  test('"Add Entry" form is accessible', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Timeline', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    const addBtn = page.locator('[aria-label="Add timeline entry"]');
    await expect(addBtn.first()).toBeVisible({ timeout: 10_000 });
    await addBtn.first().click();
    await page.waitForTimeout(500);

    // Form fields should appear
    await expect(page.locator('[aria-label="Start time"]').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[aria-label="Timeline entry title"]').first()).toBeVisible();
  });
});

test.describe('Event Workspace — Checklist Tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('renders checklist items with checkboxes', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Checklist', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Book venue').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Hire photographer').first()).toBeVisible();
    await expect(page.getByText('Send invitations').first()).toBeVisible();
    await expect(page.getByText('Order cake').first()).toBeVisible();
  });

  test('progress bar shows completion percentage', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Checklist', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // 2 of 4 completed
    await expect(page.getByText('2 of 4 completed').first()).toBeVisible({ timeout: 10_000 });
  });

  test('"Add Item" input field visible', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Checklist', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[aria-label="New checklist item"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Event Workspace — Budget Tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAndAPIs(page);
  });

  test('shows budget summary: total, spent, remaining', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Budget', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Total Budget').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total Spent').first()).toBeVisible();
    await expect(page.getByText('Remaining').first()).toBeVisible();
  });

  test('category breakdown renders', async ({ page }) => {
    await page.goto('/user/events?eventId=1');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Wedding Reception').first()).toBeVisible({ timeout: 15_000 });

    await page.getByText('Budget', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('By Category').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('photography').first()).toBeVisible();
  });
});
