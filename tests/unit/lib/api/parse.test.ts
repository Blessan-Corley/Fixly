import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { paginationSchema, parsePagination } from '@/lib/api/parse';

describe('parsePagination()', () => {
  it('returns default page=1 and limit=20 when no params', () => {
    const request = new NextRequest('http://localhost/api/test');
    const result = parsePagination(request);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('parses page and limit from query string', () => {
    const request = new NextRequest('http://localhost/api/test?page=3&limit=10');
    const result = parsePagination(request);

    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('coerces string numbers to integers', () => {
    const request = new NextRequest('http://localhost/api/test?page=2&limit=5');
    const result = parsePagination(request);

    expect(typeof result.page).toBe('number');
    expect(typeof result.limit).toBe('number');
  });

  it('rejects limit above 100', () => {
    expect(() => {
      paginationSchema.parse({ page: '1', limit: '200' });
    }).toThrow();
  });

  it('rejects page less than 1', () => {
    expect(() => {
      paginationSchema.parse({ page: '0', limit: '10' });
    }).toThrow();
  });
});
