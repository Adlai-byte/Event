# Phase 2: Deposit/Balance Payments + Cancellation Policies — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Providers define deposit percentages and cancellation policies per service. Users pay deposit at booking, balance before event. Cancellations trigger automated refund calculations.

**Architecture:** New `cancellation_policy` table (provider-owned, JSON rules). New `payment_schedule` table tracks deposit/balance due dates. Extend `payment` with `p_type` enum. Extend `booking` with deposit tracking and policy snapshot. Backend: cancellation policy CRUD service/controller/routes + deposit/balance payment endpoints + refund calculation. Frontend: policy editor view, payment modal split, booking card badges, cancel flow.

**Tech Stack:** MySQL (migrations), Express.js routes, React Native/Expo frontend, `useBreakpoints` for responsive, `@tanstack/react-query` for data fetching, existing `apiClient` for HTTP, PayMongo integration for online payments.

**Note:** Phase 1 (provider availability) is complete. The `s_deposit_percent` and `s_cancellation_policy_id` columns already exist on the `service` table from Phase 1 migration.

---

## Task 1: Database Migration — New Tables & Extended Columns

**Files:**
- Create: `server/database/migrations/002-deposit-payments.sql`
- Modify: `server/database/schema.sql` — add new table definitions

**Step 1: Write the migration SQL**

