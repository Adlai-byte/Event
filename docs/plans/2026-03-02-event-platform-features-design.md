# E-Vent Platform Features Design

**Date:** 2026-03-02
**Scope:** Backend refactor + Provider availability + Deposit payments + Event workspace

---

## Overview

Four sequential phases to transform E-Vent from a basic booking marketplace into a full event planning platform. Each phase builds on the previous, shipping stable features incrementally.

- **Phase 0:** Backend refactor (clean foundation)
- **Phase 1:** Provider availability system
- **Phase 2:** Deposit/balance payments + cancellation policies
- **Phase 3:** Event workspace (full planner)
- **Phase 4:** Integration pass

---

## Phase 0: Backend Refactor

### Goal
Break up `server/index.js` into clean route modules. Add global middleware for rate limiting, validation, and error handling.

### Current State
`index.js` is 176 lines, mostly mounting already-extracted route files. Remaining inline handlers need extraction.

### Work
- Verify `index.js` only contains app setup, middleware, and route mounts
- Extract any remaining inline route handlers into `server/routes/`
- Add global rate limiting middleware (currently only on a few endpoints)
- Add reusable input validation middleware (`validate()` wrapper)
- Add centralized error handling middleware
- Add request logging middleware

### Files
- `server/index.js` — slim down to pure setup/mounts
- `server/middleware/rateLimit.js` — new
- `server/middleware/validate.js` — new
- `server/middleware/errorHandler.js` — new

---

## Phase 1: Provider Availability System

### Goal
Providers manage their schedule (blocked dates, recurring availability). Users see real-time availability before booking. Search can filter by available date.

### Database

**New table: `provider_blocked_date`**
```sql
CREATE TABLE provider_blocked_date (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pbd_provider_id INT NOT NULL,
  pbd_date DATE NOT NULL,
  pbd_reason VARCHAR(255),
  pbd_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pbd_provider_id) REFERENCES user(iduser) ON DELETE CASCADE,
  UNIQUE KEY unique_provider_date (pbd_provider_id, pbd_date)
);
```

**Extend: `service_availability`**
- Add `sa_specific_date DATE NULL` column for date-specific overrides (e.g., "available on Dec 25 despite being a weekday off")
- Existing `sa_day_of_week` continues to handle recurring weekly schedule

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/provider/availability/blocked-dates` | provider | List blocked dates |
| POST | `/api/provider/availability/blocked-dates` | provider | Block a date or date range |
| DELETE | `/api/provider/availability/blocked-dates/:id` | provider | Unblock a date |
| GET | `/api/provider/availability/schedule` | provider | Get recurring weekly schedule |
| PUT | `/api/provider/availability/schedule` | provider | Update recurring weekly schedule |
| GET | `/api/services/:id/availability/check` | public | Check if available on specific date (`?date=YYYY-MM-DD`) |
| GET | `/api/services/:id/availability/calendar` | public | Full month view (`?month=YYYY-MM`) |

### Availability Logic
A service is **available** on a given date if:
1. The provider has NOT blocked that date in `provider_blocked_date`
2. The service's `service_availability` for that day-of-week has `sa_is_available = 1`
3. OR there's a specific date override (`sa_specific_date = date AND sa_is_available = 1`)
4. No confirmed booking already exists for that provider on that date (auto-block from bookings)

### Frontend

**Provider side:**
- New "Availability" tab in provider dashboard
- Calendar UI showing blocked dates (red), available (green), booked (blue)
- Click to block/unblock dates
- Recurring schedule editor (toggle days of week, set hours)

**User side:**
- Service details: calendar shows availability before booking
- BookingWeekCalendar: grey out unavailable dates
- Search filter: "Available on [date picker]" filter in FilterPanel
- API: add `availableDate` query param to `GET /api/services`

---

## Phase 2: Deposit/Balance Payments + Cancellation Policies

### Goal
Providers define deposit percentages and cancellation policies per service. Users pay deposit at booking, balance before event. Cancellations trigger automated refund calculations.

### Database

**New table: `cancellation_policy`**
```sql
CREATE TABLE cancellation_policy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cp_provider_id INT NOT NULL,
  cp_name VARCHAR(100) NOT NULL,
  cp_deposit_percent DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  cp_rules JSON NOT NULL,
  -- rules format: [{"days_before": 30, "refund_percent": 100}, {"days_before": 7, "refund_percent": 50}, {"days_before": 0, "refund_percent": 0}]
  cp_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cp_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cp_provider_id) REFERENCES user(iduser) ON DELETE CASCADE
);
```

**New table: `payment_schedule`**
```sql
CREATE TABLE payment_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ps_booking_id INT NOT NULL,
  ps_type ENUM('deposit', 'balance') NOT NULL,
  ps_amount DECIMAL(10,2) NOT NULL,
  ps_due_date DATE NOT NULL,
  ps_status ENUM('pending', 'paid', 'overdue', 'waived') DEFAULT 'pending',
  ps_payment_id INT NULL,
  ps_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ps_booking_id) REFERENCES booking(idbooking) ON DELETE CASCADE,
  FOREIGN KEY (ps_payment_id) REFERENCES payment(idpayment) ON DELETE SET NULL
);
```

**Extend existing tables:**
- `service`: add `s_cancellation_policy_id INT NULL` FK, `s_deposit_percent DECIMAL(5,2) DEFAULT 100.00`
- `payment`: add `p_type ENUM('deposit', 'balance', 'full', 'refund') DEFAULT 'full'`
- `booking`: add `b_deposit_paid TINYINT DEFAULT 0`, `b_balance_due_date DATE NULL`, `b_cancellation_policy_snapshot JSON NULL`

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/provider/cancellation-policies` | provider | Create policy |
| GET | `/api/provider/cancellation-policies` | provider | List provider's policies |
| PUT | `/api/provider/cancellation-policies/:id` | provider | Update policy |
| DELETE | `/api/provider/cancellation-policies/:id` | provider | Delete policy |
| POST | `/api/bookings/:id/pay-deposit` | user | Pay deposit portion via PayMongo |
| POST | `/api/bookings/:id/pay-balance` | user | Pay remaining balance |
| GET | `/api/bookings/:id/payment-schedule` | user/provider | View payment schedule |
| POST | `/api/bookings/:id/cancel` | user | Cancel with automated refund calculation |
| GET | `/api/bookings/:id/refund-estimate` | user | Preview refund amount before cancelling |

