/**
 * Redis Caching Middleware
 * Comprehensive caching solution for API responses
 * Uses shared Redis client from lib/redis.js
 */

import { getRedis, redisUtils } from './redis.js';

// Cache configurations for different endpoints
export const CACHE_CONFIGS = {
  // Static/Semi-static data
  '/api/skills': { ttl: 7 * 24 * 60 * 60, version: 'v1' }, // 7 days
  '/api/categories': { ttl: 7 * 24 * 60 * 60, version: 'v1' }, // 7 days
  '/api/location/cities': { ttl: 24 * 60 * 60, version: 'v1' }, // 1 day

  // User data
  '/api/user/profile': { ttl: 15 * 60, version: 'v1', userSpecific: true }, // 15 minutes
  '/api/user/ratings': { ttl: 60 * 60, version: 'v1', userSpecific: true }, // 1 hour
  '/api/user/reviews': { ttl: 30 * 60, version: 'v1', userSpecific: true }, // 30 minutes

  // Job data
  '/api/jobs/browse': { ttl: 5 * 60, version: 'v1' }, // 5 minutes
  '/api/jobs/search': { ttl: 10 * 60, version: 'v1' }, // 10 minutes
  '/api/jobs/[id]': { ttl: 15 * 60, version: 'v1' }, // 15 minutes
  '/api/jobs/applications': { ttl: 2 * 60, version: 'v1', userSpecific: true }, // 2 minutes

  // Statistics and aggregated data
  '/api/stats/dashboard': { ttl: 60 * 60, version: 'v1', userSpecific: true }, // 1 hour
  '/api/stats/public': { ttl: 6 * 60 * 60, version: 'v1' }, // 6 hours

  // Default cache config
  'default': { ttl: 5 * 60, version: 'v1' } // 5 minutes
};

import crypto from 'crypto';

/**
 * Generate cache key for request with cryptographic hashing to prevent collisions
 */
