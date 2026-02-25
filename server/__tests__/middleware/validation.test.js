const request = require('supertest');
const { app } = require('../../index');

describe('Input Validation', () => {
  describe('POST /api/register', () => {
    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.details.some(d => d.field === 'email')).toBe(true);
    });

    it('should reject overly long names', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          firstName: 'A'.repeat(101),
          lastName: 'User',
          email: 'test@test.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.details.some(d => d.field === 'firstName')).toBe(true);
    });

    it('should accept valid registration data', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'validuser@test.com',
          password: 'securepass123',
        });

      // Should not be 400 (validation passes, may be 200 or 409 or 500 depending on DB)
      expect(res.status).not.toBe(400);
    });
  });

  describe('POST /api/bookings (auth required)', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/user/payment-methods (auth required)', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/user/payment-methods')
        .send({});

      expect(res.status).toBe(401);
    });
  });
});
