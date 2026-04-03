import Redis from 'ioredis';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import type { RedisClient, RedisRuntimeState } from './types';

const REDIS_RETRY_DISABLE_MS = 30_000;
const REDIS_MAX_RETRY_ATTEMPTS = 3;

declare global {
  // eslint-disable-next-line no-var
  var fixlyRedisClient: RedisClient | undefined;
  // eslint-disable-next-line no-var
  var fixlyRedisState: RedisRuntimeState | undefined;
}

function buildRedisClient(): Redis {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }

  const isTlsRedis = redisUrl.startsWith('rediss://');

  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 10_000,
    ...(isTlsRedis ? { tls: {} } : {}),
    retryStrategy: (attempt: number): number | null => {
      if (attempt > REDIS_MAX_RETRY_ATTEMPTS) {
        return null;
      }

      return Math.min(attempt * 200, 2_000);
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function clearRedisClient(client: RedisClient): void {
  if (!client) {
    return;
  }

  try {
    client.removeAllListeners();
    client.disconnect();
  } catch {
    // Ignore disconnect cleanup errors while failing over.
  }
}

function markRedisUnavailable(error: unknown): void {
  const now = Date.now();
  const message = getErrorMessage(error);
  const shouldLog =
    redisState.lastErrorMessage !== message ||
    now - redisState.lastErrorAt >= REDIS_RETRY_DISABLE_MS;

  if (shouldLog) {
    logger.error(`[Redis] ${message}`);
    logger.warn(
      `[Redis] Disabling Redis-backed features for ${Math.ceil(REDIS_RETRY_DISABLE_MS / 1000)} seconds`
    );
  }

  clearRedisClient(redisState.client);
  redisState.client = null;
  redisState.isHealthy = false;
  redisState.initAttempted = false;
  redisState.disabledUntil = now + REDIS_RETRY_DISABLE_MS;
  redisState.lastErrorMessage = message;
  redisState.lastErrorAt = now;
  globalThis.fixlyRedisClient = null;
}

export const redisState: RedisRuntimeState = globalThis.fixlyRedisState ?? {
  client: globalThis.fixlyRedisClient ?? null,
  isHealthy: true,
  lastHealthCheck: 0,
  initAttempted: false,
  missingConfigLogged: false,
  disabledUntil: 0,
  lastErrorMessage: null,
  lastErrorAt: 0,
  lastUnavailableWarningAt: 0,
};

globalThis.fixlyRedisState = redisState;

export function shouldAllowInMemoryAuthFallback(): boolean {
  return env.NODE_ENV !== 'production' && env.ALLOW_IN_MEMORY_AUTH_FALLBACK === 'true';
}

export function shouldFailClosedForAuth(): boolean {
  return !shouldAllowInMemoryAuthFallback();
}

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

export function isAuthRedisDegraded(): boolean {
  if (!shouldFailClosedForAuth()) {
    return false;
  }

  if (!isRedisConfigured()) {
    return true;
  }

  return redisState.disabledUntil > Date.now();
}

export function getRedisRecoveryRetrySeconds(): number {
  if (redisState.disabledUntil > Date.now()) {
    return Math.max(1, Math.ceil((redisState.disabledUntil - Date.now()) / 1000));
  }

  return 30;
}

export async function ensureRedisConnection(client: RedisClient): Promise<RedisClient> {
  if (!client) {
    return null;
  }

  if (redisState.disabledUntil > Date.now()) {
    return null;
  }

  try {
    if (client.status === 'wait') {
      await client.connect();
    }

    if (client.status === 'end') {
      markRedisUnavailable(new Error('Redis connection ended unexpectedly'));
      return null;
    }

    return client;
  } catch (error: unknown) {
    markRedisUnavailable(error);
    return null;
  }
}

export function initRedisClient(): RedisClient {
  if (redisState.disabledUntil > Date.now()) {
    return null;
  }

  if (redisState.client) {
    return redisState.client;
  }

  if (redisState.initAttempted) {
    return redisState.client;
  }

  redisState.initAttempted = true;

  try {
    if (!env.REDIS_URL) {
      if (!redisState.missingConfigLogged) {
        logger.error('[Redis] REDIS_URL is required');
        logger.error('[Redis] Redis features will be disabled');
        redisState.missingConfigLogged = true;
      }

      redisState.initAttempted = false;
      redisState.isHealthy = false;
      return null;
    }

    const client = buildRedisClient();
    client.on('error', (error: unknown) => {
      markRedisUnavailable(error);
    });

    redisState.client = client;
    redisState.isHealthy = true;
    redisState.missingConfigLogged = false;
    redisState.disabledUntil = 0;
    globalThis.fixlyRedisClient = client;
    return client;
  } catch (error: unknown) {
    markRedisUnavailable(error);
    return null;
  }
}

export function getRedisClient(): RedisClient {
  if (!redisState.client) {
    return initRedisClient();
  }

  return redisState.client;
}
