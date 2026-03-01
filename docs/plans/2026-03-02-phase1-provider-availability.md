# Phase 1: Provider Availability System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let providers manage their schedule (blocked dates, recurring availability) and let users see real-time availability before booking, with date-based search filtering.

**Architecture:** New `provider_blocked_date` table for date-specific blocks. Extend existing `service_availability` with `sa_specific_date` for overrides. New `availabilityService.js` + `availabilityController.js` + `availability.js` route. Frontend: provider calendar management view + user-facing availability display in booking flow + search filter.

**Tech Stack:** MySQL (migrations), Express.js routes, React Native/Expo frontend, `useBreakpoints` for responsive, `@tanstack/react-query` for data fetching, existing `apiClient` for HTTP.

**Note:** Phase 0 (backend refactor) is already complete — routes, controllers, services, middleware all exist and are well-separated.

---

## Task 1: Database Migration — New Tables & Columns

**Files:**
- Create: `server/database/migrations/001-provider-availability.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration: Provider Availability System
-- Date: 2026-03-02

-- 1. New table: provider_blocked_date
CREATE TABLE IF NOT EXISTS `provider_blocked_date` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `pbd_provider_id` INT(11) NOT NULL,
    `pbd_date` DATE NOT NULL,
    `pbd_reason` VARCHAR(255) DEFAULT NULL,
    `pbd_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_provider_date` (`pbd_provider_id`, `pbd_date`),
    INDEX `idx_provider` (`pbd_provider_id`),
    INDEX `idx_date` (`pbd_date`),
    FOREIGN KEY (`pbd_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Extend service_availability with specific date override column
ALTER TABLE `service_availability`
    ADD COLUMN `sa_specific_date` DATE DEFAULT NULL AFTER `sa_day_of_week`,
    ADD INDEX `idx_specific_date` (`sa_specific_date`);

-- 3. Add deposit/policy columns to service table (Phase 2 prep, safe to add now)
ALTER TABLE `service`
    ADD COLUMN `s_deposit_percent` DECIMAL(5,2) DEFAULT 100.00 AFTER `s_location_type`,
    ADD COLUMN `s_cancellation_policy_id` INT(11) DEFAULT NULL AFTER `s_deposit_percent`;
```

**Step 2: Run migration**

Run: `mysql -u root -p event < server/database/migrations/001-provider-availability.sql`
Expected: Tables created, columns added, no errors.

**Step 3: Update schema.sql reference**

Add the new table definition and column changes to `server/database/schema.sql` so it stays as the canonical reference.

**Step 4: Commit**

```bash
git add server/database/migrations/ server/database/schema.sql
git commit -m "feat(db): add provider_blocked_date table and availability columns"
```

---

## Task 2: Availability Service Layer

**Files:**
- Create: `server/svc/availabilityService.js`

**Step 1: Write the service**

This service handles all availability logic — blocked dates CRUD, schedule management, and the core availability check algorithm.

```javascript
// server/svc/availabilityService.js
const pool = require('../db');

// ── Blocked Dates ──

async function getBlockedDates(providerEmail, startDate, endDate) {
  // Get provider ID from email
  // Query provider_blocked_date WHERE pbd_provider_id = ? AND pbd_date BETWEEN ? AND ?
  // Return array of { id, date, reason }
}

async function addBlockedDate(providerEmail, date, reason) {
  // Get provider ID from email
  // INSERT INTO provider_blocked_date (pbd_provider_id, pbd_date, pbd_reason)
  // Handle duplicate key (already blocked)
  // Return { id, date, reason }
}

async function addBlockedDateRange(providerEmail, startDate, endDate, reason) {
  // Loop from startDate to endDate, insert each
  // Use INSERT IGNORE to skip duplicates
  // Return count of dates blocked
}

async function removeBlockedDate(providerEmail, blockedDateId) {
  // Verify ownership (provider_id matches)
  // DELETE FROM provider_blocked_date WHERE id = ? AND pbd_provider_id = ?
}

// ── Weekly Schedule ──

async function getSchedule(serviceId) {
  // SELECT * FROM service_availability WHERE sa_service_id = ? AND sa_specific_date IS NULL
  // Return array of { dayOfWeek, startTime, endTime, isAvailable, priceOverride }
}

