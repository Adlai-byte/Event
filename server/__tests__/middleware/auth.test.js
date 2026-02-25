const request = require('supertest');
const { app } = require('../../index');

/**
 * Auth middleware tests.
 * These verify that protected endpoints reject unauthenticated requests.
 * Since we can't easily mock Firebase in integration tests, we test
 * that endpoints WITHOUT a token return 401.
 */
describe('Authentication Middleware', () => {
  // Endpoints that MUST require auth (sampling from each route file)
  const protectedEndpoints = [
    // User endpoints
    { method: 'get', path: '/api/user/bookings?email=test@test.com' },
    { method: 'get', path: '/api/user/bookings/count?email=test@test.com' },
    { method: 'get', path: '/api/user/payment-methods?email=test@test.com' },
    { method: 'get', path: '/api/user/conversations?email=test@test.com' },
    { method: 'get', path: '/api/user/messages/count?email=test@test.com' },
    { method: 'get', path: '/api/user/provider-status?email=test@test.com' },
    { method: 'get', path: '/api/user/job-applications?email=test@test.com' },
    { method: 'put', path: '/api/users/1' },

    // Provider endpoints
    { method: 'get', path: '/api/provider/bookings?email=test@test.com' },
    { method: 'get', path: '/api/provider/services?email=test@test.com' },
    { method: 'get', path: '/api/provider/dashboard/stats?email=test@test.com' },
    { method: 'get', path: '/api/provider/job-postings?email=test@test.com' },
    { method: 'get', path: '/api/provider/paymongo-credentials?providerEmail=test@test.com' },
    { method: 'post', path: '/api/services' },

    // Admin endpoints
    { method: 'get', path: '/api/admin/provider-applications' },
    { method: 'get', path: '/api/users' },
    { method: 'get', path: '/api/users/by-email?email=test@test.com' },
    { method: 'post', path: '/api/users/1/block' },

    // Booking endpoints
    { method: 'post', path: '/api/bookings' },
    { method: 'post', path: '/api/bookings/1/pay' },

    // Notification endpoints
    { method: 'get', path: '/api/notifications?email=test@test.com' },
    { method: 'get', path: '/api/notifications/unread-count?email=test@test.com' },

    // Messaging endpoints
    { method: 'get', path: '/api/conversations/1/messages' },
    { method: 'post', path: '/api/conversations/1/messages' },
  ];

  protectedEndpoints.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path.split('?')[0]} should return 401 without token`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/authentication|token/i);
    });
  });

  // Endpoints that SHOULD be public (no auth required)
  const publicEndpoints = [
    { method: 'get', path: '/api/health' },
    { method: 'get', path: '/api/services' },
    { method: 'get', path: '/api/notifications/vapid-public-key' },
    { method: 'get', path: '/api/job-postings' },
    { method: 'post', path: '/api/register' },
  ];

  publicEndpoints.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} should NOT return 401 (public endpoint)`, async () => {
      const res = await request(app)[method](path)
        .send(method === 'post' ? { email: 'test@test.com' } : undefined);
      expect(res.status).not.toBe(401);
    });
  });
});
