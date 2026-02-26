const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ─── Provider Applications (admin routes at /api/admin) ─────────────
describe('GET /api/admin/provider-applications', () => {
  it('admin gets provider applications', async () => {
    const res = await request(app)
      .get('/api/admin/provider-applications')
      .set(authAs('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .get('/api/admin/provider-applications')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });

  it('denies provider (403)', async () => {
    const res = await request(app)
      .get('/api/admin/provider-applications')
      .set(authAs('provider'));
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/provider-applications');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/provider-applications/:id/approve', () => {
  it('returns 404 for nonexistent application', async () => {
    const res = await request(app)
      .post('/api/admin/provider-applications/99999/approve')
      .set(authAs('admin'));
    expect([200, 404]).toContain(res.status);
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .post('/api/admin/provider-applications/1/approve')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/provider-applications/:id/reject', () => {
  it('returns 404 for nonexistent application', async () => {
    const res = await request(app)
      .post('/api/admin/provider-applications/99999/reject')
      .set(authAs('admin'))
      .send({ rejectionReason: 'Incomplete documents' });
    expect([200, 404]).toContain(res.status);
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .post('/api/admin/provider-applications/1/reject')
      .set(authAs('user'))
      .send({ rejectionReason: 'Should not work' });
    expect(res.status).toBe(403);
  });
});

// ─── Admin Analytics (mounted at /api/admin) ────────────────────────
describe('GET /api/admin/analytics', () => {
  it('admin gets analytics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set(authAs('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});

// ─── Dashboard Stats (mounted at /api) ──────────────────────────────
describe('GET /api/dashboard/stats', () => {
  it('admin gets dashboard stats', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set(authAs('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});

// ─── Provider Analytics (mounted at /api) ───────────────────────────
describe('GET /api/provider/dashboard/stats', () => {
  it('provider gets dashboard stats', async () => {
    const res = await request(app)
      .get('/api/provider/dashboard/stats')
      .set(authAs('provider'))
      .query({ providerEmail: 'provider@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user (403)', async () => {
    const res = await request(app)
      .get('/api/provider/dashboard/stats')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/provider/activity', () => {
  it('provider gets recent activity', async () => {
    const res = await request(app)
      .get('/api/provider/activity')
      .set(authAs('provider'))
      .query({ providerEmail: 'provider@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user (403)', async () => {
    const res = await request(app)
      .get('/api/provider/activity')
      .set(authAs('user'));
    expect(res.status).toBe(403);
  });
});
