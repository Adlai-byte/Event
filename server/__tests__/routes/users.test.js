const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createUser } = require('../helpers/factories');

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
// 1. POST /api/register
// ---------------------------------------------------------------------------
describe('POST /api/register', () => {
  it('should register a new user with valid data', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        firstName: 'Test',
        lastName: 'Register',
        email: 'register-valid@event.test',
        password: 'secret123',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should return 400 when firstName is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        lastName: 'NoFirst',
        email: 'nofirst@event.test',
        password: 'secret123',
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 when lastName is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        firstName: 'NoLast',
        email: 'nolast@event.test',
        password: 'secret123',
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        firstName: 'Bad',
        lastName: 'Email',
        email: 'not-an-email',
        password: 'secret123',
      });

    expect(res.status).toBe(400);
  });

  it('should return 409 when email is already taken', async () => {
    // First registration
    await request(app)
      .post('/api/register')
      .send({
        firstName: 'Dup',
        lastName: 'One',
        email: 'duplicate-reg@event.test',
        password: 'secret123',
      });

    // Duplicate registration
    const res = await request(app)
      .post('/api/register')
      .send({
        firstName: 'Dup',
        lastName: 'Two',
        email: 'duplicate-reg@event.test',
        password: 'secret123',
      });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 2. GET /api/users (admin-only list)
// ---------------------------------------------------------------------------
describe('GET /api/users', () => {
  it('should return a list of users for admin (200)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should deny access for a regular user (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(clientHeaders);

    expect(res.status).toBe(403);
  });

  it('should deny access for a provider (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set(providerHeaders);

    expect(res.status).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .get('/api/users');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 3. GET /api/users/by-email
// ---------------------------------------------------------------------------
describe('GET /api/users/by-email', () => {
  it('should return user data for a valid email lookup (200)', async () => {
    const res = await request(app)
      .get('/api/users/by-email')
      .query({ email: 'admin@event.test' })
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('email', 'admin@event.test');
  });

  it('should return 400 when email param is missing', async () => {
    const res = await request(app)
      .get('/api/users/by-email')
      .set(adminHeaders);

    expect(res.status).toBe(400);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .get('/api/users/by-email')
      .query({ email: 'admin@event.test' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4. GET /api/user/provider-status
// ---------------------------------------------------------------------------
describe('GET /api/user/provider-status', () => {
  it('should return provider status for a valid email (200)', async () => {
    const res = await request(app)
      .get('/api/user/provider-status')
      .query({ email: 'provider@event.test' })
      .set(providerHeaders);

    expect(res.status).toBe(200);
  });

  it('should return 400 when email param is missing', async () => {
    const res = await request(app)
      .get('/api/user/provider-status')
      .set(clientHeaders);

    expect(res.status).toBe(400);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .get('/api/user/provider-status')
      .query({ email: 'provider@event.test' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 5. POST /api/users (add user, no auth required)
// ---------------------------------------------------------------------------
describe('POST /api/users', () => {
  it('should add a new user (200)', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        firstName: 'Add',
        lastName: 'User',
        email: 'adduser@event.test',
      });

    expect([200, 201]).toContain(res.status);
  });

  it('should return 409 when adding a user with a duplicate email', async () => {
    const userData = {
      firstName: 'Dup',
      lastName: 'Add',
      email: 'dup-add@event.test',
    };

    // First insert
    await request(app).post('/api/users').send(userData);

    // Duplicate insert
    const res = await request(app).post('/api/users').send(userData);

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 6. POST /api/users/:id/block (admin-only block/unblock)
// ---------------------------------------------------------------------------
describe('POST /api/users/:id/block', () => {
  let targetUserId;

  beforeAll(async () => {
    // Create a user to block/unblock via factory
    const user = await createUser({ u_email: 'blockable@event.test' });
    targetUserId = user.id;
  });

  it('should allow admin to block a user (200)', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUserId}/block`)
      .set(adminHeaders)
      .send({ blocked: true });

    expect(res.status).toBe(200);
  });

  it('should allow admin to unblock a user (200)', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUserId}/block`)
      .set(adminHeaders)
      .send({ blocked: false });

    expect(res.status).toBe(200);
  });

  it('should deny non-admin user from blocking (403)', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUserId}/block`)
      .set(clientHeaders)
      .send({ blocked: true });

    expect(res.status).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/users/${targetUserId}/block`)
      .send({ blocked: true });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 7. PUT /api/users/:id (update user)
// ---------------------------------------------------------------------------
describe('PUT /api/users/:id', () => {
  let updateUserId;

  beforeAll(async () => {
    // Create a user to update via factory
    const user = await createUser({ u_email: 'updatable@event.test' });
    updateUserId = user.id;
  });

  it('should update a user with valid data (200)', async () => {
    const res = await request(app)
      .put(`/api/users/${updateUserId}`)
      .set(clientHeaders)
      .send({
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updatable@event.test',
        phone: '1234567890',
      });

    expect(res.status).toBe(200);
  });

  it('should return 400 when firstName is missing on update', async () => {
    const res = await request(app)
      .put(`/api/users/${updateUserId}`)
      .set(clientHeaders)
      .send({
        lastName: 'OnlyLast',
        email: 'updatable@event.test',
      });

    expect(res.status).toBe(400);
  });

  it('should return 400 when email is invalid on update', async () => {
    const res = await request(app)
      .put(`/api/users/${updateUserId}`)
      .set(clientHeaders)
      .send({
        firstName: 'Bad',
        lastName: 'Email',
        email: 'not-valid',
      });

    expect(res.status).toBe(400);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .put(`/api/users/${updateUserId}`)
      .send({
        firstName: 'No',
        lastName: 'Auth',
        email: 'updatable@event.test',
      });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 8. POST /api/users/apply-provider
// ---------------------------------------------------------------------------
describe('POST /api/users/apply-provider', () => {
  it('should allow a client to apply as provider (200)', async () => {
    // Minimal 1x1 pixel transparent PNG as base64
    const minimalPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await request(app)
      .post('/api/users/apply-provider')
      .set(clientHeaders)
      .send({
        email: 'client@event.test',
        businessDocument: minimalPng,
        validIdDocument: minimalPng,
      });

    expect([200, 201]).toContain(res.status);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/users/apply-provider')
      .send({ email: 'client@event.test' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 9. Unauthenticated requests to protected endpoints
// ---------------------------------------------------------------------------
describe('Unauthenticated requests', () => {
  it('GET /api/users should return 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('GET /api/users/by-email should return 401', async () => {
    const res = await request(app)
      .get('/api/users/by-email')
      .query({ email: 'admin@event.test' });
    expect(res.status).toBe(401);
  });

  it('GET /api/user/provider-status should return 401', async () => {
    const res = await request(app)
      .get('/api/user/provider-status')
      .query({ email: 'provider@event.test' });
    expect(res.status).toBe(401);
  });

  it('POST /api/users/apply-provider should return 401', async () => {
    const res = await request(app)
      .post('/api/users/apply-provider')
      .send({ email: 'client@event.test' });
    expect(res.status).toBe(401);
  });
});
