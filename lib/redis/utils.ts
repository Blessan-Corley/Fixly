import { logger } from '@/lib/logger';

import {
  DEFAULT_INVALIDATE_BATCH_SIZE,
  DEFAULT_MAX_SCAN_RESULTS,
  DEFAULT_SCAN_COUNT,
} from './constants';
import { ensureRedisConnection, getRedisClient } from './runtime';
import { parseRedisScanResult } from './scan';
import { deserializeRedisValue, serializeRedisValue } from './serialization';

export const redisUtils = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return null;
      }

      const value = await client.get(key);
      return deserializeRedisValue<T>(value) as T | null;
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis get failed');
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<boolean> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        logger.warn({ key }, 'Redis client unavailable for set');
        return false;
      }

      const serializedValue = serializeRedisValue(value);

      if (ttlSeconds > 0) {
        await client.set(key, serializedValue, 'EX', ttlSeconds);
      } else {
        await client.set(key, serializedValue);
      }

      return true;
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis set failed');
      return false;
    }
  },

  async setex(key: string, ttlSeconds: number, value: unknown): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  },

  async del(...keys: string[]): Promise<boolean> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client || keys.length === 0) {
        return false;
      }

      await client.del(...keys);
      return true;
    } catch (error: unknown) {
      logger.error({ error, keys }, 'Redis delete failed');
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return false;
      }

      const result = await client.exists(key);
      return result === 1;
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis exists failed');
      return false;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return [];
      }

      let cursor = '0';
      const collected: string[] = [];

      do {
        const scanResult = await client.scan(cursor, 'MATCH', pattern, 'COUNT', DEFAULT_SCAN_COUNT);
        const parsed = parseRedisScanResult(scanResult);
        cursor = parsed.nextCursor;

        if (parsed.keys.length > 0) {
          collected.push(...parsed.keys);
        }

        if (collected.length >= DEFAULT_MAX_SCAN_RESULTS) {
          logger.warn({ pattern, cap: DEFAULT_MAX_SCAN_RESULTS }, 'Redis keys result capped');
          return collected.slice(0, DEFAULT_MAX_SCAN_RESULTS);
        }
      } while (cursor !== '0');

      return collected;
    } catch (error: unknown) {
      logger.error({ error, pattern }, 'Redis keys scan failed');
      return [];
    }
  },

  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return false;
      }

      let cursor = '0';
      let processedKeys = 0;

      do {
        const scanResult = await client.scan(cursor, 'MATCH', pattern, 'COUNT', DEFAULT_SCAN_COUNT);
        const { nextCursor, keys } = parseRedisScanResult(scanResult);
        cursor = nextCursor;

        if (keys.length > 0) {
          for (let index = 0; index < keys.length; index += DEFAULT_INVALIDATE_BATCH_SIZE) {
            const batch = keys.slice(index, index + DEFAULT_INVALIDATE_BATCH_SIZE);
            if (batch.length > 0) {
              await client.del(...batch);
              processedKeys += batch.length;
            }

            if (processedKeys >= DEFAULT_MAX_SCAN_RESULTS) {
              logger.warn(
                { pattern, cap: DEFAULT_MAX_SCAN_RESULTS },
                'Redis invalidate pattern capped'
              );
              return true;
            }
          }
        }
      } while (cursor !== '0');

      return true;
    } catch (error: unknown) {
      logger.error({ error, pattern }, 'Redis invalidate pattern failed');
      return false;
    }
  },

  async ttl(key: string): Promise<number> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return -1;
      }

      return await client.ttl(key);
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis TTL failed');
      return -1;
    }
  },

  async incr(key: string): Promise<number> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return 0;
      }

      return await client.incr(key);
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis increment failed');
      return 0;
    }
  },

  async decr(key: string): Promise<number> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return 0;
      }

      return await client.decr(key);
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis decrement failed');
      return 0;
    }
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = await ensureRedisConnection(getRedisClient());
      if (!client) {
        return false;
      }

      await client.expire(key, seconds);
      return true;
    } catch (error: unknown) {
      logger.error({ error, key }, 'Redis expire failed');
      return false;
    }
  },
};
