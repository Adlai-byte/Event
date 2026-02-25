const request = require('supertest');
const { app } = require('../../index');
const { _resetStore } = require('../../middleware/rateLimiter');

beforeEach(() => {
  _resetStore();
});

describe('Rate Limiter', () => {
  it('should allow requests within the limit', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    // First request creates the store entry; headers appear from the 2nd request onward
    const res2 = await request(app).get('/api/health');
    expect(res2.status).toBe(200);
    expect(res2.headers['x-ratelimit-limit']).toBeDefined();
    expect(res2.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('should return rate limit headers', async () => {
    // Make 2 requests to get past the first one (which doesn't set headers)
    await request(app).get('/api/health');
    const res = await request(app).get('/api/health');
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('should return 429 when rate limit exceeded on register', async () => {
    // Register limiter allows 5 per hour
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/register')
        .send({ email: `test${i}@test.com`, password: 'pass', name: 'Test' });
    }

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'overflow@test.com', password: 'pass', name: 'Test' });

    expect(res.status).toBe(429);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/too many/i);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
