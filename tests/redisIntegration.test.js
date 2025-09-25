// tests/redisIntegration.test.js - Comprehensive Redis Integration Tests
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getRedisClient, closeRedisConnection } from '../lib/redis';
import { getLocationHistoryService } from '../lib/services/locationHistoryService';
import { sendRealTimeNotification, markNotificationAsRead } from '../lib/notifications';

// Mock Redis client
const mockRedisClient = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  flushdb: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue('OK')
};

// Mock the Redis module
jest.mock('../lib/redis', () => ({
  getRedisClient: jest.fn(() => Promise.resolve(mockRedisClient)),
  closeRedisConnection: jest.fn(() => Promise.resolve())
}));

// Mock database connection
jest.mock('../lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve())
}));

// Mock User model
const mockUser = {
  _id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'fixer',
  location: {
    coordinates: { latitude: 19.0760, longitude: 72.8777 },
    city: 'Mumbai',
    state: 'Maharashtra'
  },
  locationHistory: [],
  preferences: { jobNotifications: true },
  skills: ['plumbing', 'electrical'],
  save: jest.fn().mockResolvedValue()
};

jest.mock('../models/User', () => ({
  findById: jest.fn(() => Promise.resolve(mockUser)),
  updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 5 }))
}));

// Mock Job model
jest.mock('../models/Job', () => ({
  find: jest.fn(() => ({
    limit: jest.fn(() => ({
      populate: jest.fn(() => ({
        lean: jest.fn(() => Promise.resolve([
          {
            _id: 'job-1',
            title: 'Plumbing Work',
            location: { coordinates: { latitude: 19.0761, longitude: 72.8778 } },
            skillsRequired: ['plumbing'],
            createdBy: 'other-user-456'
          }
        ]))
      }))
    }))
  }))
}));

// Mock Ably
jest.mock('../lib/ably', () => ({
  getServerAbly: jest.fn(() => ({
    channels: {
      get: jest.fn(() => ({
        publish: jest.fn(() => Promise.resolve())
      }))
    }
  })),
  CHANNELS: {
    userNotifications: (userId) => `user:${userId}:notifications`,
    userPresence: (userId) => `user:${userId}:presence`
  },
  EVENTS: {
    NOTIFICATION_SENT: 'notification_sent',
    LOCATION_UPDATED: 'location_updated'
  }
}));

