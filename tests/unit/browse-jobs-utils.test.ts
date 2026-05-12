import { describe, expect, it } from 'vitest';

import {
  isAbortError,
  isRecord,
  normalizeFixerUser,
  normalizeJob,
  toId,
  toNumberSafe,
  toStringSafe,
} from '@/app/dashboard/browse-jobs/browse-jobs.utils';
import type { AppUser } from '@/app/providers';

// ─── isRecord ────────────────────────────────────────────────────────────────

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord(true)).toBe(false);
  });

  it('returns true for arrays (they are objects)', () => {
    expect(isRecord([])).toBe(true);
  });
});

// ─── toStringSafe ─────────────────────────────────────────────────────────────

describe('toStringSafe', () => {
  it('returns a non-empty string as-is', () => {
    expect(toStringSafe('hello')).toBe('hello');
  });

  it('trims whitespace and returns fallback when trimmed is empty', () => {
    expect(toStringSafe('   ', 'fallback')).toBe('fallback');
    expect(toStringSafe('', 'fallback')).toBe('fallback');
  });

  it('converts finite numbers to strings', () => {
    expect(toStringSafe(42)).toBe('42');
    expect(toStringSafe(0)).toBe('0');
  });

  it('returns fallback for Infinity and NaN', () => {
    expect(toStringSafe(Infinity, 'x')).toBe('x');
    expect(toStringSafe(NaN, 'x')).toBe('x');
  });

  it('returns default fallback empty string when none provided', () => {
    expect(toStringSafe(null)).toBe('');
    expect(toStringSafe(undefined)).toBe('');
    expect(toStringSafe({})).toBe('');
  });
});

// ─── toNumberSafe ─────────────────────────────────────────────────────────────

describe('toNumberSafe', () => {
  it('returns numeric values unchanged', () => {
    expect(toNumberSafe(5)).toBe(5);
    expect(toNumberSafe(0)).toBe(0);
    expect(toNumberSafe(-3.14)).toBe(-3.14);
  });

  it('parses numeric strings', () => {
    expect(toNumberSafe('42')).toBe(42);
    expect(toNumberSafe('3.14')).toBe(3.14);
  });

  it('returns fallback for non-numeric values', () => {
    expect(toNumberSafe('abc', 99)).toBe(99);
    expect(toNumberSafe(null, 7)).toBe(7);
    expect(toNumberSafe(undefined, 7)).toBe(7);
    expect(toNumberSafe(Infinity, 1)).toBe(1);
    expect(toNumberSafe(NaN, 1)).toBe(1);
  });

  it('returns default fallback of 0 when none provided', () => {
    expect(toNumberSafe('nope')).toBe(0);
  });
});

// ─── toId ────────────────────────────────────────────────────────────────────

describe('toId', () => {
  it('returns a string as-is', () => {
    expect(toId('abc123')).toBe('abc123');
  });

  it('converts finite numbers to strings', () => {
    expect(toId(5)).toBe('5');
  });

  it('extracts _id from an object', () => {
    expect(toId({ _id: 'oid1' })).toBe('oid1');
  });

  it('falls back to id field if _id missing', () => {
    expect(toId({ id: 'id1' })).toBe('id1');
  });

  it('returns empty string for non-id values', () => {
    expect(toId(null)).toBe('');
    expect(toId(undefined)).toBe('');
    expect(toId({})).toBe('');
    expect(toId({ toString: () => '[object Object]' })).toBe('');
  });
});

// ─── isAbortError ─────────────────────────────────────────────────────────────