async function updateSchedule(serviceId, providerEmail, schedule) {
  // Verify provider owns this service
  // DELETE existing weekly entries (sa_specific_date IS NULL)
  // INSERT new entries from schedule array
  // schedule: [{ dayOfWeek: 0-6, startTime, endTime, isAvailable }]
}

// ── Availability Checks ──

async function checkAvailability(serviceId, date) {
  // 1. Get the service's provider_id
  // 2. Check if provider has blocked this date
  // 3. Check if there's a specific date override in service_availability
  // 4. If no override, check the day-of-week schedule
  // 5. Check if any confirmed booking exists for this provider on this date
  // Returns: { available: boolean, reason?: string, schedule?: { startTime, endTime } }
}

async function getMonthCalendar(serviceId, year, month) {
  // For each day in the month:
  //   - Check blocked dates (batch query)
  //   - Check day-of-week schedule
  //   - Check specific date overrides
  //   - Check existing bookings
  // Returns: [{ date: 'YYYY-MM-DD', available: boolean, reason?: string }]
}
```

Key implementation details:
- `checkAvailability` priority: blocked date (highest) > specific date override > day-of-week schedule > existing bookings
- `getMonthCalendar` should batch all queries (one query per type, not per day) for performance
- Provider ID lookup from email: `SELECT iduser FROM user WHERE u_email = ? AND u_role IN ('provider', 'admin')`
- Booking conflict check: `SELECT 1 FROM booking b JOIN booking_service bs ON b.idbooking = bs.bs_booking_id JOIN service s ON bs.bs_service_id = s.idservice WHERE s.s_provider_id = ? AND b.b_event_date = ? AND b.b_status IN ('pending', 'confirmed') LIMIT 1`

**Step 2: Commit**

```bash
git add server/svc/availabilityService.js
git commit -m "feat(api): add availability service layer"
```

---

## Task 3: Availability Controller

**Files:**
- Create: `server/controllers/availabilityController.js`

**Step 1: Write the controller**

Thin controller that validates input and delegates to the service. Follow the existing pattern in `server/controllers/bookingController.js`.

```javascript
// server/controllers/availabilityController.js
const availabilityService = require('../svc/availabilityService');
const { sendSuccess, sendError } = require('../lib/response');

const availabilityController = {
  // GET /api/provider/availability/blocked-dates?startDate=&endDate=
  async getBlockedDates(req, res) { /* ... */ },

  // POST /api/provider/availability/blocked-dates  body: { date, reason } or { startDate, endDate, reason }
  async addBlockedDate(req, res) { /* ... */ },

  // DELETE /api/provider/availability/blocked-dates/:id
  async removeBlockedDate(req, res) { /* ... */ },

  // GET /api/provider/availability/schedule?serviceId=
  async getSchedule(req, res) { /* ... */ },

  // PUT /api/provider/availability/schedule  body: { serviceId, schedule: [...] }
  async updateSchedule(req, res) { /* ... */ },

  // GET /api/services/:id/availability/check?date=YYYY-MM-DD
  async checkAvailability(req, res) { /* ... */ },

  // GET /api/services/:id/availability/calendar?month=YYYY-MM
  async getMonthCalendar(req, res) { /* ... */ },
};
```

Validation rules (use `express-validator`):
- `date`: must be valid ISO date, must be today or future for blocking
- `startDate/endDate`: valid dates, endDate >= startDate, max range 365 days
- `serviceId`: must be positive integer
- `month`: must match `YYYY-MM` format
- `schedule[].dayOfWeek`: 0-6
- `schedule[].startTime/endTime`: valid HH:MM format

**Step 2: Commit**

```bash
git add server/controllers/availabilityController.js
git commit -m "feat(api): add availability controller"
```

---

## Task 4: Availability Routes

**Files:**
- Create: `server/routes/availability.js`
- Modify: `server/index.js` (add route mount)

**Step 1: Write the routes file**

```javascript
// server/routes/availability.js
const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');
const { roleAuth } = require('../middleware/roleAuth');
const ctrl = require('../controllers/availabilityController');

const router = Router();

