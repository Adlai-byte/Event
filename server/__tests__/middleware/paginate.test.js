const request = require('supertest');
const { app } = require('../../index');

describe('Pagination', () => {
  it('GET /api/services should return paginated response', async () => {
    const res = await request(app).get('/api/services?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.total).toBeDefined();
    expect(res.body.pagination.totalPages).toBeDefined();
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should default to page 1, limit 20', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  it('should cap limit at 100', async () => {
    const res = await request(app).get('/api/services?limit=500');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('GET /api/job-postings should return paginated response', async () => {
    const res = await request(app).get('/api/job-postings?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
