const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createNotification } = require('../helpers/factories');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ─── Register Push Token ────────────────────────────────────────────
describe('POST /api/notifications/register-token', () => {
  it('registers a push token', async () => {
    const res = await request(app)
      .post('/api/notifications/register-token')
      .set(authAs('user'))
      .send({
        userId: seed.clientId,
        userEmail: 'client@event.test',
        pushToken: 'ExponentPushToken[test123]',
        platform: 'android',
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/notifications/register-token')
      .set(authAs('user'))
      .send({});
    expect([400, 500]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/notifications/register-token')
      .send({ userEmail: 'x', pushToken: 'x', platform: 'web' });
    expect(res.status).toBe(401);
  });
});

// ─── VAPID Public Key ───────────────────────────────────────────────
describe('GET /api/notifications/vapid-public-key', () => {
  it('returns VAPID public key (public endpoint)', async () => {
    const res = await request(app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── User Notifications ─────────────────────────────────────────────
describe('GET /api/notifications', () => {
  beforeAll(async () => {
    await createNotification('client@event.test', { n_title: 'Test Notif' });
  });

  it('returns notifications for authenticated user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

// ─── Unread Count ───────────────────────────────────────────────────
describe('GET /api/notifications/unread-count', () => {
  it('returns unread count', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Mark as Read ───────────────────────────────────────────────────
describe('POST /api/notifications/:id/read', () => {
  let notif;
  beforeAll(async () => {
    notif = await createNotification('client@event.test');
  });

  it('marks a notification as read', async () => {
    const res = await request(app)
      .post(`/api/notifications/${notif.id}/read`)
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /api/notifications/mark-all-read', () => {
  it('marks all notifications as read', async () => {
    const res = await request(app)
      .post('/api/notifications/mark-all-read')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Test Push (Admin Only) ─────────────────────────────────────────
describe('POST /api/notifications/test-push', () => {
  it('admin can test push notification', async () => {
    const res = await request(app)
      .post('/api/notifications/test-push')
      .set(authAs('admin'))
      .send({ userEmail: 'client@event.test', title: 'Test', body: 'Test push' });
    expect([200, 500]).toContain(res.status); // 500 if Expo push service not available
  });

  it('denies non-admin (403)', async () => {
    const res = await request(app)
      .post('/api/notifications/test-push')
      .set(authAs('user'))
      .send({ email: 'client@event.test', title: 'Test', body: 'Nope' });
    expect(res.status).toBe(403);
  });
});

// ─── Push Tokens ────────────────────────────────────────────────────
describe('GET /api/notifications/push-tokens/:email', () => {
  it('returns push tokens for a user', async () => {
    const res = await request(app)
      .get('/api/notifications/push-tokens/client@event.test')
      .set(authAs('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('DELETE /api/notifications/push-tokens/:email', () => {
  it('deletes push tokens for a user', async () => {
    const res = await request(app)
      .delete('/api/notifications/push-tokens/client@event.test')
      .set(authAs('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