// ── Provider endpoints (require auth + provider/admin role) ──
router.get('/provider/availability/blocked-dates',
  authMiddleware, roleAuth('provider', 'admin'),
  ctrl.getBlockedDates
);

router.post('/provider/availability/blocked-dates',
  authMiddleware, roleAuth('provider', 'admin'),
  body('date').optional().isISO8601(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('reason').optional().isString().isLength({ max: 255 }),
  validate,
  ctrl.addBlockedDate
);

router.delete('/provider/availability/blocked-dates/:id',
  authMiddleware, roleAuth('provider', 'admin'),
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.removeBlockedDate
);

router.get('/provider/availability/schedule',
  authMiddleware, roleAuth('provider', 'admin'),
  query('serviceId').isInt({ min: 1 }),
  validate,
  ctrl.getSchedule
);

router.put('/provider/availability/schedule',
  authMiddleware, roleAuth('provider', 'admin'),
  body('serviceId').isInt({ min: 1 }),
  body('schedule').isArray({ min: 0, max: 7 }),
  validate,
  ctrl.updateSchedule
);

// ── Public endpoints ──
router.get('/services/:id/availability/check',
  param('id').isInt({ min: 1 }),
  query('date').isISO8601(),
  validate,
  ctrl.checkAvailability
);

router.get('/services/:id/availability/calendar',
  param('id').isInt({ min: 1 }),
  query('month').matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  validate,
  ctrl.getMonthCalendar
);

module.exports = router;
```

**Step 2: Mount in index.js**

Add after the existing route mounts (line 123):
```javascript
const availabilityRoutes = require('./routes/availability');
// ... mount:
app.use('/api', availabilityRoutes);
```

**Step 3: Commit**

```bash
git add server/routes/availability.js server/index.js
git commit -m "feat(api): add availability routes and mount in app"
```

---

## Task 5: Extend Service Search with Date Filter

**Files:**
- Modify: `server/svc/serviceService.js` — `listServices()` function
- Modify: `server/routes/services.js` — add `availableDate` query param

**Step 1: Add `availableDate` filter to `listServices()`**

In `serviceService.js`, the `listServices` function already accepts a `query` object with filters. Add handling for `query.availableDate`:

After building the main services query, post-filter results by availability:
```javascript
if (query.availableDate) {
  // For each service in results, check availability via availabilityService.checkAvailability
  // Filter out unavailable services
  // This is a post-filter since availability involves multiple tables
}
```

Alternative (more performant): add a subquery exclusion:
```sql
-- Exclude services whose provider has blocked this date
AND s.s_provider_id NOT IN (
  SELECT pbd_provider_id FROM provider_blocked_date WHERE pbd_date = ?
)
-- Exclude services with no availability for this day of week
AND (
  EXISTS (SELECT 1 FROM service_availability WHERE sa_service_id = s.idservice AND sa_day_of_week = DAYOFWEEK(?) - 1 AND sa_is_available = 1)
  OR EXISTS (SELECT 1 FROM service_availability WHERE sa_service_id = s.idservice AND sa_specific_date = ? AND sa_is_available = 1)
)
-- Exclude services whose provider already has a confirmed booking on this date
AND s.s_provider_id NOT IN (
  SELECT s2.s_provider_id FROM booking b
  JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
  JOIN service s2 ON bs.bs_service_id = s2.idservice
  WHERE b.b_event_date = ? AND b.b_status IN ('pending', 'confirmed')
)
```

Use the SQL approach for performance — avoids N+1 queries.

**Step 2: Add query param to services route**

In `server/routes/services.js`, the `GET /api/services` route passes `req.query` to the service. Add optional validation:
```javascript
query('availableDate').optional().isISO8601(),
```

**Step 3: Commit**

```bash
git add server/svc/serviceService.js server/routes/services.js
git commit -m "feat(api): add availableDate filter to service search"
```

---

## Task 6: Frontend — Provider Availability Hook

**Files:**
- Create: `mvc/hooks/useProviderAvailability.ts`

**Step 1: Write the hook**

Uses `@tanstack/react-query` and `apiClient` (existing pattern from `mvc/services/apiClient.ts`).

```typescript
// mvc/hooks/useProviderAvailability.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

interface BlockedDate {
  id: number;
  date: string; // YYYY-MM-DD
  reason: string | null;
}

interface ScheduleEntry {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isAvailable: boolean;
}

interface CalendarDay {
  date: string;
  available: boolean;
  reason?: string;
}

// Provider: get blocked dates for a date range
export function useBlockedDates(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['blocked-dates', startDate, endDate],
    queryFn: () => apiClient.get<BlockedDate[]>(
      `/provider/availability/blocked-dates?startDate=${startDate}&endDate=${endDate}`
    ),
    enabled: !!startDate && !!endDate,
  });
}

