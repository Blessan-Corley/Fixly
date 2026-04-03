import { describe, expect, it } from 'vitest';

import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  paginated,
  serverError,
  unauthorized,
} from '@/lib/api/response';

describe('API response helpers', () => {
  describe('ok()', () => {
    it('returns 200 with success true and data', async () => {
      const response = ok({ id: '1', name: 'Test' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '1', name: 'Test' });
    });
  });

  describe('created()', () => {
    it('returns 201 with success true', async () => {
      const response = created({ id: '1' });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
    });
  });

  describe('badRequest()', () => {
    it('returns 400 with success false and error message', async () => {
      const response = badRequest('Invalid input');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input');
    });

    it('includes validation errors when provided', async () => {
      const response = badRequest('Validation failed', { name: ['Required'] });
      const body = await response.json();

      expect(body.errors).toEqual({ name: ['Required'] });
    });
  });

  describe('unauthorized()', () => {
    it('returns 401', () => {
      expect(unauthorized().status).toBe(401);
    });
  });

  describe('forbidden()', () => {
    it('returns 403', () => {
      expect(forbidden().status).toBe(403);
    });
  });

  describe('notFound()', () => {
    it('returns 404 with resource name in message', async () => {
      const response = notFound('Job');
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toContain('Job');
    });
  });

  describe('serverError()', () => {
    it('returns 500', () => {
      expect(serverError().status).toBe(500);
    });
  });

  describe('paginated()', () => {
    it('returns correct pagination metadata', async () => {
      const response = paginated(['a', 'b', 'c'], 30, 2, 10);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual(['a', 'b', 'c']);
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.total).toBe(30);
      expect(body.pagination.totalPages).toBe(3);
      expect(body.pagination.hasNextPage).toBe(true);
      expect(body.pagination.hasPrevPage).toBe(true);
    });

    it('correctly identifies the last page', async () => {
      const response = paginated(['a'], 21, 3, 10);
      const body = await response.json();

      expect(body.pagination.hasNextPage).toBe(false);
      expect(body.pagination.hasPrevPage).toBe(true);
    });

    it('correctly identifies the first page', async () => {
      const response = paginated(['a'], 30, 1, 10);
      const body = await response.json();

      expect(body.pagination.hasPrevPage).toBe(false);
    });
  });
});
