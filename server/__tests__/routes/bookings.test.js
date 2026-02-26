const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createBooking, createPaymentMethod, createCompletedPayment } = require('../helpers/factories');

let seed;
let adminHeaders;
let providerHeaders;
let clientHeaders;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
  adminHeaders = authAs('admin');
  providerHeaders = authAs('provider');
  clientHeaders = authAs('user');
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// 1. GET /api/bookings — admin-only listing
// ---------------------------------------------------------------------------
describe('GET /api/bookings', () => {
  it('200 — admin can list all bookings', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('403 — regular user is denied', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set(clientHeaders);

    expect(res.status).toBe(403);
  });

  it('401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .get('/api/bookings');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. GET /api/user/bookings
// ---------------------------------------------------------------------------
describe('GET /api/user/bookings', () => {
  it('200 — returns bookings for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/user/bookings')
      .query({ email: 'client@event.test' })
      .set(clientHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('400 — missing email query param', async () => {
    const res = await request(app)
      .get('/api/user/bookings')
      .set(clientHeaders);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. GET /api/user/bookings/count
// ---------------------------------------------------------------------------
describe('GET /api/user/bookings/count', () => {
  it('200 — returns booking count for the user', async () => {
    const res = await request(app)
      .get('/api/user/bookings/count')
      .query({ email: 'client@event.test' })
      .set(clientHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('count');
    expect(typeof res.body.data.count).toBe('number');
  });

  it('400 — missing email query param', async () => {
    const res = await request(app)
      .get('/api/user/bookings/count')
      .set(clientHeaders);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. GET /api/bookings/:id
// ---------------------------------------------------------------------------
describe('GET /api/bookings/:id', () => {
  it('200 — returns the seeded booking by id', async () => {
    const res = await request(app)
      .get(`/api/bookings/${seed.bookingId}`)
      .set(clientHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.booking).toHaveProperty('idbooking', seed.bookingId);
  });

  it('404 — nonexistent booking id', async () => {
    const res = await request(app)
      .get('/api/bookings/999999')
      .set(clientHeaders);

    expect(res.status).toBe(404);
  });

  it('401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .get(`/api/bookings/${seed.bookingId}`);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 5. POST /api/bookings — create booking
// ---------------------------------------------------------------------------
describe('POST /api/bookings', () => {
  const validBody = {
    clientEmail: 'client@event.test',
    serviceId: null, // set in beforeAll
    eventName: 'Test Event',
    eventDate: '2026-07-20',
    startTime: '10:00',
    endTime: '16:00',
    location: 'Davao City',
  };

  beforeAll(() => {
    validBody.serviceId = seed.svc1Id;
  });

  it('200 — creates a booking with valid data', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('400 — missing required fields (no eventName)', async () => {
    const { eventName, ...incomplete } = validBody;
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send(incomplete);

    expect(res.status).toBe(400);
  });

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, clientEmail: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('400 — invalid serviceId (negative)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, serviceId: -1 });

    expect(res.status).toBe(400);
  });

  it('400 — eventName exceeds 200 characters', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, eventName: 'A'.repeat(201) });

    expect(res.status).toBe(400);
  });

  it('400 — invalid eventDate format', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, eventDate: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('400 — invalid startTime format', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, startTime: '25:99' });

    expect(res.status).toBe(400);
  });

  it('400 — location exceeds 500 characters', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(clientHeaders)
      .send({ ...validBody, location: 'X'.repeat(501) });

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send(validBody);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 6. PUT /api/bookings/:id — update booking
// ---------------------------------------------------------------------------
describe('PUT /api/bookings/:id', () => {
  it('200 — updates an existing booking', async () => {
    const res = await request(app)
      .put(`/api/bookings/${seed.bookingId}`)
      .set(clientHeaders)
      .send({ eventName: 'Updated Event Name', location: 'Updated Location', userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 7. POST /api/bookings/:id/status — update booking status
// ---------------------------------------------------------------------------
describe('POST /api/bookings/:id/status', () => {
  it('200 — updates booking status to confirmed', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/status`)
      .set(clientHeaders)
      .send({ status: 'confirmed', userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });

  it('404 — nonexistent booking id', async () => {
    const res = await request(app)
      .post('/api/bookings/999999/status')
      .set(clientHeaders)
      .send({ status: 'confirmed', userEmail: 'client@event.test' });

    expect([403, 404]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// 8. GET /api/user/payment-methods
// ---------------------------------------------------------------------------
describe('GET /api/user/payment-methods', () => {
  it('200 — returns payment methods for the user', async () => {
    const res = await request(app)
      .get('/api/user/payment-methods')
      .query({ email: 'client@event.test' })
      .set(clientHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.paymentMethods)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. POST /api/user/payment-methods — add payment method
// ---------------------------------------------------------------------------
describe('POST /api/user/payment-methods', () => {
  const validPayment = {
    userEmail: 'client@event.test',
    type: 'gcash',
    account_name: 'John Client',
    account_number: '09001234567',
  };

  it('200 — adds a payment method with valid data', async () => {
    const res = await request(app)
      .post('/api/user/payment-methods')
      .set(clientHeaders)
      .send(validPayment);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('400 — missing type field', async () => {
    const { type, ...incomplete } = validPayment;
    const res = await request(app)
      .post('/api/user/payment-methods')
      .set(clientHeaders)
      .send(incomplete);

    expect(res.status).toBe(400);
  });

  it('400 — invalid type value', async () => {
    const res = await request(app)
      .post('/api/user/payment-methods')
      .set(clientHeaders)
      .send({ ...validPayment, type: 'bitcoin' });

    expect(res.status).toBe(400);
  });

  it('400 — missing account_name', async () => {
    const { account_name, ...incomplete } = validPayment;
    const res = await request(app)
      .post('/api/user/payment-methods')
      .set(clientHeaders)
      .send(incomplete);

    expect(res.status).toBe(400);
  });

  it('400 — invalid userEmail', async () => {
    const res = await request(app)
      .post('/api/user/payment-methods')
      .set(clientHeaders)
      .send({ ...validPayment, userEmail: 'bad-email' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 10. POST /api/user/payment-methods/:id/set-default
// ---------------------------------------------------------------------------
describe('POST /api/user/payment-methods/:id/set-default', () => {
  let paymentMethodId;

  beforeAll(async () => {
    const pm = await createPaymentMethod('client@event.test', {
      pm_type: 'gcash',
      pm_account_name: 'John Client',
      pm_account_number: '09009999999',
    });
    paymentMethodId = pm.id;
  });

  it('200 — sets a payment method as default', async () => {
    const res = await request(app)
      .post(`/api/user/payment-methods/${paymentMethodId}/set-default`)
      .set(clientHeaders)
      .send({ userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 11. DELETE /api/user/payment-methods/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/user/payment-methods/:id', () => {
  let paymentMethodId;

  beforeAll(async () => {
    const pm = await createPaymentMethod('client@event.test', {
      pm_type: 'bank',
      pm_account_name: 'John Client',
      pm_account_number: 'ACC123456',
    });
    paymentMethodId = pm.id;
  });

  it('200 — deletes a payment method', async () => {
    const res = await request(app)
      .delete(`/api/user/payment-methods/${paymentMethodId}`)
      .set(clientHeaders)
      .send({ userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 12. POST /api/bookings/:bookingId/pay-cash
// ---------------------------------------------------------------------------
describe('POST /api/bookings/:bookingId/pay-cash', () => {
  it('200 — processes cash payment for a booking', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/pay-cash`)
      .set(clientHeaders)
      .send({ userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });

  it('400 — missing userEmail in body', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/pay-cash`)
      .set(clientHeaders)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 13. GET /api/provider/bookings — provider-only listing
// ---------------------------------------------------------------------------
describe('GET /api/provider/bookings', () => {
  it('200 — provider can list their bookings', async () => {
    const res = await request(app)
      .get('/api/provider/bookings')
      .query({ providerEmail: 'provider@event.test' })
      .set(providerHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('200 — admin can also access provider bookings', async () => {
    const res = await request(app)
      .get('/api/provider/bookings')
      .query({ providerEmail: 'provider@event.test' })
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('403 — regular user is denied', async () => {
    const res = await request(app)
      .get('/api/provider/bookings')
      .query({ providerEmail: 'client@event.test' })
      .set(clientHeaders);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 14. POST /api/bookings/:bookingId/services/:serviceId/rate — submit rating
// ---------------------------------------------------------------------------
describe('POST /api/bookings/:bookingId/services/:serviceId/rate', () => {
  beforeAll(async () => {
    // Rating requires a completed booking — must have a completed payment first
    // otherwise updateBookingStatus changes 'completed' to 'cancelled'
    await createCompletedPayment(seed.bookingId, 'client@event.test');
    await request(app)
      .post(`/api/bookings/${seed.bookingId}/status`)
      .set(clientHeaders)
      .send({ status: 'completed', userEmail: 'client@event.test' });
  });

  it('200 — submits a rating for a service', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/services/${seed.svc1Id}/rate`)
      .set(clientHeaders)
      .send({ rating: 5, comment: 'Great service', userEmail: 'client@event.test' });

    expect(res.status).toBe(200);
  });

  it('400 — missing rating field', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/services/${seed.svc1Id}/rate`)
      .set(clientHeaders)
      .send({ comment: 'No rating here', userEmail: 'client@event.test' });

    expect(res.status).toBe(400);
  });

  it('401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/services/${seed.svc1Id}/rate`)
      .send({ rating: 5, comment: 'Great service', userEmail: 'client@event.test' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 15. GET /api/bookings/:bookingId/services/:serviceId/rating — get rating (public)
// ---------------------------------------------------------------------------
describe('GET /api/bookings/:bookingId/services/:serviceId/rating', () => {
  it('200 — returns the rating for a booking/service pair', async () => {
    const res = await request(app)
      .get(`/api/bookings/${seed.bookingId}/services/${seed.svc1Id}/rating`)
      .query({ email: 'client@event.test' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('rating');
  });

  it('400 — missing email query param', async () => {
    const res = await request(app)
      .get('/api/bookings/999999/services/999999/rating');

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
