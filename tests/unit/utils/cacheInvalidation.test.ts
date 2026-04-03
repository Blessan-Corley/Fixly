import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock lib/redis before importing the module under test
vi.mock('@/lib/redis', () => ({
  redisUtils: {
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

import { redisUtils } from '@/lib/redis';
import {
  bulkInvalidate,
  clearAllCaches,
  getCacheStatistics,
  invalidateDashboardStats,
  invalidateJobCaches,
  invalidateJobDetails,
  invalidateUserCaches,
  invalidateUserProfile,
} from '@/utils/cacheInvalidation';

const mockDel = vi.mocked(redisUtils.del);
const mockKeys = vi.mocked(redisUtils.keys);

describe('cacheInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalidateDashboardStats', () => {
    it('deletes the correct cache key and returns true', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateDashboardStats('user123', 'hirer');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:hirer:user123');
      expect(result).toBe(true);
    });

    it('constructs cache key with fixer role correctly', async () => {
      mockDel.mockResolvedValue(true);
      await invalidateDashboardStats('fixer99', 'fixer');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:fixer:fixer99');
    });

    it('returns false when redis throws', async () => {
      mockDel.mockRejectedValue(new Error('Redis error'));
      const result = await invalidateDashboardStats('user1', 'hirer');
      expect(result).toBe(false);
    });

    it('handles empty userId and role gracefully', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateDashboardStats('', '');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats::');
      expect(result).toBe(true);
    });
  });

  describe('invalidateUserProfile', () => {
    it('deletes user:profile cache key and returns true', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateUserProfile('johndoe');
      expect(mockDel).toHaveBeenCalledWith('user:profile:johndoe');
      expect(result).toBe(true);
    });

    it('returns false when redis throws', async () => {
      mockDel.mockRejectedValue(new Error('Connection refused'));
      const result = await invalidateUserProfile('johndoe');
      expect(result).toBe(false);
    });

    it('handles special characters in username', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateUserProfile('user-name_123');
      expect(mockDel).toHaveBeenCalledWith('user:profile:user-name_123');
      expect(result).toBe(true);
    });
  });

  describe('invalidateJobDetails', () => {
    it('deletes job:details cache key and returns true', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateJobDetails('job-abc-123');
      expect(mockDel).toHaveBeenCalledWith('job:details:job-abc-123');
      expect(result).toBe(true);
    });

    it('returns false when redis throws', async () => {
      mockDel.mockRejectedValue(new Error('Timeout'));
      const result = await invalidateJobDetails('job-abc-123');
      expect(result).toBe(false);
    });
  });

  describe('invalidateUserCaches', () => {
    it('invalidates both dashboard stats and user profile', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateUserCaches('user1', 'johndoe', 'hirer');
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:hirer:user1');
      expect(mockDel).toHaveBeenCalledWith('user:profile:johndoe');
      expect(mockDel).toHaveBeenCalledTimes(2);
    });

    it('returns false when any invalidation fails', async () => {
      mockDel.mockRejectedValue(new Error('Redis down'));
      const result = await invalidateUserCaches('user1', 'johndoe', 'hirer');
      expect(result).toBe(false);
    });
  });

  describe('invalidateJobCaches', () => {
    it('invalidates job details and hirer dashboard stats', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateJobCaches('job123', 'hirer456');
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('job:details:job123');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:hirer:hirer456');
      expect(mockDel).toHaveBeenCalledTimes(2);
    });

    it('also invalidates fixer dashboard stats when fixerUserId is provided', async () => {
      mockDel.mockResolvedValue(true);
      const result = await invalidateJobCaches('job123', 'hirer456', 'fixer789');
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('job:details:job123');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:hirer:hirer456');
      expect(mockDel).toHaveBeenCalledWith('dashboard:stats:fixer:fixer789');
      expect(mockDel).toHaveBeenCalledTimes(3);
    });

    it('skips fixer stats when fixerUserId is null', async () => {
      mockDel.mockResolvedValue(true);
      await invalidateJobCaches('job123', 'hirer456', null);
      expect(mockDel).toHaveBeenCalledTimes(2);
    });

    it('returns false when redis throws', async () => {
      mockDel.mockRejectedValue(new Error('Error'));
      const result = await invalidateJobCaches('job1', 'hirer1');
      expect(result).toBe(false);
    });
  });

  describe('bulkInvalidate', () => {
    it('deletes all provided keys and returns true', async () => {
      mockDel.mockResolvedValue(true);
      const keys = ['key1', 'key2', 'key3'];
      const result = await bulkInvalidate(keys);
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledTimes(3);
      keys.forEach((key) => expect(mockDel).toHaveBeenCalledWith(key));
    });

    it('handles empty array without calling del', async () => {
      const result = await bulkInvalidate([]);
      expect(result).toBe(true);
      expect(mockDel).not.toHaveBeenCalled();
    });

    it('returns false when any deletion fails', async () => {
      mockDel.mockRejectedValue(new Error('Fail'));
      const result = await bulkInvalidate(['key1']);
      expect(result).toBe(false);
    });
  });

  describe('getCacheStatistics', () => {
    it('returns correct statistics from redis keys', async () => {
      mockKeys.mockResolvedValue([
        'dashboard:stats:hirer:u1',
        'dashboard:stats:fixer:u2',
        'user:profile:john',
        'job:details:j1',
        'job:details:j2',
        'some:other:key',
      ] as never);

      const stats = await getCacheStatistics();
      expect(stats).not.toBeNull();
      expect(stats!.total).toBe(6);
      expect(stats!.byType.dashboard).toBe(2);
      expect(stats!.byType.userProfile).toBe(1);
      expect(stats!.byType.jobDetails).toBe(2);
      expect(stats!.byType.other).toBe(1);
    });

    it('returns zero counts for empty redis', async () => {
      mockKeys.mockResolvedValue([] as never);
      const stats = await getCacheStatistics();
      expect(stats).not.toBeNull();
      expect(stats!.total).toBe(0);
      expect(stats!.byType.other).toBe(0);
    });

    it('returns null when redis throws', async () => {
      mockKeys.mockRejectedValue(new Error('Connection error'));
      const stats = await getCacheStatistics();
      expect(stats).toBeNull();
    });

    it('correctly calculates other as remainder', async () => {
      mockKeys.mockResolvedValue([
        'dashboard:stats:hirer:u1',
        'user:profile:jane',
        'random:key:1',
        'random:key:2',
      ] as never);
      const stats = await getCacheStatistics();
      expect(stats!.byType.other).toBe(2);
      expect(stats!.byType.dashboard + stats!.byType.userProfile + stats!.byType.jobDetails + stats!.byType.other).toBe(stats!.total);
    });
  });

  describe('clearAllCaches', () => {
    it('clears all dashboard, profile, and job keys and returns count', async () => {
      mockKeys
        .mockResolvedValueOnce(['dashboard:stats:hirer:u1', 'dashboard:stats:fixer:u2'] as never)
        .mockResolvedValueOnce(['user:profile:john'] as never)
        .mockResolvedValueOnce(['job:details:j1', 'job:details:j2'] as never);
      mockDel.mockResolvedValue(true);

      const result = await clearAllCaches();
      expect(result.cleared).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('returns cleared 0 and error string when redis throws', async () => {
      mockKeys.mockRejectedValue(new Error('Redis unavailable'));
      const result = await clearAllCaches();
      expect(result.cleared).toBe(0);
      expect(result.error).toBe('Redis unavailable');
    });

    it('returns cleared 0 when no keys exist', async () => {
      mockKeys
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const result = await clearAllCaches();
      expect(result.cleared).toBe(0);
      expect(mockDel).not.toHaveBeenCalled();
    });
  });
});
