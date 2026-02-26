const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createPackage } = require('../helpers/factories');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ─── GET /api/services/:serviceId/packages ──────────────────────────
describe('GET /api/services/:serviceId/packages', () => {
  it('returns packages for a service (public)', async () => {
    await createPackage(seed.svc1Id);
    const res = await request(app).get(`/api/services/${seed.svc1Id}/packages`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 200 with empty array for service without packages', async () => {
    const res = await request(app).get(`/api/services/${seed.svc2Id}/packages`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('handles nonexistent service gracefully', async () => {
    const res = await request(app).get('/api/services/99999/packages');
    expect([200, 404]).toContain(res.status);
  });
});

// ─── GET /api/packages/:id ──────────────────────────────────────────
describe('GET /api/packages/:id', () => {
  let pkg;
  beforeAll(async () => {
    pkg = await createPackage(seed.svc1Id, { sp_name: 'Lookup Package' });
  });

  it('returns an existing package', async () => {
    const res = await request(app).get(`/api/packages/${pkg.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 for nonexistent package', async () => {
    const res = await request(app).get('/api/packages/99999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/services/:serviceId/packages ─────────────────────────
describe('POST /api/services/:serviceId/packages', () => {
  it('allows provider to create a package', async () => {
    const res = await request(app)
      .post(`/api/services/${seed.svc1Id}/packages`)
      .set(authAs('provider'))
      .send({ name: 'Gold Package', description: 'Premium offering', basePrice: 10000 });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user (403)', async () => {
    const res = await request(app)
      .post(`/api/services/${seed.svc1Id}/packages`)
      .set(authAs('user'))
      .send({ name: 'Sneaky Package', basePrice: 500 });
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/services/${seed.svc1Id}/packages`)
      .send({ name: 'No Auth', basePrice: 100 });
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/packages/:id ──────────────────────────────────────────
describe('PUT /api/packages/:id', () => {
  let pkg;
  beforeAll(async () => {
    pkg = await createPackage(seed.svc1Id, { sp_name: 'Editable Pkg' });
  });

  it('allows provider to update a package', async () => {
    const res = await request(app)
      .put(`/api/packages/${pkg.id}`)
      .set(authAs('provider'))
      .send({ name: 'Updated Package', basePrice: 7500 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user (403)', async () => {
    const res = await request(app)
      .put(`/api/packages/${pkg.id}`)
      .set(authAs('user'))
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/packages/:id ───────────────────────────────────────
describe('DELETE /api/packages/:id', () => {
  it('allows provider to delete a package', async () => {
    const pkg = await createPackage(seed.svc1Id, { sp_name: 'Deleteable Pkg' });
    const res = await request(app)
      .delete(`/api/packages/${pkg.id}`)
      .set(authAs('provider'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user (403)', async () => {
    const pkg = await createPackage(seed.svc1Id, { sp_name: 'Protected Pkg' });
    const res = await request(app)
      .delete(`/api/packages/${pkg.id}`)
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/packages/:id/categories ──────────────────────────────
describe('POST /api/packages/:id/categories', () => {
  let pkg;
  beforeAll(async () => {
    pkg = await createPackage(seed.svc1Id, { sp_name: 'Cat-Test Pkg' });
  });

  it('allows provider to add a category', async () => {
    const res = await request(app)
      .post(`/api/packages/${pkg.id}/categories`)
      .set(authAs('provider'))
      .send({ name: 'Equipment' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });
});

// ─── GET /api/packages/:id/calculate-price ──────────────────────────
describe('GET /api/packages/:id/calculate-price', () => {
  it('returns calculated price (public)', async () => {
    const pkg = await createPackage(seed.svc1Id, { sp_base_price: 5000 });
    const res = await request(app).get(`/api/packages/${pkg.id}/calculate-price`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Booking Packages ───────────────────────────────────────────────
describe('Booking Packages', () => {
  it('saves a booking package', async () => {
    const pkg = await createPackage(seed.svc1Id, { sp_name: 'Booking Pkg' });
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/package`)
      .set(authAs('user'))
      .send({ packageId: pkg.id, paxCount: 1, removedItems: [], notes: 'test' });
    expect([200, 201]).toContain(res.status);
  });

  it('retrieves a booking package', async () => {
    const res = await request(app)
      .get(`/api/bookings/${seed.bookingId}/package`)
      .set(authAs('user'));
    expect(res.status).toBe(200);
  });
});
