const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createService } = require('../helpers/factories');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// 1. GET /api/services — public list
// ---------------------------------------------------------------------------
describe('GET /api/services', () => {
  it('returns 200 with a list of services (public)', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });

  it('supports pagination via ?page=1&limit=5', async () => {
    const res = await request(app).get('/api/services?page=1&limit=5');
    expect(res.status).toBe(200);
    const list = res.body.data || res.body;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// 2. GET /api/services/:id — single service
// ---------------------------------------------------------------------------
describe('GET /api/services/:id', () => {
  it('returns 200 for an existing service', async () => {
    const res = await request(app).get(`/api/services/${seed.svc1Id}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for a nonexistent service', async () => {
    const res = await request(app).get('/api/services/99999');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 3. GET /api/services/:id/images
// ---------------------------------------------------------------------------
describe('GET /api/services/:id/images', () => {
  it('returns 200 with images array', async () => {
    const res = await request(app).get(`/api/services/${seed.svc1Id}/images`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 4. GET /api/services/:id/availability
// ---------------------------------------------------------------------------
describe('GET /api/services/:id/availability', () => {
  it('returns 200 with availability data', async () => {
    const res = await request(app).get(`/api/services/${seed.svc1Id}/availability`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 5. POST /api/services — create service
// ---------------------------------------------------------------------------
describe('POST /api/services', () => {
  const validBody = {
    name: 'New Test Service',
    category: 'photography',
    basePrice: 2500,
    description: 'A test service',
    providerEmail: 'provider@event.test',
  };

  it('allows a provider to create a service (200)', async () => {
    const res = await request(app)
      .post('/api/services')
      .set(authAs('provider'))
      .send(validBody);
    expect([200, 201]).toContain(res.status);
  });

  it('denies a regular user (403)', async () => {
    const res = await request(app)
      .post('/api/services')
      .set(authAs('user'))
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const { name, ...noName } = validBody;
    const res = await request(app)
      .post('/api/services')
      .set(authAs('provider'))
      .send(noName);
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid category', async () => {
    const res = await request(app)
      .post('/api/services')
      .set(authAs('provider'))
      .send({ ...validBody, category: 'alchemy' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 6. PUT /api/services/:id — update service
// ---------------------------------------------------------------------------
describe('PUT /api/services/:id', () => {
  it('allows a provider to update a service (200)', async () => {
    const res = await request(app)
      .put(`/api/services/${seed.svc1Id}`)
      .set(authAs('provider'))
      .send({ name: 'Updated Service Name', category: 'photography', basePrice: 3000 });
    expect(res.status).toBe(200);
  });

  it('denies a regular user (403)', async () => {
    const res = await request(app)
      .put(`/api/services/${seed.svc1Id}`)
      .set(authAs('user'))
      .send({ name: 'Hacked Name' });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 7. POST /api/services/:id/status — change service status
// ---------------------------------------------------------------------------
describe('POST /api/services/:id/status', () => {
  it('allows a provider to change service status (200)', async () => {
    const res = await request(app)
      .post(`/api/services/${seed.svc1Id}/status`)
      .set(authAs('provider'))
      .send({ isActive: false });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 8. GET /api/services/:serviceId/reviews
// ---------------------------------------------------------------------------
describe('GET /api/services/:serviceId/reviews', () => {
  it('returns 200 with reviews data', async () => {
    const res = await request(app).get(`/api/services/${seed.svc1Id}/reviews`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 9. GET /api/provider/profile — provider profile
// ---------------------------------------------------------------------------
describe('GET /api/provider/profile', () => {
  it('returns 200 for an authenticated provider', async () => {
    const res = await request(app)
      .get('/api/provider/profile')
      .set(authAs('provider'))
      .query({ email: 'provider@event.test' });
    expect(res.status).toBe(200);
  });

  it('denies a regular user (403)', async () => {
    const res = await request(app)
      .get('/api/provider/profile')
      .set(authAs('user'))
      .query({ email: 'provider@event.test' });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 10. GET /api/provider/services — provider's own services
// ---------------------------------------------------------------------------
describe('GET /api/provider/services', () => {
  it('returns 200 for an authenticated provider', async () => {
    const res = await request(app)
      .get('/api/provider/services')
      .set(authAs('provider'))
      .query({ email: 'provider@event.test' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 11. GET /api/providers/search — public provider search
// ---------------------------------------------------------------------------
describe('GET /api/providers/search', () => {
  it('returns 200 with search results (public)', async () => {
    const res = await request(app).get('/api/providers/search').query({ q: 'test' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 12. Unauthenticated requests on protected routes return 401
// ---------------------------------------------------------------------------
describe('Unauthenticated access on protected routes', () => {
  it('POST /api/services returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ name: 'No Auth', category: 'photography', basePrice: 100 });
    expect(res.status).toBe(401);
  });

  it('PUT /api/services/:id returns 401 without auth', async () => {
    const res = await request(app)
      .put(`/api/services/${seed.svc1Id}`)
      .send({ name: 'No Auth Update' });
    expect(res.status).toBe(401);
  });

  it('POST /api/services/:id/status returns 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/services/${seed.svc1Id}/status`)
      .send({ status: 'active' });
    expect(res.status).toBe(401);
  });

  it('GET /api/provider/profile returns 401 without auth', async () => {
    const res = await request(app).get('/api/provider/profile');
    expect(res.status).toBe(401);
  });

  it('GET /api/provider/services returns 401 without auth', async () => {
    const res = await request(app).get('/api/provider/services');
    expect(res.status).toBe(401);
  });
});
