const request = require('supertest');
const { app } = require('../../index');

describe('Request ID Middleware', () => {
  it('should generate a request ID if none provided', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('should use the provided X-Request-Id header', async () => {
    const customId = 'test-request-id-12345';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