// Provider: block/unblock dates
export function useBlockDateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date?: string; startDate?: string; endDate?: string; reason?: string }) =>
      apiClient.post('/provider/availability/blocked-dates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });
}

export function useUnblockDateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/provider/availability/blocked-dates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });
}

// Provider: get/update weekly schedule
export function useSchedule(serviceId: number) {
  return useQuery({
    queryKey: ['schedule', serviceId],
    queryFn: () => apiClient.get<ScheduleEntry[]>(
      `/provider/availability/schedule?serviceId=${serviceId}`
    ),
    enabled: !!serviceId,
  });
}

export function useUpdateScheduleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { serviceId: number; schedule: ScheduleEntry[] }) =>
      apiClient.put('/provider/availability/schedule', data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['schedule', vars.serviceId] }),
  });
}

// Public: check single date availability
export function useAvailabilityCheck(serviceId: number, date: string) {
  return useQuery({
    queryKey: ['availability-check', serviceId, date],
    queryFn: () => apiClient.get<{ available: boolean; reason?: string }>(
      `/services/${serviceId}/availability/check?date=${date}`
    ),
    enabled: !!serviceId && !!date,
  });
}

// Public: get month calendar
export function useMonthCalendar(serviceId: number, month: string) {
  return useQuery({
    queryKey: ['availability-calendar', serviceId, month],
    queryFn: () => apiClient.get<CalendarDay[]>(
      `/services/${serviceId}/availability/calendar?month=${month}`
    ),
    enabled: !!serviceId && !!month,
  });
}
```

**Step 2: Commit**

```bash
git add mvc/hooks/useProviderAvailability.ts
git commit -m "feat(frontend): add provider availability hooks"
```

---

## Task 7: Frontend — Provider Availability Management View

**Files:**
- Create: `mvc/views/provider/AvailabilityView.tsx`
- Create: `mvc/views/provider/AvailabilityView.styles.ts`
- Modify: `mvc/components/layout/Sidebar.tsx` — add "Availability" nav item
- Modify: `mvc/components/layout/BottomNav.tsx` — add nav item for mobile
- Modify: `app/provider/availability.tsx` — thin route wrapper (follow existing pattern in `app/`)

**Step 1: Build the view**

Layout: two sections side by side on desktop, stacked on mobile.

**Left/Top: Calendar grid**
- Month view calendar showing each day
- Color coding: green (available), red (blocked), blue (has booking), grey (past)
- Click a day to block/unblock it
- Date range selection (click start → click end to block a range)
- Navigation: previous/next month arrows

**Right/Bottom: Weekly schedule**
- 7 rows (Sun–Sat), each with toggle + start/end time pickers
- Toggle enables/disables that day
- Save button persists schedule

Follow the existing `createStyles(isMobile, screenWidth)` pattern with `useBreakpoints()`.

**Step 2: Add nav items**

In `Sidebar.tsx` and `BottomNav.tsx`, add an "Availability" item for provider role:
- Icon: `Feather` name `"calendar"`
- Label: `"Availability"`
- Route: `"availability"`

Check existing nav items in these files for the exact pattern (they use a `NavItem` type with `icon: keyof typeof Feather.glyphMap`).

**Step 3: Add route wrapper**

Create `app/provider/availability.tsx` following the pattern of other files in `app/provider/`:
```typescript
import { AvailabilityView } from '../../mvc/views/provider/AvailabilityView';
export default AvailabilityView;
```

**Step 4: Wire up in App.tsx**

Add `'availability'` to the provider `mainView` switch in `App.tsx` render logic.

**Step 5: Commit**

```bash
git add mvc/views/provider/AvailabilityView.tsx mvc/views/provider/AvailabilityView.styles.ts
git add mvc/components/layout/Sidebar.tsx mvc/components/layout/BottomNav.tsx
git add app/provider/availability.tsx
git commit -m "feat(frontend): add provider availability management view"
```

---

## Task 8: Frontend — User-Facing Availability in Booking Flow

**Files:**
- Modify: `mvc/components/BookingModal.tsx` — show availability status on calendar dates
- Modify: `mvc/hooks/useBookingSlots.ts` — integrate availability check

**Step 1: Integrate availability into BookingWeekCalendar**

The existing `BookingModal.tsx` already has a `BookingWeekCalendar` for date selection. Modify it to:

1. Fetch the month calendar: `useMonthCalendar(serviceId, currentMonth)`
2. Grey out / disable unavailable dates in the calendar
3. Show a tooltip or badge: "Provider unavailable" on blocked dates
4. Prevent selection of unavailable dates

The calendar component should receive an `availability` prop:
```typescript
interface CalendarDay {
  date: string;
  available: boolean;
  reason?: string;
}
```

Dates where `available === false` get:
- Grey background, no click handler
- Optional tooltip showing `reason`

**Step 2: Add "Available on date" to FilterPanel**

Modify `mvc/components/dashboard/FilterPanel.tsx`:
- Add a date picker input labeled "Available on"
- When set, pass `availableDate` to the search query
- Clear button to remove the filter

Modify `mvc/hooks/useServiceSearch.ts`:
- Add `availableDate` to the URLSearchParams when building the query

**Step 3: Commit**

```bash
git add mvc/components/BookingModal.tsx mvc/hooks/useBookingSlots.ts
git add mvc/components/dashboard/FilterPanel.tsx mvc/hooks/useServiceSearch.ts
git commit -m "feat(frontend): show availability in booking calendar and search filter"
```

---

## Task 9: Integration & Edge Cases

**Files:**
- Modify: `server/svc/bookingService.js` — prevent booking on unavailable dates
- Modify: `server/svc/availabilityService.js` — auto-block on confirmed booking

**Step 1: Booking validation**

In `bookingService.js`, when creating a booking (`createBooking` function), add an availability check:
```javascript
const availability = await availabilityService.checkAvailability(serviceId, eventDate);
if (!availability.available) {
  throw new AppError(`Provider is not available on ${eventDate}: ${availability.reason}`, 409);
}
```

This is a server-side guard — even if the frontend lets a request through, the backend rejects it.

**Step 2: Auto-block on booking confirmation**

When a booking is confirmed (status changes to 'confirmed'), the system should NOT auto-block the date — providers may have multiple services and can handle multiple bookings per day. The availability check already considers existing bookings via the SQL subquery.

However, emit a socket event so the provider's availability calendar updates in real-time:
```javascript
// In bookingService.js, after status change to 'confirmed':
const io = req.app.get('io');
if (io) {
  io.to(`user:${providerEmail}`).emit('availability-update', { date: eventDate });
}
```

And in the frontend `useSocket.ts`, add a listener:
```typescript
socket.on('availability-update', () => {
  queryClient.invalidateQueries({ queryKey: ['availability-calendar'] });
  queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
});
```

**Step 3: Commit**

```bash
git add server/svc/bookingService.js server/svc/availabilityService.js
git add mvc/hooks/useSocket.ts
git commit -m "feat: add booking availability validation and real-time updates"
```

---

## Task 10: TypeScript Verification & Final Cleanup

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Manual smoke test checklist**

- [ ] Provider can view availability calendar
- [ ] Provider can block a date → appears red on calendar
- [ ] Provider can unblock a date → reverts to green
- [ ] Provider can block a date range
- [ ] Provider can set weekly schedule (toggle days, set hours)
- [ ] User sees unavailable dates greyed out in booking modal
- [ ] User cannot select an unavailable date
- [ ] Search with "Available on [date]" filter excludes unavailable services
- [ ] Booking creation fails server-side if provider is unavailable
- [ ] Real-time: when booking confirmed, provider calendar updates

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 — provider availability system"
```