function generateCacheKey(req, config) {
  const pathname = req.url.split('?')[0];
  const query = new URL(req.url, 'http://localhost').searchParams;

  // Create key components
  const keyComponents = {
    version: config.version,
    pathname: pathname,
    userId: config.userSpecific && req.user?.id ? req.user.id : null,
    query: {}
  };

  // Add sorted query parameters
  Array.from(query.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      keyComponents.query[key] = value;
    });

  // Create a deterministic string representation
  const keyString = JSON.stringify(keyComponents);

  // Generate SHA-256 hash to prevent collisions and ensure consistent length
  const hash = crypto.createHash('sha256').update(keyString).digest('hex');

  // Create human-readable prefix with hash suffix
  const prefix = `cache:${config.version}:${pathname.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Limit prefix length and add hash
  const maxPrefixLength = 100;
  const truncatedPrefix = prefix.length > maxPrefixLength
    ? prefix.substring(0, maxPrefixLength)
    : prefix;

  return `${truncatedPrefix}:${hash.substring(0, 16)}`;
}

/**
 * Get cache configuration for endpoint
 */
function getCacheConfig(pathname) {
  // Find exact match first
  if (CACHE_CONFIGS[pathname]) {
    return CACHE_CONFIGS[pathname];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(CACHE_CONFIGS)) {
    if (pattern.includes('[') && pathname.match(pattern.replace(/\[.*?\]/g, '[^/]+'))) {
      return config;
    }
  }

  // Return default config
  return CACHE_CONFIGS.default;
}

/**
 * Main caching middleware
 */
export default function cacheMiddleware(customConfig = {}) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const pathname = req.url.split('?')[0];
      const config = { ...getCacheConfig(pathname), ...customConfig };
      const cacheKey = generateCacheKey(req, config);

      // Try to get from cache
      const cached = await redisUtils.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);

        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('Cache-Control', `max-age=${config.ttl}`);

        return res.status(data.status || 200).json(data.body);
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      const originalStatus = res.status;
      let responseStatus = 200;

      // Override status method
      res.status = function(code) {
        responseStatus = code;
        return originalStatus.call(this, code);
      };

      // Override json method
      res.json = async function(body) {
        // Only cache successful responses
        if (responseStatus >= 200 && responseStatus < 300) {
          try {
            const cacheData = {
              status: responseStatus,
              body: body,
              cachedAt: new Date().toISOString()
            };

            await redisUtils.set(cacheKey, JSON.stringify(cacheData), config.ttl);

            // Add cache headers
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('X-Cache-Key', cacheKey);
            res.setHeader('Cache-Control', `max-age=${config.ttl}`);
          } catch (cacheError) {
            console.error('Cache set error:', cacheError);
          }
        }

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Conditional caching based on request/user context
 */
export function conditionalCache(condition, config) {
  return async (req, res, next) => {
    if (typeof condition === 'function' ? condition(req) : condition) {
      return cacheMiddleware(config)(req, res, next);
    }
    next();
  };
}

/**
 * Cache with custom key generator
 */
export function customKeyCache(keyGenerator, ttl = 300) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cached = await redisUtils.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.status(data.status || 200).json(data.body);
      }

      const originalJson = res.json;
      const originalStatus = res.status;
      let responseStatus = 200;

      res.status = function(code) {
        responseStatus = code;
        return originalStatus.call(this, code);
      };

      res.json = async function(body) {
        if (responseStatus >= 200 && responseStatus < 300) {
          try {
            const cacheData = { status: responseStatus, body, cachedAt: new Date().toISOString() };
            await redisUtils.set(cacheKey, JSON.stringify(cacheData), ttl);
            res.setHeader('X-Cache', 'MISS');
          } catch (error) {
            console.error('Custom cache error:', error);
          }
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Custom key cache error:', error);
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern) {
  try {
    return await redisUtils.invalidatePattern(`cache:*:${pattern}*`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Invalidate user-specific cache
 */
export async function invalidateUserCache(userId, endpoint = null) {
  try {
    const pattern = endpoint
      ? `cache:*:${endpoint}:user:${userId}*`
      : `cache:*:user:${userId}*`;

    return await redisUtils.invalidatePattern(pattern);
  } catch (error) {
    console.error('User cache invalidation error:', error);
    return 0;
  }
}

/**
 * Warm up cache with pre-computed data
 */
export async function warmUpCache(endpoint, data, ttl = 300, keyParams = {}) {
  try {
    const config = getCacheConfig(endpoint);
    let key = `cache:${config.version}:${endpoint}`;

    Object.entries(keyParams).forEach(([k, v]) => {
      key += `:${k}:${v}`;
    });

    const cacheData = {
      status: 200,
      body: data,
      cachedAt: new Date().toISOString()
    };

    await redisUtils.set(key, JSON.stringify(cacheData), ttl);
    return true;
  } catch (error) {
    console.error('Cache warm-up error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const keys = await redisUtils.keys('cache:*');
    const stats = {
      totalKeys: keys.length,
      byEndpoint: {},
      byVersion: {},
      totalSize: 0
    };

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        const version = parts[1];
        const endpoint = parts[2];

        stats.byVersion[version] = (stats.byVersion[version] || 0) + 1;
        stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

/**
 * Cache with tag-based invalidation
 */
export function taggedCache(tags, ttl = 300) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const pathname = req.url.split('?')[0];
      const cacheKey = generateCacheKey(req, { ttl, version: 'v1' });

      // Store tags for this cache entry
      const tagKeys = tags.map(tag => `tag:${tag}`);
      await Promise.all(tagKeys.map(tagKey =>
        redis.sadd(tagKey, cacheKey)
      ));

      // Set expiration for tag keys
      await Promise.all(tagKeys.map(tagKey =>
        redis.expire(tagKey, ttl + 3600) // Tags live longer than cache
      ));

      return cacheMiddleware({ ttl })(req, res, next);
    } catch (error) {
      console.error('Tagged cache error:', error);
      next();
    }
  };
}

/**
 * Invalidate cache by tags
 */
export async function invalidateCacheByTags(tags) {
  try {
    const client = getRedis();
    if (!client) return 0;

    let totalInvalidated = 0;

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const cacheKeys = await client.smembers(tagKey);

      if (cacheKeys && cacheKeys.length > 0) {
        await client.del(...cacheKeys);
        await client.del(tagKey);
        totalInvalidated += cacheKeys.length;
      }
    }

    return totalInvalidated;
  } catch (error) {
    console.error('Tag-based cache invalidation error:', error);
    return 0;
  }
}

/**
 * Bulk cache operations
 */
export async function bulkCacheSet(entries) {
  try {
    // Use Promise.all for bulk operations (Upstash REST doesn't support pipeline)
    await Promise.all(
      entries.map(({ key, value, ttl }) =>
        redisUtils.set(key, JSON.stringify(value), ttl)
      )
    );
    return true;
  } catch (error) {
    console.error('Bulk cache set error:', error);
    return false;
  }
}

/**
 * Memory-efficient cache for large datasets
 */
export function compressedCache(compressionLevel = 'gzip') {
  return async (req, res, next) => {
    // Implementation would use compression library
    // For now, just use regular caching
    return cacheMiddleware()(req, res, next);
  };
}