### Payment Flow
1. User books a service → system creates booking + payment_schedule (deposit + balance entries)
2. Deposit payment due immediately — booking stays "pending" until deposit paid
3. After deposit paid → booking becomes "confirmed"
4. Balance due date = event_date minus 3 days (configurable)
5. Notifications sent at: balance due in 7 days, 3 days, 1 day, overdue
6. Full payment option always available (pay deposit + balance in one go)

### Cancellation Flow
1. User requests cancellation
2. System calculates refund based on `b_cancellation_policy_snapshot` rules:
   - Find the rule where `days_before` <= days until event
   - Apply `refund_percent` to the deposit amount paid
3. Show user the refund estimate before confirming
4. On confirm: update booking status to 'cancelled', create refund payment record
5. Actual PayMongo refund via API (if online payment) or mark as "refund pending" (if cash)

### Frontend

**Provider side:**
- Cancellation policy editor: name, deposit %, refund rules table (days before → refund %)
- Service creation/edit: dropdown to select cancellation policy
- Provider booking view: show payment status per booking

**User side:**
- Service details: show deposit % and cancellation policy summary
- Booking flow: show "Pay ₱X deposit now (Y% of total)" vs "Pay full amount"
- Booking card: "Deposit paid — Balance ₱X due by [date]" badge
- Cancel flow: show refund calculation before confirming
- Pay balance button on booking card when balance is due

---

## Phase 3: Event Workspace (Full Planner)

### Goal
Users create events that group multiple bookings. Full planner with budget tracking, day-of timeline, checklist, and vendor overview.

### Database

**New table: `event`**
```sql
CREATE TABLE event (
  idevent INT AUTO_INCREMENT PRIMARY KEY,
  e_user_id INT NOT NULL,
  e_name VARCHAR(255) NOT NULL,
  e_date DATE NOT NULL,
  e_end_date DATE NULL,
  e_location VARCHAR(500),
  e_budget DECIMAL(12,2) DEFAULT 0,
  e_guest_count INT DEFAULT 0,
  e_description TEXT,
  e_status ENUM('planning', 'upcoming', 'in_progress', 'completed', 'cancelled') DEFAULT 'planning',
  e_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  e_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (e_user_id) REFERENCES user(iduser) ON DELETE CASCADE,
  INDEX idx_user (e_user_id),
  INDEX idx_date (e_date),
  INDEX idx_status (e_status)
);
```

