const { sendSuccess, sendError, sendPaginated } = require('../../lib/response');

// Mock Express response
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

describe('Response Helpers', () => {
  describe('sendSuccess', () => {
    it('should return ok:true with data', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1, name: 'Test' });
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should allow custom status code', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1 }, 201);
      expect(res.statusCode).toBe(201);
      expect(res.body.ok).toBe(true);
    });

    it('should return null data when no data provided', () => {
      const res = mockRes();
      sendSuccess(res);
      expect(res.body.data).toBeNull();
    });
  });

  describe('sendError', () => {
    it('should return ok:false with error and code', () => {
      const res = mockRes();
      sendError(res, 'NOT_FOUND', 'Resource not found', 404);
      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Resource not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should default to 400 status', () => {
      const res = mockRes();
      sendError(res, 'VALIDATION_ERROR', 'Invalid input');
      expect(res.statusCode).toBe(400);
    });

    it('should include details when provided', () => {
      const res = mockRes();
      const details = [{ field: 'email', message: 'Invalid email' }];
      sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
      expect(res.body.details).toEqual(details);
    });

    it('should omit details when not provided', () => {
      const res = mockRes();
      sendError(res, 'SERVER_ERROR', 'Something broke', 500);
      expect(res.body.details).toBeUndefined();
    });
  });

  describe('sendPaginated', () => {
    it('should return data with pagination metadata', () => {
      const res = mockRes();
      const data = [{ id: 1 }, { id: 2 }];
      sendPaginated(res, data, { page: 1, limit: 20, total: 50 });
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(data);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it('should calculate totalPages correctly', () => {
      const res = mockRes();
      sendPaginated(res, [], { page: 1, limit: 10, total: 25 });
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should handle zero total', () => {
      const res = mockRes();
      sendPaginated(res, [], { page: 1, limit: 20, total: 0 });
      expect(res.body.pagination.totalPages).toBe(0);
      expect(res.body.data).toEqual([]);
    });
  });
});