```sql
-- Migration: Deposit/Balance Payments + Cancellation Policies
-- Date: 2026-03-02
-- Phase 2

-- 1. New table: cancellation_policy
CREATE TABLE IF NOT EXISTS `cancellation_policy` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `cp_provider_id` INT(11) NOT NULL,
    `cp_name` VARCHAR(100) NOT NULL,
    `cp_deposit_percent` DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    `cp_rules` JSON NOT NULL,
    -- rules format: [{"days_before": 30, "refund_percent": 100}, {"days_before": 7, "refund_percent": 50}, {"days_before": 0, "refund_percent": 0}]
    `cp_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `cp_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_provider` (`cp_provider_id`),
    FOREIGN KEY (`cp_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. New table: payment_schedule
CREATE TABLE IF NOT EXISTS `payment_schedule` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ps_booking_id` INT(11) NOT NULL,
    `ps_type` ENUM('deposit', 'balance') NOT NULL,
    `ps_amount` DECIMAL(10,2) NOT NULL,
    `ps_due_date` DATE NOT NULL,
    `ps_status` ENUM('pending', 'paid', 'overdue', 'waived') NOT NULL DEFAULT 'pending',
    `ps_payment_id` INT(11) DEFAULT NULL,
    `ps_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_booking` (`ps_booking_id`),
    INDEX `idx_status` (`ps_status`),
    INDEX `idx_due_date` (`ps_due_date`),
    FOREIGN KEY (`ps_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE CASCADE,
    FOREIGN KEY (`ps_payment_id`) REFERENCES `payment`(`idpayment`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Extend payment table with type column
ALTER TABLE `payment`
    ADD COLUMN IF NOT EXISTS `p_type` ENUM('deposit', 'balance', 'full', 'refund') NOT NULL DEFAULT 'full' AFTER `p_amount`;

-- 4. Extend booking table with deposit tracking
ALTER TABLE `booking`
    ADD COLUMN IF NOT EXISTS `b_deposit_paid` TINYINT(1) NOT NULL DEFAULT 0 AFTER `b_total_cost`,
    ADD COLUMN IF NOT EXISTS `b_balance_due_date` DATE DEFAULT NULL AFTER `b_deposit_paid`,
    ADD COLUMN IF NOT EXISTS `b_cancellation_policy_snapshot` JSON DEFAULT NULL AFTER `b_balance_due_date`;
```

**Step 2: Update schema.sql with new table definitions**

Add the `cancellation_policy` and `payment_schedule` table definitions to `server/database/schema.sql`.

**Step 3: Commit**

```bash
git add server/database/migrations/002-deposit-payments.sql server/database/schema.sql
git commit -m "feat(db): add Phase 2 migration — cancellation policies, payment schedule, deposit tracking"
```

---

## Task 2: Cancellation Policy Service Layer

**Files:**
- Create: `server/svc/cancellationPolicyService.js`

**Step 1: Write the service**

Functions needed:

```javascript
const { getPool } = require('../db');

// Helper: get provider ID from email
async function getProviderIdByEmail(email) { /* reuse pattern from availabilityService */ }

// CRUD operations
async function createPolicy(providerEmail, name, depositPercent, rules) {
  // Validate: rules is array of { days_before: number, refund_percent: number }
  // Validate: rules sorted descending by days_before, refund_percent 0-100
  // Insert into cancellation_policy
  // Return: { id, name, depositPercent, rules }
}

async function listPolicies(providerEmail) {
  // SELECT * FROM cancellation_policy WHERE cp_provider_id = ?
  // Return array of policies with parsed JSON rules
}

async function getPolicy(policyId) {
  // SELECT by id, parse JSON rules
}

async function updatePolicy(policyId, providerEmail, name, depositPercent, rules) {
  // Verify ownership (cp_provider_id matches provider)
  // Update name, deposit_percent, rules
}

async function deletePolicy(policyId, providerEmail) {
  // Verify ownership
  // Check no services reference this policy (optional: warn or cascade)
  // DELETE FROM cancellation_policy WHERE id = ? AND cp_provider_id = ?
}

// Refund calculation
function calculateRefund(policySnapshot, totalPaid, eventDate) {
  // policySnapshot: { name, depositPercent, rules: [...] }
  // totalPaid: amount the user has paid so far
  // eventDate: the booking's event date
  // 1. Calculate days until event: daysUntil = floor((eventDate - now) / (1000*60*60*24))
  // 2. Sort rules descending by days_before
  // 3. Find first rule where days_before <= daysUntil
  // 4. refundAmount = totalPaid * (rule.refund_percent / 100)
  // 5. Return: { refundAmount, refundPercent: rule.refund_percent, daysUntilEvent, ruleName }
  // If no rule matches (shouldn't happen if rules include days_before=0), return 0 refund
}
```

**Step 2: Commit**

```bash
git add server/svc/cancellationPolicyService.js
git commit -m "feat(api): add cancellation policy service layer"
```

---

## Task 3: Cancellation Policy Controller & Routes

**Files:**
- Create: `server/controllers/cancellationPolicyController.js`
- Create: `server/routes/cancellationPolicies.js`
- Modify: `server/index.js` — mount new route

**Step 1: Write the controller**

Thin controller following the pattern in `availabilityController.js`:
```javascript
const policyService = require('../svc/cancellationPolicyService');
const { sendSuccess, sendError } = require('../lib/response');

const ctrl = {
  async createPolicy(req, res) { /* extract body, call service, return */ },
  async listPolicies(req, res) { /* email from req.user, call service */ },
  async updatePolicy(req, res) { /* id from params, body data, call service */ },
  async deletePolicy(req, res) { /* id from params, call service */ },
};
```

**Step 2: Write the routes**

```javascript
const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const ctrl = require('../controllers/cancellationPolicyController');

const router = Router();

// All routes require provider auth
router.post('/provider/cancellation-policies',
  authMiddleware, requireRole('provider', 'admin'),
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('depositPercent').isFloat({ min: 0, max: 100 }),
  body('rules').isArray({ min: 1 }),
  body('rules.*.days_before').isInt({ min: 0 }),
  body('rules.*.refund_percent').isFloat({ min: 0, max: 100 }),
  validate,
  ctrl.createPolicy
);

router.get('/provider/cancellation-policies',
  authMiddleware, requireRole('provider', 'admin'),
  ctrl.listPolicies
);

router.put('/provider/cancellation-policies/:id',
  authMiddleware, requireRole('provider', 'admin'),
  param('id').isInt({ min: 1 }),
  body('name').optional().isString().isLength({ min: 1, max: 100 }),
  body('depositPercent').optional().isFloat({ min: 0, max: 100 }),
  body('rules').optional().isArray({ min: 1 }),
  body('rules.*.days_before').optional().isInt({ min: 0 }),
  body('rules.*.refund_percent').optional().isFloat({ min: 0, max: 100 }),
  validate,
  ctrl.updatePolicy
);

router.delete('/provider/cancellation-policies/:id',
  authMiddleware, requireRole('provider', 'admin'),
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.deletePolicy
);

module.exports = router;
```

**Step 3: Mount in index.js**

```javascript
const cancellationPolicyRoutes = require('./routes/cancellationPolicies');
app.use('/api', cancellationPolicyRoutes);
```

**Step 4: Commit**

```bash
git add server/controllers/cancellationPolicyController.js server/routes/cancellationPolicies.js server/index.js
git commit -m "feat(api): add cancellation policy CRUD endpoints"
```

---

## Task 4: Deposit/Balance Payment Service Functions

**Files:**
- Modify: `server/svc/bookingService.js` — add deposit/balance payment functions

**Step 1: Add payment schedule creation to booking flow**

In `createBooking()`, after the booking is inserted, create payment_schedule entries:

```javascript
// After booking insert, if service has deposit < 100%:
const service = await getServicePaymentConfig(serviceId);
// service.s_deposit_percent, service.s_cancellation_policy_id

if (service.s_deposit_percent < 100 && service.s_deposit_percent > 0) {
  const depositAmount = Math.round(calculatedCost * (service.s_deposit_percent / 100) * 100) / 100;
  const balanceAmount = Math.round((calculatedCost - depositAmount) * 100) / 100;
  const balanceDueDate = new Date(eventDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 3); // 3 days before event

  // Insert payment_schedule rows
  await pool.query(
    'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
    [bookingId, 'deposit', depositAmount, new Date().toISOString().split('T')[0]]
  );
  await pool.query(
    'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
    [bookingId, 'balance', balanceAmount, balanceDueDate.toISOString().split('T')[0]]
  );

  // Update booking with balance due date
  await pool.query(
    'UPDATE booking SET b_balance_due_date = ? WHERE idbooking = ?',
    [balanceDueDate.toISOString().split('T')[0], bookingId]
  );

  // Snapshot the cancellation policy onto the booking
  if (service.s_cancellation_policy_id) {
    const policy = await cancellationPolicyService.getPolicy(service.s_cancellation_policy_id);
    await pool.query(
      'UPDATE booking SET b_cancellation_policy_snapshot = ? WHERE idbooking = ?',
      [JSON.stringify({ name: policy.cp_name, depositPercent: policy.cp_deposit_percent, rules: policy.cp_rules }), bookingId]
    );
  }
} else {
  // Full payment: single payment_schedule entry
  await pool.query(
    'INSERT INTO payment_schedule (ps_booking_id, ps_type, ps_amount, ps_due_date) VALUES (?, ?, ?, ?)',
    [bookingId, 'full', calculatedCost, new Date().toISOString().split('T')[0]]
  );
}
```

**Step 2: Add new service functions**

```javascript
// Get payment schedule for a booking
async function getPaymentSchedule(bookingId) {
  const [rows] = await pool.query(
    `SELECT ps.*, p.p_status as payment_status, p.p_paid_at
     FROM payment_schedule ps
     LEFT JOIN payment p ON ps.ps_payment_id = p.idpayment
     WHERE ps.ps_booking_id = ?
     ORDER BY ps.ps_type = 'deposit' DESC, ps.ps_due_date ASC`,
    [bookingId]
  );
  return rows;
}

// Pay deposit
async function payDeposit(bookingId, userEmail, paymentMethod) {
  // 1. Get booking + payment_schedule for deposit
  // 2. Verify deposit not already paid
  // 3. If PayMongo: create checkout session for deposit amount
  // 4. If cash: create payment record with p_type='deposit', p_status='pending'
  // 5. Update payment_schedule: ps_status='paid', ps_payment_id=paymentId
  // 6. Update booking: b_deposit_paid=1, b_deposit_paid_at=NOW()
  // 7. If deposit paid, auto-confirm booking (b_status='confirmed')
  // 8. Return { paymentId, amount, checkoutUrl? }
}

// Pay balance
async function payBalance(bookingId, userEmail, paymentMethod) {
  // 1. Verify deposit is paid first
  // 2. Get balance payment_schedule entry
  // 3. Create payment with p_type='balance'
  // 4. Update payment_schedule
  // 5. Return { paymentId, amount, checkoutUrl? }
}

// Get refund estimate (preview before cancelling)
async function getRefundEstimate(bookingId, userEmail) {
  // 1. Get booking with cancellation_policy_snapshot
  // 2. Get total paid (sum of completed payments)
  // 3. Calculate refund using cancellationPolicyService.calculateRefund()
  // 4. Return { refundAmount, refundPercent, daysUntilEvent, policyName }
}

// Cancel booking with refund
async function cancelBooking(bookingId, userEmail, reason) {
  // 1. Get booking, verify user owns it
  // 2. Calculate refund
  // 3. If refund > 0: create payment record with p_type='refund', negative amount
  // 4. Update booking: b_status='cancelled', b_cancellation_reason=reason
  // 5. Waive any pending payment_schedule entries
  // 6. Emit socket events
  // 7. Return { refundAmount, message }
}
```

**Step 3: Commit**

```bash
git add server/svc/bookingService.js
git commit -m "feat(api): add deposit/balance payment and cancellation functions"
```

---

## Task 5: Deposit/Balance & Cancellation Routes

**Files:**
- Modify: `server/controllers/bookingController.js` — add new handlers
- Modify: `server/routes/bookings.js` — add new endpoints

**Step 1: Add controller handlers**

```javascript
// GET /bookings/:bookingId/payment-schedule
async function getPaymentSchedule(req, res) { /* ... */ }

// POST /bookings/:bookingId/pay-deposit
async function payDeposit(req, res) { /* body: { paymentMethod: 'paymongo'|'cash' } */ }

// POST /bookings/:bookingId/pay-balance
async function payBalance(req, res) { /* body: { paymentMethod: 'paymongo'|'cash' } */ }

// GET /bookings/:bookingId/refund-estimate
async function getRefundEstimate(req, res) { /* ... */ }

// POST /bookings/:bookingId/cancel
async function cancelBooking(req, res) { /* body: { reason?: string } */ }
```

**Step 2: Add routes**

```javascript
// Payment schedule
router.get('/bookings/:bookingId/payment-schedule',
  authMiddleware,
  param('bookingId').isInt({ min: 1 }),
  validate,
  ctrl.getPaymentSchedule
);

// Deposit payment
router.post('/bookings/:bookingId/pay-deposit',
  authMiddleware,
  param('bookingId').isInt({ min: 1 }),
  body('paymentMethod').isIn(['paymongo', 'cash']),
  validate,
  ctrl.payDeposit
);

// Balance payment
router.post('/bookings/:bookingId/pay-balance',
  authMiddleware,
  param('bookingId').isInt({ min: 1 }),
  body('paymentMethod').isIn(['paymongo', 'cash']),
  validate,
  ctrl.payBalance
);

// Refund estimate
router.get('/bookings/:bookingId/refund-estimate',
  authMiddleware,
  param('bookingId').isInt({ min: 1 }),
  validate,
  ctrl.getRefundEstimate
);

// Cancel with refund
router.post('/bookings/:bookingId/cancel',
  authMiddleware,
  param('bookingId').isInt({ min: 1 }),
  body('reason').optional().isString().isLength({ max: 500 }),
  validate,
  ctrl.cancelBooking
);
```

**Step 3: Commit**

```bash
git add server/controllers/bookingController.js server/routes/bookings.js
git commit -m "feat(api): add deposit/balance payment and cancellation endpoints"
```

---

## Task 6: Frontend — Cancellation Policy Hooks & Provider Editor

**Files:**
- Create: `mvc/hooks/useCancellationPolicies.ts`
- Create: `mvc/views/provider/CancellationPoliciesView.tsx`
- Create: `mvc/views/provider/CancellationPoliciesView.styles.ts`
- Create: `app/provider/cancellation-policies.tsx` — route wrapper
- Modify: `mvc/components/layout/Sidebar.tsx` — add nav item
- Modify: `mvc/components/layout/AppLayout.tsx` — add mobile nav item
- Modify: `app/provider/_layout.tsx` — add to routeTitleMap

**Step 1: Write the hooks**

```typescript
// mvc/hooks/useCancellationPolicies.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface CancellationRule {
  days_before: number;
  refund_percent: number;
}

export interface CancellationPolicy {
  id: number;
  name: string;
  depositPercent: number;
  rules: CancellationRule[];
  createdAt: string;
  updatedAt: string;
}

export function useCancellationPolicies() {
  return useQuery({
    queryKey: ['cancellation-policies'],
    queryFn: () => apiClient.get<CancellationPolicy[]>('/provider/cancellation-policies'),
  });
}

export function useCreatePolicyMutation() { /* POST, invalidate */ }
export function useUpdatePolicyMutation() { /* PUT, invalidate */ }
export function useDeletePolicyMutation() { /* DELETE, invalidate */ }
```

**Step 2: Write the provider view**

CancellationPoliciesView: List policies as cards, "Create Policy" button opens inline form.

Each policy card shows:
- Name
- Deposit percentage
- Rules table (days before → refund %)
- Edit/Delete buttons

Create/Edit form:
- Name input
- Deposit percentage slider/input (0-100)
- Rules editor: rows of [days_before input] → [refund_percent input], add/remove rows
- Save/Cancel buttons

Use `createStyles(isMobile, screenWidth)` pattern, theme tokens, accessibility.

**Step 3: Wire navigation**

- Sidebar: `{ key: 'cancellation-policies', label: 'Policies', icon: 'shield' }` after availability
- AppLayout mobile: same
- _layout.tsx: `'cancellation-policies': 'Cancellation Policies'`
- Route wrapper: `app/provider/cancellation-policies.tsx`

**Step 4: Commit**

```bash
git add mvc/hooks/useCancellationPolicies.ts
git add mvc/views/provider/CancellationPoliciesView.tsx mvc/views/provider/CancellationPoliciesView.styles.ts
git add app/provider/cancellation-policies.tsx
git add mvc/components/layout/Sidebar.tsx mvc/components/layout/AppLayout.tsx app/provider/_layout.tsx
git commit -m "feat(frontend): add cancellation policy management view"
```

---

## Task 7: Frontend — Service Form Policy Selector

**Files:**
- Modify: `mvc/components/services/ServiceFormTab.tsx` — add policy dropdown and deposit % display
- Modify: `mvc/hooks/useServiceForm.ts` — add cancellationPolicyId to form state

**Step 1: Add policy selector to service creation/edit form**

In the ServiceFormTab, after existing fields, add:
- Dropdown: "Cancellation Policy" — populated from `useCancellationPolicies()`
- When a policy is selected, auto-fill deposit % from the policy
- Display: "Deposit: X% (₱Y of base price)"
- Option: "No policy (100% upfront)" as default

**Step 2: Update useServiceForm to include cancellationPolicyId**

The form state should include `cancellationPolicyId: number | null` and send it when creating/updating the service.

**Step 3: Commit**

```bash
git add mvc/components/services/ServiceFormTab.tsx mvc/hooks/useServiceForm.ts
git commit -m "feat(frontend): add cancellation policy selector to service form"
```

---

## Task 8: Frontend — Payment Modal Deposit/Balance Split

**Files:**
- Modify: `mvc/components/PaymentModal.tsx` — show deposit vs balance amounts
- Create: `mvc/hooks/usePaymentSchedule.ts` — hook for payment schedule

**Step 1: Write the payment schedule hook**

```typescript
// mvc/hooks/usePaymentSchedule.ts
export interface PaymentScheduleItem {
  id: number;
  type: 'deposit' | 'balance';
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paymentId: number | null;
}

export function usePaymentSchedule(bookingId: number) {
  return useQuery({
    queryKey: ['payment-schedule', bookingId],
    queryFn: () => apiClient.get<PaymentScheduleItem[]>(`/bookings/${bookingId}/payment-schedule`),
    enabled: !!bookingId,
  });
}

export function usePayDepositMutation() {
  /* POST /bookings/:id/pay-deposit, invalidate payment-schedule + user-bookings */
}

export function usePayBalanceMutation() {
  /* POST /bookings/:id/pay-balance, invalidate payment-schedule + user-bookings */
}

export function useRefundEstimate(bookingId: number) {
  return useQuery({
    queryKey: ['refund-estimate', bookingId],
    queryFn: () => apiClient.get<{ refundAmount: number; refundPercent: number; daysUntilEvent: number }>(`/bookings/${bookingId}/refund-estimate`),
    enabled: !!bookingId,
  });
}

export function useCancelBookingMutation() {
  /* POST /bookings/:id/cancel, invalidate user-bookings */
}
```

**Step 2: Update PaymentModal**

Current PaymentModal shows a single total amount. Update to:

1. Fetch `usePaymentSchedule(bookingId)` to get deposit/balance breakdown
2. If deposit is pending: show "Pay Deposit ₱X (Y% of ₱Total)" with payment method choice
3. If deposit is paid and balance is pending: show "Pay Balance ₱X" with payment method choice
4. If all paid: show "Fully Paid" status
5. Show cancellation policy summary at bottom if available
6. "Pay Full Amount" button always available (combines deposit + balance)

**Step 3: Commit**

```bash
git add mvc/hooks/usePaymentSchedule.ts mvc/components/PaymentModal.tsx
git commit -m "feat(frontend): update payment modal with deposit/balance split"
```

---

## Task 9: Frontend — Booking Card Badges & Cancel Flow

**Files:**
- Modify: `mvc/views/user/BookingsView.tsx` (or wherever booking cards render) — add payment status badges
- Create: `mvc/components/CancelBookingModal.tsx` — cancellation flow with refund preview

**Step 1: Add payment status badges to booking cards**

On each booking card, show contextual badge:
- "Deposit Due ₱X" (orange badge) — when deposit pending
- "Deposit Paid — Balance ₱X due by [date]" (blue badge) — after deposit, before balance
- "Fully Paid" (green badge) — all payments complete
- "Cancelled — Refund ₱X" (red badge) — cancelled bookings

**Step 2: Create CancelBookingModal**

```typescript
interface CancelBookingModalProps {
  visible: boolean;
  bookingId: number;
  serviceName: string;
  onClose: () => void;
  onCancelled: () => void;
}
```

Flow:
1. Fetch refund estimate with `useRefundEstimate(bookingId)`
2. Display: "Cancel booking for {serviceName}?"
3. Show refund calculation: "You will receive ₱X refund (Y% of amount paid)"
4. Show policy details: "Cancellation {Z} days before event → Y% refund"
5. Optional reason text input
6. "Confirm Cancellation" button → calls cancel mutation
7. Success: close modal, show success toast

**Step 3: Add cancel button to booking cards**

On pending/confirmed bookings, show "Cancel Booking" button that opens the CancelBookingModal.

**Step 4: Commit**

```bash
git add mvc/components/CancelBookingModal.tsx
git add mvc/views/user/BookingsView.tsx
git commit -m "feat(frontend): add booking payment badges and cancellation flow"
```

---

## Task 10: Frontend — Service Details Deposit & Policy Display

**Files:**
- Modify: `mvc/views/user/ServiceDetailsView.tsx` — show deposit % and cancellation policy

**Step 1: Display deposit and policy info on service details**

In the service details view, below the pricing section, add:
- "Deposit: X% required at booking" (if < 100%)
- "Cancellation Policy: [policy name]" with expandable rules table
- Rules display: "30+ days before: 100% refund", "7-29 days: 50% refund", "< 7 days: No refund"

This data comes from the service's `s_deposit_percent` and linked cancellation policy. The service details API should return this info. If not, make a separate call or extend the service response.

**Step 2: Commit**

```bash
git add mvc/views/user/ServiceDetailsView.tsx
git commit -m "feat(frontend): show deposit and cancellation policy on service details"
```

---

## Task 11: TypeScript Verification & Final Cleanup

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Manual smoke test checklist**

- [ ] Provider can create a cancellation policy with name, deposit %, and refund rules
- [ ] Provider can edit/delete policies
- [ ] Provider can assign a policy to a service via service form
- [ ] Service details shows deposit % and policy info to users
- [ ] Booking creates payment_schedule entries (deposit + balance)
- [ ] Payment modal shows deposit amount for new bookings
- [ ] User can pay deposit → booking becomes confirmed
- [ ] User can pay balance after deposit → booking fully paid
- [ ] Booking card shows correct payment status badge
- [ ] User can preview refund estimate before cancelling
- [ ] User can cancel → refund calculated correctly based on days before event
- [ ] Cancelled booking shows refund badge
- [ ] Full payment option works (bypass deposit split)
- [ ] Services with 100% deposit (default) work as before (backward compatible)

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 — deposit/balance payments and cancellation policies"
```