**New table: `event_checklist`**
```sql
CREATE TABLE event_checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ec_event_id INT NOT NULL,
  ec_title VARCHAR(255) NOT NULL,
  ec_is_completed TINYINT DEFAULT 0,
  ec_due_date DATE NULL,
  ec_category VARCHAR(100),
  ec_sort_order INT DEFAULT 0,
  ec_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ec_event_id) REFERENCES event(idevent) ON DELETE CASCADE
);
```

**New table: `event_timeline`**
```sql
CREATE TABLE event_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  et_event_id INT NOT NULL,
  et_start_time TIME NOT NULL,
  et_end_time TIME NULL,
  et_title VARCHAR(255) NOT NULL,
  et_description TEXT,
  et_booking_id INT NULL,
  et_sort_order INT DEFAULT 0,
  et_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (et_event_id) REFERENCES event(idevent) ON DELETE CASCADE,
  FOREIGN KEY (et_booking_id) REFERENCES booking(idbooking) ON DELETE SET NULL
);
```

**Extend existing:**
- `booking`: add `b_event_id INT NULL` FK to `event(idevent)` ON DELETE SET NULL

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/events` | user | Create event |
| GET | `/api/events` | user | List user's events |
| GET | `/api/events/:id` | user | Get event details |
| PUT | `/api/events/:id` | user | Update event |
| DELETE | `/api/events/:id` | user | Delete event |
| GET | `/api/events/:id/bookings` | user | All bookings in event |
| POST | `/api/events/:id/bookings/:bookingId` | user | Add existing booking to event |
| DELETE | `/api/events/:id/bookings/:bookingId` | user | Remove booking from event |
| GET | `/api/events/:id/budget` | user | Budget summary |
| POST | `/api/events/:id/checklist` | user | Add checklist item |
| GET | `/api/events/:id/checklist` | user | Get checklist |
| PUT | `/api/events/:id/checklist/:itemId` | user | Update item |
| DELETE | `/api/events/:id/checklist/:itemId` | user | Delete item |
| POST | `/api/events/:id/timeline` | user | Add timeline entry |
| GET | `/api/events/:id/timeline` | user | Get timeline |
| PUT | `/api/events/:id/timeline/:entryId` | user | Update entry |
| DELETE | `/api/events/:id/timeline/:entryId` | user | Delete entry |

### Frontend — New Views

**EventsView** (`mvc/views/user/EventsView.tsx`)
- List of events as cards: name, date, location, budget meter, vendor count, status
- "Create Event" button
- Filter by status (planning/upcoming/completed)
- Navigation item in sidebar/bottom nav

**EventDetailView** (`mvc/views/user/EventDetailView.tsx`)
- Tab-based layout:
  - **Overview**: hero card with name, date, location, guest count. Budget progress bar. Quick stats (vendors booked, checklist progress).
  - **Vendors**: list of booked services with status, payment status (deposit/paid/balance due), provider contact. "Add Service" button to browse marketplace.
  - **Timeline**: visual day-of timeline (vertical). Time blocks with title, description, linked booking. Add/edit/reorder entries.
  - **Checklist**: grouped to-do items. Check off items, add new ones, set due dates. Categories: "Venue", "Catering", "Decoration", etc.
  - **Budget**: total budget vs spent. Breakdown by service category (pie or bar chart). Remaining amount. Per-vendor cost breakdown.

**CreateEventModal** (`mvc/components/events/CreateEventModal.tsx`)
- Fields: name, date, end date (optional), location, budget, guest count, description
- Validation: name and date required

---

## Phase 4: Integration Pass

### Goal
Wire all three features together for a cohesive experience.

### Work
- Booking flow: "Add to event" dropdown when creating a booking
- Event planner: show provider availability when suggesting services
- Budget tracking reflects deposit vs balance payment status
- Notifications: "Balance due in 3 days for [service] in [event name]"
- Dashboard: "Your upcoming events" section
- Event auto-status: transitions planning → upcoming → completed based on dates
- Event creation from booking: "Create event from this booking" action

---

## Technical Decisions

### Why sequential phases
Each phase ships stable, usable features. Availability must exist before deposits make sense (need to know when providers are booked). Deposits must work before events can show meaningful budget tracking.

### Why JSON for cancellation policy snapshots
Policies may change after a booking is made. Snapshotting the policy at booking time ensures the rules that applied when the user booked are the rules used for refund calculation.

### Why nullable event_id on bookings
Bookings should work independently (backward compatible). Users can create events and add existing bookings to them, or book directly into an event.

### Why provider-defined deposit percentages
Maximum flexibility for providers to match their business model. A photographer may want 30% deposit while a venue needs 50%.