describe('isAbortError', () => {
  it('returns true for AbortError', () => {
    const err = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    expect(isAbortError(err)).toBe(true);
  });

  it('returns false for generic errors', () => {
    expect(isAbortError(new Error('fail'))).toBe(false);
    expect(isAbortError('not an error')).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

// ─── normalizeJob ─────────────────────────────────────────────────────────────

describe('normalizeJob', () => {
  const baseJob = {
    _id: 'job1',
    title: 'Fix my tiles',
    description: 'Bathroom tiles need replacing.',
    urgency: 'asap',
    type: 'one-time',
    createdAt: '2026-04-01T10:00:00Z',
    deadline: '2026-04-30T00:00:00Z',
    budget: { type: 'fixed', amount: 5000, materialsIncluded: true },
    location: { lat: 12.93, lng: 77.62, city: 'Bangalore', state: 'Karnataka' },
    skillsRequired: ['tiling', 'grouting'],
    applications: [{ fixer: 'user1', status: 'pending' }],
    views: { count: 42 },
    commentCount: 3,
    applicationCount: 7,
    hasApplied: true,
    hirer: {
      _id: 'hirer1',
      name: 'John Doe',
      username: 'johndoe',
      photoURL: 'https://example.com/photo.jpg',
      rating: 4.5,
      isVerified: true,
      location: { city: 'Bangalore' },
    },
  };

  it('normalizes a complete valid job', () => {
    const result = normalizeJob(baseJob);
    expect(result).not.toBeNull();
    expect(result!._id).toBe('job1');
    expect(result!.title).toBe('Fix my tiles');
    expect(result!.urgency).toBe('asap');
    expect(result!.type).toBe('one-time');
    expect(result!.budget?.type).toBe('fixed');
    expect(result!.budget?.amount).toBe(5000);
    expect(result!.budget?.materialsIncluded).toBe(true);
    expect(result!.location?.city).toBe('Bangalore');
    expect(result!.location?.state).toBe('Karnataka');
    expect(result!.skillsRequired).toEqual(['tiling', 'grouting']);
    expect(result!.applicationCount).toBe(7);
    expect(result!.commentCount).toBe(3);
    expect(result!.hasApplied).toBe(true);
    expect(result!.views?.count).toBe(42);
  });

  it('returns null for non-objects', () => {
    expect(normalizeJob(null)).toBeNull();
    expect(normalizeJob(undefined)).toBeNull();
    expect(normalizeJob('string')).toBeNull();
    expect(normalizeJob(42)).toBeNull();
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = { _id: 'job2' };
    const result = normalizeJob(minimal);
    expect(result).not.toBeNull();
    expect(result!._id).toBe('job2');
    expect(result!.title).toBe('Untitled job');
    expect(result!.description).toBe('');
    expect(result!.skillsRequired).toEqual([]);
    expect(result!.applications).toEqual([]);
    expect(result!.hasApplied).toBe(false);
    expect(result!.hirer).toBeNull();
  });

  it('normalizes hirer from hirer field', () => {
    const result = normalizeJob(baseJob);
    expect(result!.hirer).not.toBeNull();
    expect(result!.hirer!.name).toBe('John Doe');
    expect(result!.hirer!.isVerified).toBe(true);
    expect(result!.hirer!.rating).toBe(4.5);
    expect(result!.hirer!.location?.city).toBe('Bangalore');
  });

  it('falls back to client field for hirer', () => {
    const job = { ...baseJob, hirer: undefined, client: baseJob.hirer };
    const result = normalizeJob(job);
    expect(result!.hirer?.name).toBe('John Doe');
  });

  it('falls back to createdBy field for hirer', () => {
    const job = { ...baseJob, hirer: undefined, client: undefined, createdBy: baseJob.hirer };
    const result = normalizeJob(job);
    expect(result!.hirer?.name).toBe('John Doe');
  });

  it('sets hirer to null when no hirer-like field present', () => {
    const result = normalizeJob({ _id: 'job3' });
    expect(result!.hirer).toBeNull();
  });

  it('sets hirer photoURL from picture field as fallback', () => {
    const job = {
      _id: 'job4',
      hirer: { _id: 'h1', name: 'Jane', picture: 'https://example.com/pic.jpg' },
    };
    const result = normalizeJob(job);
    expect(result!.hirer?.photoURL).toBe('https://example.com/pic.jpg');
  });

  it('skips empty strings from skillsRequired', () => {
    const job = { ...baseJob, skillsRequired: ['tiling', '', '  '] };
    const result = normalizeJob(job);
    expect(result!.skillsRequired).toEqual(['tiling']);
  });

  it('treats non-array skillsRequired as empty array', () => {
    const job = { ...baseJob, skillsRequired: 'tiling' };
    const result = normalizeJob(job);
    expect(result!.skillsRequired).toEqual([]);
  });

  it('normalizes applications correctly', () => {
    const result = normalizeJob(baseJob);
    expect(result!.applications).toHaveLength(1);
    expect(result!.applications![0]).toEqual({ fixer: 'user1', status: 'pending' });
  });

  it('handles hasApplied = false', () => {
    const job = { ...baseJob, hasApplied: false };
    const result = normalizeJob(job);
    expect(result!.hasApplied).toBe(false);
  });

  it('normalizes hirer isVerified correctly when falsy', () => {
    const job = {
      _id: 'job5',
      hirer: { _id: 'h2', name: 'Bob', isVerified: false },
    };
    const result = normalizeJob(job);
    expect(result!.hirer?.isVerified).toBe(false);
  });

  it('normalizes hirer rating as undefined when missing', () => {
    const job = { _id: 'job6', hirer: { _id: 'h3', name: 'Carol' } };
    const result = normalizeJob(job);
    expect(result!.hirer?.rating).toBeUndefined();
  });
});

// ─── normalizeFixerUser ───────────────────────────────────────────────────────

describe('normalizeFixerUser', () => {
  function makeUser(overrides: Record<string, unknown> = {}): AppUser {
    return {
      id: 'user1',
      email: 'test@example.com',
      role: 'fixer',
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 1,
      },
      ...overrides,
    } as unknown as AppUser;
  }

  it('normalizes a full fixer user', () => {
    const result = normalizeFixerUser(makeUser());
    expect(result.role).toBe('fixer');
    expect(result.planType).toBe('free');
    expect(result.planStatus).toBe('active');
    expect(result.creditsUsed).toBe(1);
    expect(result.banned).toBe(false);
  });

  it('handles null user gracefully', () => {
    const result = normalizeFixerUser(null);
    expect(result.role).toBe('');
    expect(result.planType).toBe('');
    expect(result.planStatus).toBe('');
    expect(result.creditsUsed).toBe(0);
    expect(result.banned).toBe(false);
  });

  it('handles banned user', () => {
    const result = normalizeFixerUser(makeUser({ banned: true }));
    expect(result.banned).toBe(true);
  });

  it('handles pro plan with credits used', () => {
    const result = normalizeFixerUser(
      makeUser({ plan: { type: 'pro', status: 'active', creditsUsed: 99 } })
    );
    expect(result.planType).toBe('pro');
    expect(result.creditsUsed).toBe(99);
  });

  it('handles non-object plan field', () => {
    const result = normalizeFixerUser(makeUser({ plan: 'invalid' }));
    expect(result.planType).toBe('');
    expect(result.creditsUsed).toBe(0);
  });
});