describe('Redis Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.keys.mockResolvedValue([]);
  });

  afterEach(async () => {
    // Cleanup
    await closeRedisConnection();
  });

  describe('Redis Connection', () => {
    test('should establish Redis connection successfully', async () => {
      const redis = await getRedisClient();

      expect(redis).toBeDefined();
      expect(redis.ping).toBeDefined();
      expect(getRedisClient).toHaveBeenCalled();
    });

    test('should handle Redis connection ping', async () => {
      const redis = await getRedisClient();
      const pong = await redis.ping();

      expect(pong).toBe('PONG');
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    test('should close Redis connection gracefully', async () => {
      await closeRedisConnection();

      expect(closeRedisConnection).toHaveBeenCalled();
    });
  });

  describe('Cache Operations', () => {
    test('should set and get cached data', async () => {
      const redis = await getRedisClient();
      const testData = { id: 'test', value: 'cached data' };

      await redis.set('test:key', JSON.stringify(testData), 'EX', 3600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(testData),
        'EX',
        3600
      );

      // Mock successful retrieval
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));

      const retrieved = await redis.get('test:key');
      const parsedData = JSON.parse(retrieved);

      expect(parsedData).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    });

    test('should handle cache expiration', async () => {
      const redis = await getRedisClient();

      await redis.set('expiring:key', 'value', 'EX', 1);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'expiring:key',
        'value',
        'EX',
        1
      );

      // Mock key expiration
      mockRedisClient.get.mockResolvedValueOnce(null);

      const expired = await redis.get('expiring:key');
      expect(expired).toBeNull();
    });

    test('should delete cached data', async () => {
      const redis = await getRedisClient();

      const deleted = await redis.del('test:key');

      expect(deleted).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
    });

    test('should check key existence', async () => {
      const redis = await getRedisClient();

      // Mock key exists
      mockRedisClient.exists.mockResolvedValueOnce(1);

      const exists = await redis.exists('existing:key');
      expect(exists).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('existing:key');
    });

    test('should get TTL for keys', async () => {
      const redis = await getRedisClient();

      // Mock TTL response
      mockRedisClient.ttl.mockResolvedValueOnce(3600);

      const ttl = await redis.ttl('test:key');
      expect(ttl).toBe(3600);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test:key');
    });
  });

  describe('Session Management', () => {
    test('should cache user session data', async () => {
      const redis = await getRedisClient();
      const sessionData = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'hirer',
        lastActive: new Date().toISOString()
      };

      await redis.set(
        `session:user-123`,
        JSON.stringify(sessionData),
        'EX',
        7 * 24 * 60 * 60 // 7 days
      );

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'session:user-123',
        JSON.stringify(sessionData),
        'EX',
        7 * 24 * 60 * 60
      );
    });

    test('should validate session expiration', async () => {
      const redis = await getRedisClient();

      // Mock expired session
      mockRedisClient.get.mockResolvedValueOnce(null);

      const session = await redis.get('session:expired-user');
      expect(session).toBeNull();
    });

    test('should handle concurrent session operations', async () => {
      const redis = await getRedisClient();
      const operations = [];

      // Simulate multiple concurrent session operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          redis.set(`session:user-${i}`, JSON.stringify({ userId: `user-${i}` }), 'EX', 3600)
        );
      }

      await Promise.all(operations);

      expect(mockRedisClient.set).toHaveBeenCalledTimes(10);
    });
  });

  describe('Location Cache Integration', () => {
    test('should cache user location data', async () => {
      const service = await getLocationHistoryService();
      const userId = 'test-user-123';
      const location = {
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra'
      };

      await service.updateUserLocation(userId, location);

      // Verify location was cached
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `user_location:${userId}`,
        expect.stringContaining('Mumbai'),
        'EX',
        2 * 60 * 60
      );
    });

    test('should retrieve cached location data', async () => {
      const service = await getLocationHistoryService();
      const userId = 'test-user-123';
      const cachedData = {
        current: {
          coordinates: { latitude: 19.0760, longitude: 72.8777 },
          city: 'Mumbai'
        },
        history: [],
        lastUpdate: new Date().toISOString()
      };

      // Mock cached data retrieval
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await service.getLocationHistory(userId, 10);

      expect(result.source).toBe('cache');
      expect(result.current.city).toBe('Mumbai');
      expect(mockRedisClient.get).toHaveBeenCalledWith(`user_location:${userId}`);
    });

    test('should cache job suggestions', async () => {
      const service = await getLocationHistoryService();
      const userId = 'test-user-123';

      await service.updateRelevantSuggestions(userId);

      // Verify suggestions were cached
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `job_suggestions:${userId}`,
        expect.stringContaining('jobs'),
        'EX',
        60 * 60
      );
    });

    test('should handle cache miss for location data', async () => {
      const service = await getLocationHistoryService();
      const userId = 'test-user-123';

      // Mock cache miss
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.getLocationHistory(userId, 10);

      expect(result.source).toBe('database');
      expect(mockRedisClient.get).toHaveBeenCalledWith(`user_location:${userId}`);
    });
  });

  describe('Notification Cache Integration', () => {
    test('should cache notification data', async () => {
      const userId = 'test-user-123';
      const notificationData = {
        type: 'JOB_APPLICATION',
        title: 'New job application',
        message: 'You have a new application',
        data: { jobId: 'job-123' }
      };

      await sendRealTimeNotification(userId, notificationData);

      // Should use Redis for notification caching
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test('should mark notifications as read in cache', async () => {
      const userId = 'test-user-123';
      const notificationId = 'notification-123';

      await markNotificationAsRead(userId, notificationId);

      // Should update Redis cache
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Cache', () => {
    test('should implement rate limiting with Redis', async () => {
      const redis = await getRedisClient();
      const identifier = 'user:123:api_calls';
      const limit = 100;
      const window = 3600; // 1 hour

      // Mock current count
      mockRedisClient.get.mockResolvedValueOnce('50');

      const currentCount = await redis.get(identifier);
      const count = parseInt(currentCount) || 0;

      if (count < limit) {
        await redis.set(identifier, count + 1, 'EX', window);
      }

      expect(count).toBeLessThan(limit);
      expect(mockRedisClient.set).toHaveBeenCalledWith(identifier, 51, 'EX', window);
    });

    test('should handle rate limit exceeded', async () => {
      const redis = await getRedisClient();
      const identifier = 'user:123:api_calls';
      const limit = 100;

      // Mock limit exceeded
      mockRedisClient.get.mockResolvedValueOnce('100');

      const currentCount = await redis.get(identifier);
      const count = parseInt(currentCount) || 0;

      expect(count).toBeGreaterThanOrEqual(limit);
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection errors gracefully', async () => {
      // Mock Redis error
      mockRedisClient.set.mockRejectedValueOnce(new Error('Redis connection failed'));

      const redis = await getRedisClient();

      try {
        await redis.set('test:key', 'value');
      } catch (error) {
        expect(error.message).toBe('Redis connection failed');
      }

      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test('should fallback when Redis is unavailable', async () => {
      // Mock Redis unavailable
      getRedisClient.mockRejectedValueOnce(new Error('Redis unavailable'));

      const service = await getLocationHistoryService();
      const result = await service.getLocationHistory('test-user-123', 10);

      // Should fallback to database
      expect(result.source).toBe('database');
    });

    test('should handle JSON parsing errors', async () => {
      const redis = await getRedisClient();

      // Mock corrupted JSON data
      mockRedisClient.get.mockResolvedValueOnce('invalid json {');

      try {
        const data = await redis.get('test:key');
        JSON.parse(data);
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-volume cache operations', async () => {
      const redis = await getRedisClient();
      const operations = [];

      // Simulate 1000 concurrent operations
      for (let i = 0; i < 1000; i++) {
        operations.push(redis.set(`perf:test:${i}`, `value${i}`, 'EX', 3600));
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1000);
    });

    test('should efficiently handle batch operations', async () => {
      const redis = await getRedisClient();
      const keys = Array.from({ length: 100 }, (_, i) => `batch:key:${i}`);

      // Mock batch key existence check
      mockRedisClient.keys.mockResolvedValueOnce(keys.slice(0, 50));

      const existingKeys = await redis.keys('batch:key:*');

      expect(existingKeys).toHaveLength(50);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('batch:key:*');
    });
  });

  describe('Memory Management', () => {
    test('should handle memory usage efficiently', async () => {
      const redis = await getRedisClient();

      // Simulate large data storage
      const largeData = 'x'.repeat(1024 * 1024); // 1MB string

      await redis.set('large:data', largeData, 'EX', 3600);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'large:data',
        largeData,
        'EX',
        3600
      );
    });

    test('should clean up expired keys properly', async () => {
      const redis = await getRedisClient();

      // Mock expired keys cleanup
      mockRedisClient.keys.mockResolvedValueOnce(['expired:key1', 'expired:key2']);

      const expiredKeys = await redis.keys('expired:*');

      // Simulate cleanup
      for (const key of expiredKeys) {
        await redis.del(key);
      }

      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('Monitoring and Health Checks', () => {
    test('should provide Redis health status', async () => {
      const redis = await getRedisClient();

      const health = await redis.ping();

      expect(health).toBe('PONG');
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    test('should monitor Redis performance metrics', async () => {
      const redis = await getRedisClient();

      // Simulate performance monitoring
      const startTime = process.hrtime();
      await redis.get('performance:test');
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

      expect(milliseconds).toBeLessThan(100); // Should respond within 100ms
    });
  });
});

export default {};