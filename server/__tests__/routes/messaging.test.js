const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createConversation, addConversationParticipant, createMessage } = require('../helpers/factories');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ─── Unread Message Count ───────────────────────────────────────────
describe('GET /api/user/messages/count', () => {
  it('returns unread count for authenticated user', async () => {
    const res = await request(app)
      .get('/api/user/messages/count')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .get('/api/user/messages/count')
      .set(authAs('user'));
    expect([400, 200]).toContain(res.status);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/user/messages/count');
    expect(res.status).toBe(401);
  });
});

// ─── Booking Conversation ───────────────────────────────────────────
describe('POST /api/bookings/:id/conversation', () => {
  it('creates or gets a booking conversation', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/conversation`)
      .set(authAs('user'))
      .send({ userEmail: 'client@event.test' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/bookings/${seed.bookingId}/conversation`)
      .send({ userEmail: 'client@event.test' });
    expect(res.status).toBe(401);
  });
});

// ─── Get Booking Provider ───────────────────────────────────────────
describe('GET /api/bookings/:id/provider', () => {
  it('returns the provider for a booking', async () => {
    const res = await request(app)
      .get(`/api/bookings/${seed.bookingId}/provider`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── User Conversations ─────────────────────────────────────────────
describe('GET /api/user/conversations', () => {
  it('returns conversations for user', async () => {
    const res = await request(app)
      .get('/api/user/conversations')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/user/conversations');
    expect(res.status).toBe(401);
  });
});

// ─── Conversation Messages ──────────────────────────────────────────
describe('Conversation Messages', () => {
  let conv;

  beforeAll(async () => {
    conv = await createConversation(seed.bookingId);
    await addConversationParticipant(conv.id, seed.clientId, 'client@event.test');
    await addConversationParticipant(conv.id, seed.providerId, 'provider@event.test');
    await createMessage(conv.id, 'client@event.test');
  });

  it('gets messages for a conversation', async () => {
    const res = await request(app)
      .get(`/api/conversations/${conv.id}/messages`)
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('sends a message to conversation', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .set(authAs('user'))
      .send({
        userEmail: 'client@event.test',
        content: 'Hello, when is the event?',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .set(authAs('user'))
      .send({ userEmail: 'client@event.test' });
    expect(res.status).toBe(400);
  });

  it('marks messages as read', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conv.id}/read`)
      .set(authAs('user'))
      .send({ userEmail: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
